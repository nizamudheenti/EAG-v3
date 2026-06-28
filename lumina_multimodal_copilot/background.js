// Lumina AI - Background Service Worker

// 1. Context Menus setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explainSelection",
    title: "Lumina AI: Explain selection",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "quizSelection",
    title: "Lumina AI: Generate quiz from selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const actions = {
    explainSelection: { type: "EXPLAIN_SELECTION", text: info.selectionText },
    quizSelection: { type: "GENERATE_QUIZ", text: info.selectionText }
  };
  const action = actions[info.menuItemId];
  if (action && tab) {
    chrome.tabs.sendMessage(tab.id, { action: "OPEN_SIDEBAR", ...action });
  }
});

// 2. Commands setup (Hotkeys)
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-sidebar" && tab) {
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" });
  }
});

// 3. Message Listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true; // asynchronous response
  }

  if (message.action === "CALL_GEMINI") {
    callGemini(message)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "CALL_GEMINI_STREAM") {
    callGeminiStream(message, sender.tab.id);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "OPEN_SIDEBAR_FROM_POPUP") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "OPEN_SIDEBAR", type: message.type });
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

// 4. Gemini API calling helpers
function buildContents(prompt, history = [], image = null) {
  const parts = [];
  if (image && image.data) {
    // Strip metadata header if present
    const base64Data = image.data.includes(",") ? image.data.split(",")[1] : image.data;
    parts.push({
      inlineData: {
        mimeType: image.mimeType || "image/png",
        data: base64Data
      }
    });
  }
  parts.push({ text: prompt });

  return [
    ...history,
    { role: "user", parts: parts }
  ];
}

async function callGemini({ apiKey, model = "gemini-2.5-flash", prompt, history = [], image = null, systemInstruction = "" }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const contents = buildContents(prompt, history, image);

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API call failed");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

async function callGeminiStream({ apiKey, model = "gemini-2.5-flash", prompt, history = [], image = null, systemInstruction = "", messageId }, tabId) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const contents = buildContents(prompt, history, image);

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      chrome.tabs.sendMessage(tabId, {
        action: "STREAM_ERROR",
        messageId,
        error: err.error?.message || "API call failed"
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              chrome.tabs.sendMessage(tabId, {
                action: "STREAM_CHUNK",
                messageId,
                chunk: text
              });
            }
          } catch (_) {}
        }
      }
    }

    chrome.tabs.sendMessage(tabId, { action: "STREAM_DONE", messageId });
  } catch (err) {
    chrome.tabs.sendMessage(tabId, {
      action: "STREAM_ERROR",
      messageId,
      error: err.message
    });
  }
}
