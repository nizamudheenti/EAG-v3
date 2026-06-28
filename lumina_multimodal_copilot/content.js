// Lumina AI - Content Script (Scoped inside Shadow DOM)

(function () {
  // Prevent duplicate script execution
  if (window.LuminaAICopilotInjected) return;
  window.LuminaAICopilotInjected = true;

  // 1. Core State
  let sidebarOpen = false;
  let activeTab = "chat"; // chat, highlights, quizzes
  let currentImage = null; // { data: 'base64...', mimeType: 'image/png' }
  let activeStreamMessageId = null;
  let chatHistory = []; // [{role: 'user'|'model', parts: [{text: '...'}]}]
  let highlights = [];
  let quizzes = [];
  let quizScore = { correct: 0, total: 0 };
  let currentQuiz = null; // active quiz JSON object

  // 2. DOM references (held inside Shadow DOM)
  let shadowRoot = null;
  let sidebarEl = null;
  let chatHistoryEl = null;
  let textareaEl = null;
  let sendBtnEl = null;
  let cropBtnEl = null;
  let previewContainerEl = null;
  let previewImgEl = null;
  let floatingPillEl = null;
  let highlightsListEl = null;
  let quizCardContainerEl = null;
  let scoreValEl = null;

  // 3. Initialize Shadow DOM
  function init() {
    const host = document.createElement("div");
    host.id = "lumina-copilot-host";
    document.body.appendChild(host);

    shadowRoot = host.attachShadow({ mode: "open" });

    // Load Scoped CSS
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = chrome.runtime.getURL("sidebar.css");
    shadowRoot.appendChild(styleLink);

    // Create Sidebar Element
    sidebarEl = document.createElement("div");
    sidebarEl.className = "lumina-sidebar-root";
    sidebarEl.innerHTML = `
      <!-- Header -->
      <div class="lumina-header">
        <div class="lumina-brand">
          <div class="lumina-logo">✦</div>
          <div class="lumina-title-container">
            <span class="lumina-title">Lumina AI</span>
            <span class="lumina-subtitle">Multimodal Web Companion</span>
          </div>
        </div>
        <button class="lumina-close-btn" id="close-sidebar-btn">&times;</button>
      </div>

      <!-- Tabs -->
      <div class="lumina-tabs">
        <button class="lumina-tab active" data-tab="chat">💬 Chat</button>
        <button class="lumina-tab" data-tab="highlights">💾 Highlights</button>
        <button class="lumina-tab" data-tab="quizzes">🧠 Quizzes</button>
      </div>

      <!-- Chat Panel -->
      <div class="lumina-panel active" id="panel-chat">
        <div class="lumina-chat-history" id="chat-history">
          <div class="lumina-message assistant">
            Hi! I am Lumina AI, powered by Google Gemini. Highlight text to query me or create quizzes, use the screenshot tool (📷) below to crop anything on screen, or type a question!
          </div>
        </div>

        <div class="lumina-chat-input-area">
          <div class="lumina-image-preview-container" id="image-preview-container">
            <img class="lumina-image-preview" id="image-preview-img" src="" />
            <button class="lumina-remove-image-btn" id="remove-image-btn">&times;</button>
          </div>
          <textarea class="lumina-chat-textarea" id="chat-textarea" placeholder="Type a message or crop screen..." rows="1"></textarea>
          
          <div class="lumina-input-controls">
            <div class="lumina-utility-btns">
              <button class="lumina-icon-btn" id="crop-btn" title="Crop Screen">📷</button>
              <button class="lumina-icon-btn" id="clear-chat-btn" title="Clear Chat">🧹</button>
            </div>
            <button class="lumina-send-btn" id="send-btn">Send ✦</button>
          </div>
        </div>
      </div>

      <!-- Highlights Panel -->
      <div class="lumina-panel" id="panel-highlights">
        <div class="lumina-highlights-list" id="highlights-list"></div>
      </div>

      <!-- Quizzes Panel -->
      <div class="lumina-panel" id="panel-quizzes">
        <div class="lumina-quiz-pane">
          <div class="lumina-score-card">
            <span class="lumina-score-title">Active Recall Score</span>
            <span class="lumina-score-val" id="score-val">0/0</span>
          </div>
          <div id="quiz-card-container"></div>
        </div>
      </div>
    `;

    shadowRoot.appendChild(sidebarEl);

    // Setup Local References
    chatHistoryEl = shadowRoot.getElementById("chat-history");
    textareaEl = shadowRoot.getElementById("chat-textarea");
    sendBtnEl = shadowRoot.getElementById("send-btn");
    cropBtnEl = shadowRoot.getElementById("crop-btn");
    previewContainerEl = shadowRoot.getElementById("image-preview-container");
    previewImgEl = shadowRoot.getElementById("image-preview-img");
    highlightsListEl = shadowRoot.getElementById("highlights-list");
    quizCardContainerEl = shadowRoot.getElementById("quiz-card-container");
    scoreValEl = shadowRoot.getElementById("score-val");

    // Attach Event Listeners
    shadowRoot.getElementById("close-sidebar-btn").addEventListener("click", () => toggleSidebar(false));
    
    // Tab switching
    shadowRoot.querySelectorAll(".lumina-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        switchTab(e.currentTarget.getAttribute("data-tab"));
      });
    });

    // Auto-growing textarea
    textareaEl.addEventListener("input", () => {
      textareaEl.style.height = "auto";
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + "px";
    });

    // Keydown inside textarea
    textareaEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    });

    // Send Button
    sendBtnEl.addEventListener("click", submitMessage);

    // Clear Chat
    shadowRoot.getElementById("clear-chat-btn").addEventListener("click", clearChat);

    // Image preview removal
    shadowRoot.getElementById("remove-image-btn").addEventListener("click", removeImageSnippet);

    // Crop Button
    cropBtnEl.addEventListener("click", startScreenCrop);

    // Text selection floating pill
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("selectionchange", handleSelectionChange);

    // Load initial storage data
    loadPersistedData();
  }

  // 4. Data persistence
  function loadPersistedData() {
    chrome.storage.local.get(["luminaHighlights", "luminaQuizzes", "luminaQuizScore", "luminaChatHistory"], (res) => {
      if (res.luminaHighlights) {
        highlights = res.luminaHighlights;
        renderHighlights();
      }
      if (res.luminaQuizzes) {
        quizzes = res.luminaQuizzes;
      }
      if (res.luminaQuizScore) {
        quizScore = res.luminaQuizScore;
        scoreValEl.textContent = `${quizScore.correct}/${quizScore.total}`;
      }
      if (res.luminaChatHistory && res.luminaChatHistory.length > 0) {
        chatHistory = res.luminaChatHistory;
        rebuildChatHistoryUI();
      }
      renderActiveQuiz();
    });
  }

  function saveHighlights() {
    chrome.storage.local.set({ luminaHighlights: highlights }, renderHighlights);
  }

  function saveQuizzes() {
    chrome.storage.local.set({ luminaQuizzes: quizzes });
  }

  function saveChatHistory() {
    // Save up to last 40 messages to avoid storage limits
    const historyToSave = chatHistory.slice(-40);
    chrome.storage.local.set({ luminaChatHistory: historyToSave });
  }

  // 5. Sidebar visibility and tab toggles
  function toggleSidebar(forceState) {
    sidebarOpen = (forceState !== undefined) ? forceState : !sidebarOpen;
    if (sidebarOpen) {
      sidebarEl.classList.add("visible");
      // Focus textarea
      setTimeout(() => textareaEl.focus(), 300);
    } else {
      sidebarEl.classList.remove("visible");
    }
  }

  function switchTab(tabName) {
    activeTab = tabName;
    shadowRoot.querySelectorAll(".lumina-tab").forEach(tab => {
      tab.classList.toggle("active", tab.getAttribute("data-tab") === tabName);
    });
    shadowRoot.querySelectorAll(".lumina-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `panel-${tabName}`);
    });

    if (tabName === "highlights") {
      renderHighlights();
    } else if (tabName === "quizzes") {
      renderActiveQuiz();
    }
  }

  // 6. Text selection and floating action pill
  function handleTextSelection(e) {
    // Avoid displaying pill if clicking inside Shadow DOM
    const host = document.getElementById("lumina-copilot-host");
    if (host && host.contains(e.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (!text) {
        removeFloatingPill();
        return;
      }

      // Render Pill near selection coordinates
      try {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length === 0) return;
        const rect = rects[0];

        createFloatingPill(rect.left + window.scrollX, rect.top + window.scrollY - 36, text);
      } catch (err) {
        removeFloatingPill();
      }
    }, 50);
  }

  function handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection.toString().trim()) {
      removeFloatingPill();
    }
  }

  function createFloatingPill(x, y, text) {
    removeFloatingPill();

    floatingPillEl = document.createElement("div");
    floatingPillEl.className = "lumina-floating-pill";
    // Bound coordinates inside viewport boundaries safely
    floatingPillEl.style.left = Math.max(10, Math.min(x, window.innerWidth - 220)) + "px";
    floatingPillEl.style.top = Math.max(10, y) + "px";

    floatingPillEl.innerHTML = `
      <button class="lumina-pill-action" id="pill-explain">💡 Explain</button>
      <div class="lumina-pill-divider"></div>
      <button class="lumina-pill-action" id="pill-quiz">🧠 Quiz</button>
      <div class="lumina-pill-divider"></div>
      <button class="lumina-pill-action" id="pill-save">💾 Save</button>
    `;

    // Make it child of document body, but styled using absolute positioning
    // Wait, to keep style scoped, let's inject it into host element so it inherits fonts
    const host = document.getElementById("lumina-copilot-host");
    if (host && host.shadowRoot) {
      host.shadowRoot.appendChild(floatingPillEl);

      host.shadowRoot.getElementById("pill-explain").addEventListener("click", () => {
        toggleSidebar(true);
        switchTab("chat");
        askLuminaAboutText(`Explain the following highlighted text in context:\n\n"${text}"`);
        removeFloatingPill();
      });

      host.shadowRoot.getElementById("pill-quiz").addEventListener("click", () => {
        toggleSidebar(true);
        switchTab("quizzes");
        generateQuizFromText(text);
        removeFloatingPill();
      });

      host.shadowRoot.getElementById("pill-save").addEventListener("click", () => {
        saveTextHighlight(text);
        removeFloatingPill();
      });
    }
  }

  function removeFloatingPill() {
    if (floatingPillEl && floatingPillEl.parentNode) {
      floatingPillEl.parentNode.removeChild(floatingPillEl);
      floatingPillEl = null;
    }
  }

  function saveTextHighlight(text) {
    if (!text) return;
    const isDup = highlights.some(h => h.text === text);
    if (isDup) return;

    highlights.unshift({
      text: text,
      url: window.location.href,
      domain: window.location.hostname,
      date: new Date().toLocaleDateString()
    });
    saveHighlights();
  }

  // 7. Crop Snipper Overlay
  function startScreenCrop() {
    // Hide sidebar
    sidebarEl.classList.remove("visible");

    // Add Overlay canvas to screen
    const overlay = document.createElement("div");
    overlay.className = "lumina-crop-overlay";
    overlay.style.display = "block";
    
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    const ctx = canvas.getContext("2d");
    let isDrawing = false;
    let startX = 0, startY = 0;
    let endX = 0, endY = 0;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawOverlay();
    }

    function drawOverlay() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isDrawing) {
        // Clear selection box
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(startX - endX);
        const h = Math.abs(startY - endY);

        ctx.clearRect(x, y, w, h);
        
        // Draw dashed neon border
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, w, h);
      }
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    canvas.addEventListener("mousedown", (e) => {
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      endX = e.clientX;
      endY = e.clientY;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      endX = e.clientX;
      endY = e.clientY;
      drawOverlay();
    });

    canvas.addEventListener("mouseup", (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      endX = e.clientX;
      endY = e.clientY;

      const rect = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(startX - endX),
        height: Math.abs(startY - endY)
      };

      // Cleanup overlay
      window.removeEventListener("resize", resizeCanvas);
      document.body.removeChild(overlay);

      // Restore sidebar
      sidebarEl.classList.add("visible");

      if (rect.width > 5 && rect.height > 5) {
        captureAndCrop(rect);
      }
    });

    // Support escape key to cancel crop
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        sidebarEl.classList.add("visible");
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", resizeCanvas);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
  }

  function captureAndCrop(rect) {
    // Send message to background worker to capture active tab
    chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
      if (response && response.success && response.dataUrl) {
        const fullImg = new Image();
        fullImg.onload = () => {
          // Viewport screenshot needs to be cropped relative to window device pixel ratio
          const scale = window.devicePixelRatio || 1;
          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = rect.width * scale;
          cropCanvas.height = rect.height * scale;

          const cropCtx = cropCanvas.getContext("2d");
          cropCtx.drawImage(
            fullImg,
            rect.x * scale,
            rect.y * scale,
            rect.width * scale,
            rect.height * scale,
            0,
            0,
            rect.width * scale,
            rect.height * scale
          );

          const croppedBase64 = cropCanvas.toDataURL("image/png");
          setImageSnippet(croppedBase64);
        };
        fullImg.src = response.dataUrl;
      } else {
        console.error("Failed to capture tab:", response ? response.error : "No response");
      }
    });
  }

  function setImageSnippet(base64Data) {
    currentImage = {
      data: base64Data,
      mimeType: "image/png"
    };

    previewImgEl.src = base64Data;
    previewContainerEl.classList.add("active");
    textareaEl.placeholder = "Ask something about this snippet...";
    textareaEl.focus();
  }

  function removeImageSnippet() {
    currentImage = null;
    previewImgEl.src = "";
    previewContainerEl.classList.remove("active");
    textareaEl.placeholder = "Type a message or crop screen...";
  }

  // 8. Markdown & Text Formatter helper
  function formatMarkdown(text) {
    if (!text) return "";

    // Escape HTML characters
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold (**text** or __text__)
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

    // Code blocks (```lang ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'txt'}">${code.trim()}</code></pre>`;
    });

    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bullet points (line starts with * or - followed by space)
    html = html.replace(/^(?:\*|-)\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Headers (# title, ## title etc)
    html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

    // Paragraph splits (double newlines)
    html = html.split(/\n{2,}/).map(para => {
      // Don't wrap list items, headings or pre elements in p tags
      if (para.startsWith("<h") || para.startsWith("<ul") || para.startsWith("<pre")) {
        return para;
      }
      return `<p>${para.replace(/\n/g, "<br>")}</p>`;
    }).join("");

    return html;
  }

  // 9. API calls / Chat submits
  async function submitMessage() {
    const text = textareaEl.value.trim();
    if (!text && !currentImage) return;

    // Retrieve Settings
    const settings = await new Promise(resolve => 
      chrome.storage.sync.get(["geminiApiKey", "geminiModel"], resolve)
    );

    const apiKey = settings.geminiApiKey;
    const model = settings.geminiModel || "gemini-2.5-flash";

    if (!apiKey) {
      appendChatMessage("system", "Please configure your Gemini API Key in the extension settings (click extension icon in toolbar).");
      return;
    }

    // Append User Message to UI
    const prompt = text || "Analyze this image.";
    const userMsgId = appendChatMessage("user", prompt, currentImage ? currentImage.data : null);

    // Save image ref for prompt call, then clear UI state input
    const promptImage = currentImage;
    removeImageSnippet();
    textareaEl.value = "";
    textareaEl.style.height = "auto";
    sendBtnEl.disabled = true;

    // Build chat history context (exclude system/error messages)
    const historyContext = buildHistoryContext();

    // Prepare Assistant Message Placeholder
    const assistantMsgId = appendChatMessage("assistant", "");
    const assistantMsgEl = shadowRoot.getElementById(assistantMsgId);
    
    // Add loading shimmer initially
    const shimmer = document.createElement("div");
    shimmer.className = "lumina-shimmer-container";
    shimmer.innerHTML = `
      <div class="lumina-shimmer long"></div>
      <div class="lumina-shimmer medium"></div>
      <div class="lumina-shimmer short"></div>
    `;
    assistantMsgEl.appendChild(shimmer);
    scrollChatBottom();

    // Trigger Stream API call via Background worker
    activeStreamMessageId = assistantMsgId;
    let responseText = "";

    chrome.runtime.sendMessage({
      action: "CALL_GEMINI_STREAM",
      apiKey,
      model,
      prompt,
      history: historyContext,
      image: promptImage,
      systemInstruction: "You are Lumina AI, an intelligent, sleek web copilot. Help the user interact, analyze, and learn from page content. Be direct, clear, and insightful. Format answers in standard markdown.",
      messageId: assistantMsgId
    });

    // Save user message to internal history list
    const userParts = [];
    if (promptImage) {
      userParts.push({ inlineData: { mimeType: promptImage.mimeType, data: promptImage.data.split(",")[1] || promptImage.data } });
    }
    userParts.push({ text: prompt });
    chatHistory.push({ role: "user", parts: userParts });
  }

  function buildHistoryContext() {
    const context = [];
    // Only pass last 6 interactions to keep context sizes light and fast
    const recentHistory = chatHistory.slice(-12);
    for (const msg of recentHistory) {
      context.push({
        role: msg.role,
        parts: msg.parts
      });
    }
    return context;
  }

  function appendChatMessage(role, text, imageSrc = null) {
    const id = "lumina-msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const msgEl = document.createElement("div");
    msgEl.className = `lumina-message ${role}`;
    msgEl.id = id;

    if (imageSrc) {
      const img = document.createElement("img");
      img.src = imageSrc;
      msgEl.appendChild(img);
    }

    if (text) {
      const textContainer = document.createElement("div");
      textContainer.className = "lumina-msg-text";
      textContainer.innerHTML = formatMarkdown(text);
      msgEl.appendChild(textContainer);
    }

    chatHistoryEl.appendChild(msgEl);
    scrollChatBottom();
    return id;
  }

  function scrollChatBottom() {
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }

  function rebuildChatHistoryUI() {
    chatHistoryEl.innerHTML = "";
    chatHistory.forEach(msg => {
      const role = msg.role === "user" ? "user" : "assistant";
      let imageSrc = null;
      let text = "";

      for (const part of msg.parts) {
        if (part.inlineData) {
          imageSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          text = part.text;
        }
      }

      appendChatMessage(role, text, imageSrc);
    });
  }

  function clearChat() {
    chatHistory = [];
    saveChatHistory();
    chatHistoryEl.innerHTML = `
      <div class="lumina-message assistant">
        Chat cleared! Feel free to ask me anything or select text / crop images to get started.
      </div>
    `;
    removeImageSnippet();
  }

  function askLuminaAboutText(prompt) {
    textareaEl.value = prompt;
    submitMessage();
  }

  // 10. Highlights Tab Renderer
  function renderHighlights() {
    highlightsListEl.innerHTML = "";

    if (highlights.length === 0) {
      highlightsListEl.innerHTML = `
        <div class="lumina-empty-state">
          <div class="lumina-empty-icon">💾</div>
          <p>No highlights saved yet.</p>
          <p style="font-size:11px;color:rgba(148,163,184,0.4)">Highlight text on any webpage and click "Save" from the floating pill.</p>
        </div>
      `;
      return;
    }

    // Export Button
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.marginBottom = "12px";
    headerRow.innerHTML = `
      <span style="font-size:12px;font-weight:600;color:rgba(148,163,184,0.7)">${highlights.length} saved clips</span>
      <button class="lumina-btn-secondary" id="export-highlights-btn" style="padding:4px 8px;font-size:11px;">Export MD</button>
    `;
    highlightsListEl.appendChild(headerRow);

    shadowRoot.getElementById("export-highlights-btn").addEventListener("click", exportHighlightsAsMarkdown);

    highlights.forEach((hl, index) => {
      const card = document.createElement("div");
      card.className = "lumina-highlight-card";
      card.innerHTML = `
        <div class="lumina-highlight-text">${hl.text}</div>
        <div class="lumina-highlight-meta">
          <a class="lumina-highlight-domain" href="${hl.url}" target="_blank" title="${hl.url}">${hl.domain}</a>
          <div style="display:flex;align-items:center;gap:8px">
            <span>${hl.date}</span>
            <button class="lumina-card-delete-btn" data-index="${index}">&times; Delete</button>
          </div>
        </div>
      `;

      card.querySelector(".lumina-card-delete-btn").addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-index"));
        highlights.splice(idx, 1);
        saveHighlights();
      });

      highlightsListEl.appendChild(card);
    });
  }

  function exportHighlightsAsMarkdown() {
    if (highlights.length === 0) return;
    let md = "# Lumina AI Research Highlights\n\n";
    highlights.forEach(h => {
      md += `> ${h.text}\n\n`;
      md += `*   **Source:** [${h.domain}](${h.url})\n`;
      md += `*   **Saved on:** ${h.date}\n\n`;
      md += "---\n\n";
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina_highlights_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 11. Active-Recall Quizzes
  async function generateQuizFromText(text) {
    const settings = await new Promise(resolve => 
      chrome.storage.sync.get(["geminiApiKey", "geminiModel"], resolve)
    );

    const apiKey = settings.geminiApiKey;
    const model = settings.geminiModel || "gemini-2.5-flash";

    if (!apiKey) {
      alert("Please configure your Gemini API Key first.");
      return;
    }

    // Render loading state inside quiz card container
    quizCardContainerEl.innerHTML = `
      <div class="lumina-quiz-card" style="align-items:center;text-align:center">
        <div class="lumina-logo" style="animation: shimmer 1.5s infinite;margin-bottom:8px">✦</div>
        <p style="font-size:13px;color:#e2e8f0;font-weight:600">Generating Active Recall Quiz...</p>
        <p style="font-size:11px;color:rgba(148,163,184,0.6)">Lumina is analyzing the text selection to draft questions...</p>
      </div>
    `;

    const prompt = `Generate a single multiple-choice question testing understanding of the following text.
Format the output EXACTLY as a JSON object, with no markdown code blocks, containing these fields:
{
  "question": "The question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Brief explanation of why the correct option is correct."
}

Text:
"${text}"`;

    chrome.runtime.sendMessage({
      action: "CALL_GEMINI",
      apiKey,
      model,
      prompt,
      systemInstruction: "You are a teacher drafting strict multiple-choice questions. Return ONLY raw JSON. Do not wrap in markdown code blocks."
    }, (res) => {
      if (res && res.success) {
        try {
          // Strip any markdown wrappers if model ignores instruction
          let cleanJson = res.data.replace(/```json|```/g, "").trim();
          const quiz = JSON.parse(cleanJson);
          currentQuiz = {
            ...quiz,
            selectedOption: null,
            answered: false,
            textSource: text
          };
          renderActiveQuiz();
        } catch (err) {
          showQuizError("Failed to parse quiz response: " + err.message + "\n\nResponse was:\n" + res.data);
        }
      } else {
        showQuizError(res ? res.error : "Failed to generate quiz.");
      }
    });
  }

  function showQuizError(errText) {
    quizCardContainerEl.innerHTML = `
      <div class="lumina-quiz-card" style="border-color:rgba(239, 68, 68, 0.3)">
        <p style="color:#f87171;font-weight:600;font-size:13px">Quiz Generation Error</p>
        <p style="font-size:11px;color:rgba(148,163,184,0.7);white-space:pre-wrap">${errText}</p>
        <button class="lumina-btn-secondary" id="retry-quiz-btn" style="margin-top:10px">Clear</button>
      </div>
    `;
    shadowRoot.getElementById("retry-quiz-btn").addEventListener("click", () => {
      currentQuiz = null;
      renderActiveQuiz();
    });
  }

  function renderActiveQuiz() {
    quizCardContainerEl.innerHTML = "";

    if (!currentQuiz) {
      quizCardContainerEl.innerHTML = `
        <div class="lumina-empty-state">
          <div class="lumina-empty-icon">🧠</div>
          <p>No active quiz.</p>
          <p style="font-size:11px;color:rgba(148,163,184,0.4)">Highlight text on any page and click the "Quiz" button from the floating pill to test your understanding.</p>
        </div>
      `;
      return;
    }

    const card = document.createElement("div");
    card.className = "lumina-quiz-card";

    // Question
    const qEl = document.createElement("div");
    qEl.className = "lumina-quiz-q";
    qEl.textContent = currentQuiz.question;
    card.appendChild(qEl);

    // Options
    const optContainer = document.createElement("div");
    optContainer.className = "lumina-quiz-options";
    currentQuiz.options.forEach((opt, idx) => {
      const optEl = document.createElement("div");
      optEl.className = "lumina-quiz-opt";
      if (currentQuiz.selectedOption === idx) optEl.classList.add("selected");
      if (currentQuiz.answered) {
        if (idx === currentQuiz.correctIndex) optEl.classList.add("correct");
        else if (currentQuiz.selectedOption === idx) optEl.classList.add("incorrect");
      }

      optEl.innerHTML = `
        <input type="radio" class="lumina-quiz-opt-radio" name="quiz-options" ${currentQuiz.selectedOption === idx ? 'checked' : ''} ${currentQuiz.answered ? 'disabled' : ''}/>
        <span>${opt}</span>
      `;

      if (!currentQuiz.answered) {
        optEl.addEventListener("click", () => {
          currentQuiz.selectedOption = idx;
          renderActiveQuiz();
        });
      }

      optContainer.appendChild(optEl);
    });
    card.appendChild(optContainer);

    // Answer explanation block
    if (currentQuiz.answered) {
      const explanationEl = document.createElement("div");
      explanationEl.className = "lumina-quiz-explanation";
      explanationEl.innerHTML = `<strong>Explanation:</strong> ${currentQuiz.explanation}`;
      card.appendChild(explanationEl);
    }

    // Action buttons
    const actionsEl = document.createElement("div");
    actionsEl.className = "lumina-quiz-actions";

    if (!currentQuiz.answered) {
      actionsEl.innerHTML = `
        <button class="lumina-btn-secondary" id="quiz-cancel-btn">Discard</button>
        <button class="lumina-btn-primary" id="quiz-submit-btn" ${currentQuiz.selectedOption === null ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>Submit</button>
      `;
      card.appendChild(actionsEl);

      shadowRoot.getElementById("quiz-cancel-btn").addEventListener("click", () => {
        currentQuiz = null;
        renderActiveQuiz();
      });

      if (currentQuiz.selectedOption !== null) {
        shadowRoot.getElementById("quiz-submit-btn").addEventListener("click", submitQuizAnswer);
      }
    } else {
      actionsEl.innerHTML = `
        <button class="lumina-btn-secondary" id="quiz-save-btn">Save to Vault</button>
        <button class="lumina-btn-primary" id="quiz-done-btn">Next</button>
      `;
      card.appendChild(actionsEl);

      shadowRoot.getElementById("quiz-done-btn").addEventListener("click", () => {
        currentQuiz = null;
        renderActiveQuiz();
      });

      const saveBtn = shadowRoot.getElementById("quiz-save-btn");
      const isSaved = quizzes.some(q => q.question === currentQuiz.question);
      if (isSaved) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saved ✓";
        saveBtn.style.opacity = "0.7";
      } else {
        saveBtn.addEventListener("click", () => {
          quizzes.push(currentQuiz);
          saveQuizzes();
          saveBtn.disabled = true;
          saveBtn.textContent = "Saved ✓";
          saveBtn.style.opacity = "0.7";
        });
      }
    }

    quizCardContainerEl.appendChild(card);
  }

  function submitQuizAnswer() {
    if (!currentQuiz || currentQuiz.selectedOption === null || currentQuiz.answered) return;
    
    currentQuiz.answered = true;
    quizScore.total += 1;
    if (currentQuiz.selectedOption === currentQuiz.correctIndex) {
      quizScore.correct += 1;
    }

    scoreValEl.textContent = `${quizScore.correct}/${quizScore.total}`;
    chrome.storage.local.set({ luminaQuizScore: quizScore });

    renderActiveQuiz();
  }

  // 12. Listen to background communications (Stream handling)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "OPEN_SIDEBAR") {
      toggleSidebar(true);
      if (message.type === "EXPLAIN_SELECTION" && message.text) {
        switchTab("chat");
        askLuminaAboutText(`Explain the following highlighted text in context:\n\n"${message.text}"`);
      } else if (message.type === "GENERATE_QUIZ" && message.text) {
        switchTab("quizzes");
        generateQuizFromText(message.text);
      } else if (message.type === "OPEN") {
        // Just opens the sidebar
      }
      sendResponse({ success: true });
    }

    if (message.action === "TOGGLE_SIDEBAR") {
      toggleSidebar();
      sendResponse({ success: true });
    }

    // Streaming updates
    if (message.action === "STREAM_CHUNK" && message.messageId === activeStreamMessageId) {
      const msgEl = shadowRoot.getElementById(activeStreamMessageId);
      if (msgEl) {
        // Remove shimmer if present on first chunk
        const shimmer = msgEl.querySelector(".lumina-shimmer-container");
        if (shimmer) msgEl.removeChild(shimmer);

        let textContainer = msgEl.querySelector(".lumina-msg-text");
        if (!textContainer) {
          textContainer = document.createElement("div");
          textContainer.className = "lumina-msg-text";
          msgEl.appendChild(textContainer);
        }

        // Retrieve current aggregated text
        const currentText = textContainer.getAttribute("data-raw-text") || "";
        const nextText = currentText + message.chunk;
        textContainer.setAttribute("data-raw-text", nextText);
        textContainer.innerHTML = formatMarkdown(nextText);
        scrollChatBottom();
      }
    }

    if (message.action === "STREAM_DONE" && message.messageId === activeStreamMessageId) {
      const msgEl = shadowRoot.getElementById(activeStreamMessageId);
      if (msgEl) {
        const textContainer = msgEl.querySelector(".lumina-msg-text");
        const finalResponseText = textContainer ? textContainer.getAttribute("data-raw-text") : "";
        
        // Append response to history
        chatHistory.push({
          role: "model",
          parts: [{ text: finalResponseText || "" }]
        });
        saveChatHistory();
      }
      activeStreamMessageId = null;
      sendBtnEl.disabled = false;
    }

    if (message.action === "STREAM_ERROR" && message.messageId === activeStreamMessageId) {
      const msgEl = shadowRoot.getElementById(activeStreamMessageId);
      if (msgEl) {
        msgEl.innerHTML = `<span style="color:#f87171">Error: ${message.error || 'Failed to generate response.'}</span>`;
      }
      activeStreamMessageId = null;
      sendBtnEl.disabled = false;
    }
  });

  // Run Initialization
  init();
})();
