/* GeminiPage Content Script */

let panelOpen = false;
let conversationHistory = [];
let currentStreamId = null;
let streamBuffer = "";
let pageContent = "";
let apiKey = "";
let isStreaming = false;

function extractPageContent() {
  const article = document.querySelector("article, main, [role='main']");
  const body = article || document.body;
  const cloned = body.cloneNode(true);

  ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe",
   ".ads", ".advertisement", "#sidebar"].forEach(sel => {
    cloned.querySelectorAll(sel).forEach(el => el.remove());
  });

  const text = cloned.innerText || cloned.textContent;
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}

function getPageMeta() {
  return {
    title: document.title,
    url: location.href,
    description: document.querySelector('meta[name="description"]')?.content || ""
  };
}

async function loadApiKey() {
  return new Promise(resolve => {
    chrome.storage.sync.get("geminiApiKey", data => resolve(data.geminiApiKey || ""));
  });
}

// ─── Panel HTML ────────────────────────────────────────────────────────────────

function buildPanel() {
  const host = document.createElement("div");
  host.id = "gemini-panel-host";

  host.innerHTML = `
    <div id="gemini-resize-handle"></div>
    <div id="gemini-panel">
      <div id="gemini-header">
        <div id="gemini-header-left">
          <div id="gemini-logo">✦</div>
          <div>
            <div id="gemini-title">GeminiPage</div>
            <div id="gemini-subtitle">Powered by Gemini Flash 2.0</div>
          </div>
        </div>
        <div id="gemini-header-right">
          <button class="gemini-icon-btn" id="gemini-clear-btn" title="Clear chat">⟳</button>
          <button class="gemini-icon-btn" id="gemini-settings-btn" title="Settings">⚙</button>
          <button class="gemini-icon-btn" id="gemini-close-btn" title="Close">✕</button>
        </div>
      </div>

      <div id="gemini-status">
        <div class="gemini-status-dot"></div>
        <span id="gemini-status-text">Ready</span>
      </div>

      <div id="gemini-quick-actions">
        <button class="gemini-quick-btn" data-action="summarize">📄 Summarize</button>
        <button class="gemini-quick-btn" data-action="keypoints">🎯 Key Points</button>
        <button class="gemini-quick-btn" data-action="simplify">✨ Simplify</button>
        <button class="gemini-quick-btn" data-action="critique">🔍 Critique</button>
        <button class="gemini-quick-btn" data-action="questions">❓ Quiz Me</button>
      </div>

      <div id="gemini-messages">
        <div id="gemini-welcome">
          <div id="gemini-welcome-icon">✦</div>
          <h2>AI Web Intelligence</h2>
          <p>I can analyze this page and answer any questions you have. Try a quick action or ask me anything!</p>
          <div class="gemini-welcome-chips">
            <div class="gemini-chip" data-prompt="What is the main topic of this page?">What's this about?</div>
            <div class="gemini-chip" data-prompt="List the most important facts from this page.">Key facts</div>
            <div class="gemini-chip" data-prompt="Is there anything surprising or unusual on this page?">Surprising info</div>
            <div class="gemini-chip" data-prompt="What are the main takeaways from this content?">Takeaways</div>
          </div>
        </div>
      </div>

      <div id="gemini-input-area">
        <div id="gemini-input-wrapper">
          <textarea id="gemini-input" placeholder="Ask anything about this page..." rows="1"></textarea>
          <button id="gemini-send-btn">➤</button>
        </div>
        <div id="gemini-input-hint">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  `;

  return host;
}

function buildSetupPanel() {
  const host = document.createElement("div");
  host.id = "gemini-panel-host";

  host.innerHTML = `
    <div id="gemini-panel">
      <div id="gemini-header">
        <div id="gemini-header-left">
          <div id="gemini-logo">✦</div>
          <div>
            <div id="gemini-title">GeminiPage Setup</div>
            <div id="gemini-subtitle">One-time configuration</div>
          </div>
        </div>
        <div id="gemini-header-right">
          <button class="gemini-icon-btn" id="gemini-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div id="gemini-setup">
        <div id="gemini-welcome-icon" style="width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto;">✦</div>
        <h3>Connect Gemini Flash 2.0</h3>
        <p>Enter your Google AI API key to get started. Get one free at
          <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>
        </p>
        <input class="gemini-setup-input" id="gemini-api-input" type="password" placeholder="AIza..." autocomplete="off" />
        <div class="gemini-error" id="gemini-setup-error"></div>
        <button class="gemini-setup-btn" id="gemini-save-key-btn">Save & Start Using GeminiPage →</button>
      </div>
    </div>
  `;

  return host;
}

// ─── Toggle button ─────────────────────────────────────────────────────────────

function createToggleButton() {
  const btn = document.createElement("button");
  btn.id = "gemini-toggle-btn";
  btn.title = "Open GeminiPage (Ctrl+Shift+G)";
  btn.innerHTML = "✦";
  btn.style.cssText = `
    position:fixed;right:0;top:50%;transform:translateY(-50%);
    z-index:2147483646;background:linear-gradient(135deg,#6366f1,#8b5cf6);
    border:none;color:white;width:40px;height:80px;border-radius:12px 0 0 12px;
    cursor:pointer;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:6px;box-shadow:-4px 0 20px rgba(99,102,241,0.4);
    transition:all 0.2s;font-size:18px;font-family:inherit;
  `;
  btn.addEventListener("click", togglePanel);
  return btn;
}

