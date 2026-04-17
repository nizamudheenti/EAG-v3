const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askGemini",
    title: "Ask Gemini about this",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "explainGemini",
    title: "Explain with Gemini",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Summarize this page",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const actions = {
    askGemini: { type: "ASK_SELECTION", text: info.selectionText },
    explainGemini: { type: "EXPLAIN_SELECTION", text: info.selectionText },
    summarizePage: { type: "SUMMARIZE_PAGE" }
  };
  const action = actions[info.menuItemId];
  if (action) {
    chrome.tabs.sendMessage(tab.id, { action: "OPEN_PANEL", ...action });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-panel") {
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_PANEL" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CALL_GEMINI") {
    callGemini(message.apiKey, message.prompt, message.history)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message.action === "CALL_GEMINI_STREAM") {
    callGeminiStream(message.apiKey, message.prompt, message.history, sender.tab.id, message.messageId);
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "OPEN_PANEL_FROM_POPUP") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "OPEN_PANEL", type: message.type });
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

async function callGemini(apiKey, prompt, history = []) {
  const contents = [
    ...history,
    { role: "user", parts: [{ text: prompt }] }
  ];

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      },
      systemInstruction: {
        parts: [{
          text: "You are GeminiPage, an intelligent web assistant powered by Google Gemini Flash 2.0. You help users understand, analyze, and interact with web content. Be concise, insightful, and helpful. Use markdown formatting when appropriate."
        }]
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API call failed");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

async function callGeminiStream(apiKey, prompt, history = [], tabId, messageId) {
  const contents = [
    ...history,
    { role: "user", parts: [{ text: prompt }] }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          },
          systemInstruction: {
            parts: [{
              text: "You are GeminiPage, an intelligent web assistant powered by Google Gemini Flash 2.0. You help users understand, analyze, and interact with web content. Be concise, insightful, and helpful. Use markdown formatting when appropriate."
            }]
          }
        })
      }
    );

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