// ─── Core panel logic ──────────────────────────────────────────────────────────

async function initPanel() {
  apiKey = await loadApiKey();

  if (document.getElementById("gemini-panel-host")) return;

  const toggleBtn = createToggleButton();
  document.body.appendChild(toggleBtn);

  const host = apiKey ? buildPanel() : buildSetupPanel();
  document.body.appendChild(host);

  bindEvents(host, apiKey);
}

function bindEvents(host, hasKey) {
  host.querySelector("#gemini-close-btn").addEventListener("click", closePanel);

  if (!hasKey) {
    const saveBtn = host.querySelector("#gemini-save-key-btn");
    const input = host.querySelector("#gemini-api-input");
    const error = host.querySelector("#gemini-setup-error");

    saveBtn.addEventListener("click", async () => {
      const key = input.value.trim();
      if (!key || !key.startsWith("AIza")) {
        error.textContent = "Please enter a valid API key starting with 'AIza'";
        error.style.display = "block";
        return;
      }
      await chrome.storage.sync.set({ geminiApiKey: key });
      host.remove();
      document.getElementById("gemini-panel-host")?.remove();
      apiKey = key;
      const newHost = buildPanel();
      document.body.appendChild(newHost);
      bindEvents(newHost, true);
      openPanel();
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") saveBtn.click();
    });
    return;
  }

  // Quick actions
  host.querySelectorAll(".gemini-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const prompts = {
        summarize: "Please provide a comprehensive summary of this webpage in 3-5 sentences.",
        keypoints: "Extract and list the 5-7 most important key points from this page as bullet points.",
        simplify: "Explain the main content of this page in simple terms, as if explaining to a 10-year-old.",
        critique: "Analyze this page critically. What are its strengths, weaknesses, and any potential biases or missing information?",
        questions: "Based on this page's content, create 5 thought-provoking quiz questions with answers to test understanding."
      };
      sendMessage(prompts[btn.dataset.action]);
    });
  });

  // Welcome chips
  host.querySelectorAll(".gemini-chip").forEach(chip => {
    chip.addEventListener("click", () => sendMessage(chip.dataset.prompt));
  });

  // Send button
  const input = host.querySelector("#gemini-input");
  const sendBtn = host.querySelector("#gemini-send-btn");

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (text && !isStreaming) sendMessage(text);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text && !isStreaming) sendMessage(text);
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "22px";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // Clear
  host.querySelector("#gemini-clear-btn").addEventListener("click", clearChat);

  // Settings
  host.querySelector("#gemini-settings-btn")?.addEventListener("click", async () => {
    const newKey = prompt("Enter new Gemini API key:", "");
    if (newKey?.trim()) {
      await chrome.storage.sync.set({ geminiApiKey: newKey.trim() });
      apiKey = newKey.trim();
      setStatus("API key updated ✓");
    }
  });

  // Resize handle
  const resizeHandle = host.querySelector("#gemini-resize-handle");
  if (resizeHandle) {
    let startX, startWidth;
    resizeHandle.addEventListener("mousedown", e => {
      startX = e.clientX;
      startWidth = parseInt(getComputedStyle(host).width);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    });

    function onMouseMove(e) {
      const newWidth = Math.max(320, Math.min(800, startWidth - (e.clientX - startX)));
      host.style.width = newWidth + "px";
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }
}

function openPanel() {
  panelOpen = true;
  const host = document.getElementById("gemini-panel-host");
  const toggleBtn = document.getElementById("gemini-toggle-btn");
  if (host) host.classList.add("open");
  if (toggleBtn) toggleBtn.style.display = "none";
}

function closePanel() {
  panelOpen = false;
  const host = document.getElementById("gemini-panel-host");
  const toggleBtn = document.getElementById("gemini-toggle-btn");
  if (host) host.classList.remove("open");
  if (toggleBtn) toggleBtn.style.display = "";
}

function togglePanel() {
  if (panelOpen) closePanel();
  else openPanel();
}

function setStatus(text) {
  const el = document.getElementById("gemini-status-text");
  if (el) el.textContent = text;
}

function clearChat() {
  conversationHistory = [];
  const messages = document.getElementById("gemini-messages");
  if (messages) {
    messages.innerHTML = `
      <div id="gemini-welcome">
        <div id="gemini-welcome-icon">✦</div>
        <h2>Chat cleared</h2>
        <p>Start a new conversation or use the quick actions above.</p>
      </div>`;
  }
  setStatus("Ready");
}

// ─── Messaging ─────────────────────────────────────────────────────────────────

function addUserMessage(text) {
  const welcome = document.getElementById("gemini-welcome");
  if (welcome) welcome.remove();

  const messages = document.getElementById("gemini-messages");
  if (!messages) return;

  const div = document.createElement("div");
  div.className = "gemini-message user";
  div.innerHTML = `
    <div class="gemini-msg-label">You</div>
    <div class="gemini-msg-bubble">${escapeHtml(text)}</div>
  `;
  messages.appendChild(div);
  scrollToBottom();
}

function addAssistantTyping() {
  const messages = document.getElementById("gemini-messages");
  if (!messages) return null;

  const id = "gemini-typing-" + Date.now();
  const div = document.createElement("div");
  div.className = "gemini-message assistant";
  div.id = id;
  div.innerHTML = `
    <div class="gemini-msg-label">GeminiPage</div>
    <div class="gemini-msg-bubble">
      <div class="gemini-typing"><span></span><span></span><span></span></div>
    </div>
  `;
  messages.appendChild(div);
  scrollToBottom();
  return id;
}

function updateAssistantMessage(id, text, done = false) {
  const div = document.getElementById(id);
  if (!div) return;

  const bubble = div.querySelector(".gemini-msg-bubble");
  if (bubble) {
    bubble.innerHTML = renderMarkdown(text);
    if (done) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "gemini-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
      });
      div.appendChild(copyBtn);
    }
  }
  scrollToBottom();
}

function scrollToBottom() {
  const messages = document.getElementById("gemini-messages");
  if (messages) messages.scrollTop = messages.scrollHeight;
}

// ─── Send a message ────────────────────────────────────────────────────────────

async function sendMessage(text) {
  if (!text || isStreaming) return;

  const input = document.getElementById("gemini-input");
  const sendBtn = document.getElementById("gemini-send-btn");
  if (input) input.value = "";
  if (sendBtn) sendBtn.disabled = true;
  isStreaming = true;
  setStatus("Thinking...");

  addUserMessage(text);

  if (!pageContent) {
    pageContent = extractPageContent();
  }
  const meta = getPageMeta();

  const systemContext = `You are analyzing the following webpage:
Title: ${meta.title}
URL: ${meta.url}
${meta.description ? `Description: ${meta.description}` : ""}

Page Content:
${pageContent}

---
Answer questions about this page concisely and helpfully. Use markdown formatting for better readability.`;

  const fullPrompt = conversationHistory.length === 0
    ? `${systemContext}\n\nUser Question: ${text}`
    : text;

  const msgId = addAssistantTyping();
  streamBuffer = "";
  currentStreamId = msgId;

  chrome.runtime.sendMessage({
    action: "CALL_GEMINI_STREAM",
    apiKey,
    prompt: fullPrompt,
    history: conversationHistory,
    messageId: msgId
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "STREAM_CHUNK" && message.messageId === currentStreamId) {
    streamBuffer += message.chunk;
    updateAssistantMessage(currentStreamId, streamBuffer, false);
  }

  if (message.action === "STREAM_DONE" && message.messageId === currentStreamId) {
    updateAssistantMessage(currentStreamId, streamBuffer, true);

    const lastUserMsg = document.querySelectorAll(".gemini-message.user");
    const lastText = lastUserMsg[lastUserMsg.length - 1]?.querySelector(".gemini-msg-bubble")?.textContent || "";

    conversationHistory.push({ role: "user", parts: [{ text: lastText }] });
    conversationHistory.push({ role: "model", parts: [{ text: streamBuffer }] });

    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    isStreaming = false;
    currentStreamId = null;
    streamBuffer = "";
    setStatus("Ready");

    const sendBtn = document.getElementById("gemini-send-btn");
    if (sendBtn) sendBtn.disabled = false;
  }

  if (message.action === "STREAM_ERROR" && message.messageId === currentStreamId) {
    updateAssistantMessage(currentStreamId, `⚠️ Error: ${message.error}`, true);
    isStreaming = false;
    currentStreamId = null;
    const sendBtn = document.getElementById("gemini-send-btn");
    if (sendBtn) sendBtn.disabled = false;
    setStatus("Error occurred");
  }

  if (message.action === "TOGGLE_PANEL") {
    if (!document.getElementById("gemini-panel-host")) initPanel();
    else togglePanel();
  }

  if (message.action === "OPEN_PANEL") {
    if (!document.getElementById("gemini-panel-host")) {
      initPanel().then(() => {
        openPanel();
        if (message.type === "ASK_SELECTION" && message.text) {
          setTimeout(() => sendMessage(`About this selected text: "${message.text.slice(0, 500)}" — please explain or elaborate on this.`), 500);
        } else if (message.type === "EXPLAIN_SELECTION" && message.text) {
          setTimeout(() => sendMessage(`Explain this in simple terms: "${message.text.slice(0, 500)}"`), 500);
        } else if (message.type === "SUMMARIZE_PAGE") {
          setTimeout(() => sendMessage("Please provide a comprehensive summary of this webpage."), 500);
        }
      });
    } else {
      openPanel();
      if (message.type === "ASK_SELECTION" && message.text) {
        setTimeout(() => sendMessage(`About this selected text: "${message.text.slice(0, 500)}" — please explain or elaborate on this.`), 300);
      }
    }
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\* (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hou]|<li|<pre|<blockquote)(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

// Auto-init: panel is created lazily on first toggle/message
