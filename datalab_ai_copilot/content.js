// DataLab AI - Content Script (Scoped inside Shadow DOM)

(function () {
  if (window.DataLabAICopilotInjected) return;
  window.DataLabAICopilotInjected = true;

  // 1. Core State
  let sidebarOpen = false;
  let activeTab = "math"; // math (Math Lab), tables (Table Profiler), models (Model Drafts)
  let currentImage = null; // { data: 'base64...', mimeType: 'image/png' }
  let activeStreamMessageId = null;
  let mathChatHistory = []; // [{role: 'user'|'model', parts: [{text: '...'}]}]
  let scannedTables = [];
  let modelDrafts = [];
  let isScanningTables = false;
  let activeOverlays = []; // elements highlighting tables on the page

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
  let tablesListEl = null;
  let modelTextareaEl = null;
  let modelDraftsEl = null;

  // 3. Initialize Shadow DOM
  function init() {
    const host = document.createElement("div");
    host.id = "datalab-copilot-host";
    document.body.appendChild(host);

    shadowRoot = host.attachShadow({ mode: "open" });

    // Load Scoped CSS
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = chrome.runtime.getURL("sidebar.css");
    shadowRoot.appendChild(styleLink);

    // Create Sidebar Element
    sidebarEl = document.createElement("div");
    sidebarEl.className = "datalab-sidebar-root";
    sidebarEl.innerHTML = `
      <!-- Header -->
      <div class="datalab-header">
        <div class="datalab-brand">
          <div class="datalab-logo">λ</div>
          <div class="datalab-title-container">
            <span class="datalab-title">DataLab AI</span>
            <span class="datalab-subtitle">Data Scientist's Companion</span>
          </div>
        </div>
        <button class="datalab-close-btn" id="close-sidebar-btn">&times;</button>
      </div>

      <!-- Tabs -->
      <div class="datalab-tabs">
        <button class="datalab-tab active" data-tab="math">🧮 Math Lab</button>
        <button class="datalab-tab" data-tab="tables">📊 Tables</button>
        <button class="datalab-tab" data-tab="models">🤖 Model Drafts</button>
      </div>

      <!-- Math Lab Panel -->
      <div class="datalab-panel active" id="panel-math">
        <div class="datalab-chat-history" id="chat-history">
          <div class="datalab-message assistant">
            Welcome to Math Lab! Capture math formulas on screen using the camera (📷) or describe your problem. I will translate it to <strong>LaTeX</strong>, <strong>NumPy</strong>, and <strong>PyTorch</strong> code with detailed variable explanations.
          </div>
        </div>

        <div class="datalab-chat-input-area">
          <div class="datalab-image-preview-container" id="image-preview-container">
            <img class="datalab-image-preview" id="image-preview-img" src="" />
            <button class="datalab-remove-image-btn" id="remove-image-btn">&times;</button>
          </div>
          <textarea class="datalab-chat-textarea" id="chat-textarea" placeholder="Describe formula or crop math..." rows="1"></textarea>
          
          <div class="datalab-input-controls">
            <div class="datalab-utility-btns">
              <button class="datalab-icon-btn" id="crop-btn" title="Crop Equation from Page">📷</button>
              <button class="datalab-icon-btn" id="clear-chat-btn" title="Clear History">🧹</button>
            </div>
            <button class="datalab-send-btn" id="send-btn">Generate</button>
          </div>
        </div>
      </div>

      <!-- Table Profiler Panel -->
      <div class="datalab-panel" id="panel-tables">
        <div class="datalab-table-scanner-controls">
          <button class="datalab-btn-scan" id="scan-tables-btn">
            🔍 Scan Page for HTML Tables
          </button>
        </div>
        <div class="datalab-tables-list" id="tables-list"></div>
      </div>

      <!-- Model Drafts Panel -->
      <div class="datalab-panel" id="panel-models">
        <div class="datalab-model-drafts-container">
          <div class="datalab-model-prompt-box">
            <p style="font-size:11px;font-weight:600;color:rgba(148,163,184,0.7);margin-bottom:6px;text-transform:uppercase">Draft ML Model Modules</p>
            <textarea class="datalab-model-textarea" id="model-textarea" placeholder="e.g., A multi-branch ResNet module in PyTorch with custom channel sizing..."></textarea>
            <div class="datalab-draft-btn-container">
              <button class="datalab-btn-primary" id="draft-model-btn" style="padding:6px 12px;font-size:12px;">Draft Module</button>
            </div>
          </div>
          <div class="datalab-model-outputs" id="model-drafts-list"></div>
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
    tablesListEl = shadowRoot.getElementById("tables-list");
    modelTextareaEl = shadowRoot.getElementById("model-textarea");
    modelDraftsEl = shadowRoot.getElementById("model-drafts-list");

    // Close button
    shadowRoot.getElementById("close-sidebar-btn").addEventListener("click", () => toggleSidebar(false));

    // Tab switching
    shadowRoot.querySelectorAll(".datalab-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        switchTab(e.currentTarget.getAttribute("data-tab"));
      });
    });

    // Auto-growing chat input
    textareaEl.addEventListener("input", () => {
      textareaEl.style.height = "auto";
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + "px";
    });

    textareaEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitMathLabQuery();
      }
    });

    sendBtnEl.addEventListener("click", submitMathLabQuery);
    shadowRoot.getElementById("clear-chat-btn").addEventListener("click", clearMathLabChat);
    shadowRoot.getElementById("remove-image-btn").addEventListener("click", removeImageSnippet);
    cropBtnEl.addEventListener("click", startScreenCrop);
    
    // Table Scanner Button
    shadowRoot.getElementById("scan-tables-btn").addEventListener("click", triggerTableScan);

    // Model Drafts Button
    shadowRoot.getElementById("draft-model-btn").addEventListener("click", triggerModelDrafting);

    // Text selections
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("selectionchange", handleSelectionChange);

    // Load initial storage details
    loadPersistedData();
  }

  // 4. Data persistence
  function loadPersistedData() {
    chrome.storage.local.get(["datalabMathHistory", "datalabModelDrafts"], (res) => {
      if (res.datalabMathHistory && res.datalabMathHistory.length > 0) {
        mathChatHistory = res.datalabMathHistory;
        rebuildMathChatUI();
      }
      if (res.datalabModelDrafts && res.datalabModelDrafts.length > 0) {
        modelDrafts = res.datalabModelDrafts;
        renderModelDraftsList();
      }
    });
  }

  function saveMathChatHistory() {
    const historyToSave = mathChatHistory.slice(-40);
    chrome.storage.local.set({ datalabMathHistory: historyToSave });
  }

  function saveModelDrafts() {
    chrome.storage.local.set({ datalabModelDrafts: modelDrafts });
  }

  // 5. Sidebar and Tab toggles
  function toggleSidebar(forceState) {
    sidebarOpen = (forceState !== undefined) ? forceState : !sidebarOpen;
    if (sidebarOpen) {
      sidebarEl.classList.add("visible");
      setTimeout(() => textareaEl.focus(), 300);
    } else {
      sidebarEl.classList.remove("visible");
      cleanupTableOverlays();
    }
  }

  function switchTab(tabName) {
    activeTab = tabName;
    shadowRoot.querySelectorAll(".datalab-tab").forEach(tab => {
      tab.classList.toggle("active", tab.getAttribute("data-tab") === tabName);
    });
    shadowRoot.querySelectorAll(".datalab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `panel-${tabName}`);
    });

    if (tabName !== "tables") {
      cleanupTableOverlays();
    } else {
      renderTablesList();
    }
  }

  // 6. Text selection and floating action pill
  function handleTextSelection(e) {
    const host = document.getElementById("datalab-copilot-host");
    if (host && host.contains(e.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (!text) {
        removeFloatingPill();
        return;
      }

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
    floatingPillEl.className = "datalab-floating-pill";
    floatingPillEl.style.left = Math.max(10, Math.min(x, window.innerWidth - 220)) + "px";
    floatingPillEl.style.top = Math.max(10, y) + "px";

    floatingPillEl.innerHTML = `
      <button class="datalab-pill-action" id="pill-math-code">🧮 Math to Code</button>
      <div class="datalab-pill-divider"></div>
      <button class="datalab-pill-action" id="pill-explain">💡 Explain</button>
    `;

    const host = document.getElementById("datalab-copilot-host");
    if (host && host.shadowRoot) {
      host.shadowRoot.appendChild(floatingPillEl);

      host.shadowRoot.getElementById("pill-math-code").addEventListener("click", () => {
        toggleSidebar(true);
        switchTab("math");
        askMathLab(`Translate the following mathematical formula into PyTorch, NumPy, LaTeX, and write clean explanations:\n\n"${text}"`);
        removeFloatingPill();
      });

      host.shadowRoot.getElementById("pill-explain").addEventListener("click", () => {
        toggleSidebar(true);
        switchTab("math");
        askMathLab(`Explain the following data science concept in simple terms:\n\n"${text}"`);
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

  // 7. Math Crop Snipper Overlay
  function startScreenCrop() {
    sidebarEl.classList.remove("visible");

    const overlay = document.createElement("div");
    overlay.className = "datalab-crop-overlay";
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
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(startX - endX);
        const h = Math.abs(startY - endY);

        ctx.clearRect(x, y, w, h);
        
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
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

    canvas.addEventListener("mouseup", () => {
      if (!isDrawing) return;
      isDrawing = false;

      const rect = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(startX - endX),
        height: Math.abs(startY - endY)
      };

      window.removeEventListener("resize", resizeCanvas);
      document.body.removeChild(overlay);
      sidebarEl.classList.add("visible");

      if (rect.width > 5 && rect.height > 5) {
        captureAndCropMath(rect);
      }
    });

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

  function captureAndCropMath(rect) {
    chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
      if (response && response.success && response.dataUrl) {
        const fullImg = new Image();
        fullImg.onload = () => {
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
    textareaEl.placeholder = "Explain this mathematical equation/model...";
    textareaEl.focus();
  }

  function removeImageSnippet() {
    currentImage = null;
    previewImgEl.src = "";
    previewContainerEl.classList.remove("active");
    textareaEl.placeholder = "Describe formula or crop math...";
  }

  // 8. Markdown & Copy Code logic
  function formatMarkdown(text) {
    if (!text) return "";

    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

    // Code blocks with syntax wrapping
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'txt'}">${code.trim()}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/^(?:\*|-)\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
    html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

    html = html.split(/\n{2,}/).map(para => {
      if (para.startsWith("<h") || para.startsWith("<ul") || para.startsWith("<pre")) {
        return para;
      }
      return `<p>${para.replace(/\n/g, "<br>")}</p>`;
    }).join("");

    return html;
  }

  // Intercept element renders to inject double-click/hover copy buttons on code elements
  function injectCopyButtons(container) {
    container.querySelectorAll("pre").forEach(pre => {
      if (pre.querySelector(".datalab-copy-code-btn")) return;

      const codeEl = pre.querySelector("code");
      if (!codeEl) return;

      const btn = document.createElement("button");
      btn.className = "datalab-copy-code-btn";
      btn.textContent = "Copy";
      
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(codeEl.innerText).then(() => {
          btn.textContent = "Copied ✓";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 1500);
        });
      });

      pre.appendChild(btn);
    });
  }

  // 9. Math Lab submits
  async function submitMathLabQuery() {
    const text = textareaEl.value.trim();
    if (!text && !currentImage) return;

    const settings = await new Promise(resolve => 
      chrome.storage.sync.get(["geminiApiKey", "geminiModel"], resolve)
    );

    const apiKey = settings.geminiApiKey;
    const model = settings.geminiModel || "gemini-2.5-flash";

    if (!apiKey) {
      appendChatMessage("system", "Please set your Gemini API Key in the extension popup menu.");
      return;
    }

    const prompt = text || "Explain and translate this equation.";
    appendChatMessage("user", prompt, currentImage ? currentImage.data : null);

    const promptImage = currentImage;
    removeImageSnippet();
    textareaEl.value = "";
    textareaEl.style.height = "auto";
    sendBtnEl.disabled = true;

    // Build history context (last 8 entries)
    const historyContext = [];
    const recentHistory = mathChatHistory.slice(-16);
    for (const msg of recentHistory) {
      historyContext.push({ role: msg.role, parts: msg.parts });
    }

    const assistantMsgId = appendChatMessage("assistant", "");
    const assistantMsgEl = shadowRoot.getElementById(assistantMsgId);

    const shimmer = document.createElement("div");
    shimmer.className = "datalab-shimmer-container";
    shimmer.innerHTML = `
      <div class="datalab-shimmer long"></div>
      <div class="datalab-shimmer medium"></div>
      <div class="datalab-shimmer short"></div>
    `;
    assistantMsgEl.appendChild(shimmer);
    scrollChatBottom();

    activeStreamMessageId = assistantMsgId;

    const systemInstruction = `You are DataLab AI, a specialized assistant for Machine Learning Researchers and Data Scientists.
When given math formulas, mathematical text, or images containing equations:
1. Translate it into formatted LaTeX.
2. Implement it in PyTorch (as a clean, vectorized nn.Module or helper function) and NumPy.
3. Define every variable, symbol, and indices.
4. Give a clear mathematical intuition of what it represents (e.g., loss function penalty, normalization method).
Respond with clear code blocks and structural formatting. Use lower-case module configurations.`;

    chrome.runtime.sendMessage({
      action: "CALL_GEMINI_STREAM",
      apiKey,
      model,
      prompt,
      history: historyContext,
      image: promptImage,
      systemInstruction,
      messageId: assistantMsgId
    });

    const userParts = [];
    if (promptImage) {
      userParts.push({ inlineData: { mimeType: promptImage.mimeType, data: promptImage.data.split(",")[1] || promptImage.data } });
    }
    userParts.push({ text: prompt });
    mathChatHistory.push({ role: "user", parts: userParts });
  }

  function appendChatMessage(role, text, imageSrc = null) {
    const id = "datalab-msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const msgEl = document.createElement("div");
    msgEl.className = `datalab-message ${role}`;
    msgEl.id = id;

    if (imageSrc) {
      const img = document.createElement("img");
      img.src = imageSrc;
      msgEl.appendChild(img);
    }

    if (text) {
      const textContainer = document.createElement("div");
      textContainer.className = "datalab-msg-text";
      textContainer.innerHTML = formatMarkdown(text);
      msgEl.appendChild(textContainer);
      injectCopyButtons(textContainer);
    }

    chatHistoryEl.appendChild(msgEl);
    scrollChatBottom();
    return id;
  }

  function scrollChatBottom() {
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }

  function rebuildMathChatUI() {
    chatHistoryEl.innerHTML = "";
    mathChatHistory.forEach(msg => {
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

  function clearMathLabChat() {
    mathChatHistory = [];
    saveMathChatHistory();
    chatHistoryEl.innerHTML = `
      <div class="datalab-message assistant">
        Chat cleared! Describe an equation or crop one on screen to begin.
      </div>
    `;
    removeImageSnippet();
  }

  function askMathLab(prompt) {
    textareaEl.value = prompt;
    submitMathLabQuery();
  }

  // 10. Table Scanner Panel
  function triggerTableScan() {
    const scanBtn = shadowRoot.getElementById("scan-tables-btn");
    
    if (isScanningTables) {
      isScanningTables = false;
      scanBtn.classList.remove("scanning");
      scanBtn.textContent = "🔍 Scan Page for HTML Tables";
      cleanupTableOverlays();
      return;
    }

    isScanningTables = true;
    scanBtn.classList.add("scanning");
    scanBtn.textContent = "⏹ Stop Table Scanning";

    // Scan DOM for tables
    scannedTables = scanPageForTables();
    renderTablesList();
    drawTableOverlays();
  }

  function scanPageForTables() {
    const tables = document.querySelectorAll("table");
    const discovered = [];

    tables.forEach((table, index) => {
      // Find headers
      let headers = [];
      const ths = table.querySelectorAll("th");
      if (ths.length > 0) {
        headers = Array.from(ths).map(th => th.innerText.replace(/\s+/g, " ").trim());
      }

      // Find rows
      const trs = table.querySelectorAll("tr");
      const rows = [];
      trs.forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if (tds.length > 0) {
          rows.push(Array.from(tds).map(td => td.innerText.replace(/\s+/g, " ").trim()));
        }
      });

      if (headers.length === 0 && rows.length > 0) {
        headers = rows[0];
      }

      const numRows = rows.length;
      const numCols = headers.length;

      // Ensure table contains valid content
      if (numRows > 0 && numCols > 0) {
        discovered.push({
          id: `datalab-table-${index}`,
          numRows,
          numCols,
          headers,
          rows
        });
      }
    });

    return discovered;
  }

  function renderTablesList() {
    tablesListEl.innerHTML = "";

    if (scannedTables.length === 0) {
      tablesListEl.innerHTML = `
        <div class="datalab-empty-state">
          <div class="datalab-empty-icon">📊</div>
          <p>No tables detected yet.</p>
          <p style="font-size:11px;color:rgba(148,163,184,0.4)">Click the scan button above to analyze and highlight tables on the active webpage.</p>
        </div>
      `;
      return;
    }

    scannedTables.forEach((table, idx) => {
      const card = document.createElement("div");
      card.className = "datalab-table-card";
      
      const colHeadersSample = table.headers.slice(0, 4).join(", ") + (table.headers.length > 4 ? "..." : "");

      card.innerHTML = `
        <div class="datalab-table-title">
          <span>Table #${idx + 1}</span>
          <span class="datalab-table-dims">${table.numRows}r &times; ${table.numCols}c</span>
        </div>
        <div class="datalab-table-columns">
          <strong>Columns:</strong>
          <span>${colHeadersSample}</span>
        </div>
        <div class="datalab-table-actions">
          <button class="datalab-btn-action btn-profile" data-idx="${idx}">📈 Profile</button>
          <button class="datalab-btn-action btn-export" data-idx="${idx}">📥 Export CSV</button>
        </div>
      `;

      // Export Table to CSV download
      card.querySelector(".btn-export").addEventListener("click", () => {
        downloadCSV(table, idx + 1);
      });

      // Send descriptive data context to Gemini to profile and write code
      card.querySelector(".btn-profile").addEventListener("click", () => {
        profileTableWithAI(table, idx + 1);
      });

      tablesListEl.appendChild(card);
    });
  }

  function drawTableOverlays() {
    cleanupTableOverlays();

    const domTables = document.querySelectorAll("table");
    let mappedCount = 0;

    domTables.forEach((table, index) => {
      // Find matching scanned table structure
      const match = scannedTables.find(t => t.id === `datalab-table-${index}`);
      if (!match) return;

      const rect = table.getBoundingClientRect();
      // Skip invisible elements
      if (rect.width === 0 || rect.height === 0) return;

      mappedCount++;

      const overlay = document.createElement("div");
      overlay.className = "datalab-table-highlight";
      overlay.style.top = (rect.top + window.scrollY) + "px";
      overlay.style.left = (rect.left + window.scrollX) + "px";
      overlay.style.width = rect.width + "px";
      overlay.style.height = rect.height + "px";

      overlay.innerHTML = `
        <div class="datalab-table-highlight-pill">Table ${mappedCount} (${match.numRows}x${match.numCols})</div>
      `;

      // Click overlay to scroll sidebar to table card and highlight it
      overlay.addEventListener("click", () => {
        toggleSidebar(true);
        switchTab("tables");
        // Scroll to card index
        const cards = tablesListEl.querySelectorAll(".datalab-table-card");
        if (cards[mappedCount - 1]) {
          cards[mappedCount - 1].scrollIntoView({ behavior: "smooth" });
          cards[mappedCount - 1].style.borderColor = "#fbbf24";
          setTimeout(() => {
            cards[mappedCount - 1].style.borderColor = "rgba(255, 255, 255, 0.06)";
          }, 2000);
        }
      });

      document.body.appendChild(overlay);
      activeOverlays.push(overlay);
    });
  }

  function cleanupTableOverlays() {
    activeOverlays.forEach(overlay => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    activeOverlays = [];
  }

  function downloadCSV(table, label) {
    let csvContent = "";
    
    // Headers
    const escapedHeaders = table.headers.map(h => `"${h.replace(/"/g, '""')}"`);
    csvContent += escapedHeaders.join(",") + "\n";

    // Data rows
    table.rows.forEach(row => {
      const escapedCells = row.map(cell => `"${cell.replace(/"/g, '""')}"`);
      csvContent += escapedCells.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datalab_table_${label}_${table.numRows}x${table.numCols}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function profileTableWithAI(table, label) {
    toggleSidebar(true);
    switchTab("math"); // Profile results stream in Math Lab chat window

    const headersText = table.headers.join(", ");
    const sampleRows = table.rows.slice(0, 3);
    const prompt = `Analyze this dataset description and write a complete Python Pandas script to profile and visualize the data.

Table Details:
- Name: Scanned Table #${label}
- Dimensions: ${table.numRows} rows, ${table.numCols} columns.
- Columns: [${headersText}]
- Sample Rows (first 3):
${JSON.stringify(sampleRows, null, 2)}

Provide:
1. A mockup Python loading block (create a pandas DataFrame containing this sample data).
2. Code for standard analysis checks (df.info(), df.describe(), checking missing values, column types).
3. Code to plot variables (e.g. Seaborn barplot, lineplot, or pairplot appropriate for these variables).
4. A brief, bulleted analysis of what features look interesting or require cleaning.`;

    askMathLab(prompt);
  }

  // 11. Model Drafts Panel
  async function triggerModelDrafting() {
    const promptText = modelTextareaEl.value.trim();
    if (!promptText) return;

    const settings = await new Promise(resolve => 
      chrome.storage.sync.get(["geminiApiKey", "geminiModel"], resolve)
    );

    const apiKey = settings.geminiApiKey;
    const model = settings.geminiModel || "gemini-2.5-flash";

    if (!apiKey) {
      alert("Please configure your Gemini API Key in the extension configuration popup.");
      return;
    }

    const draftBtn = shadowRoot.getElementById("draft-model-btn");
    draftBtn.disabled = true;
    draftBtn.textContent = "Drafting...";

    const systemInstruction = `You are DataLab AI, an expert deep learning engineer. 
Write professional model architectures in PyTorch/JAX based on user prompt requirements.
Include:
- Complete class modules.
- Annotations explaining tensor input/output shapes.
- Compilation instructions or basic train/forward loop definitions.
Return ONLY markdown formatted response. Do lower-case module names.`;

    const prompt = `Write a high-quality model implementation in PyTorch for: "${promptText}". Explain dimensions and modules clearly.`;

    // Render loading card in list
    const tempId = "model-draft-temp";
    const tempCard = document.createElement("div");
    tempCard.className = "datalab-draft-card";
    tempCard.id = tempId;
    tempCard.innerHTML = `
      <div class="datalab-draft-title">
        <span>Drafting Model...</span>
      </div>
      <div class="datalab-shimmer-container">
        <div class="datalab-shimmer long"></div>
        <div class="datalab-shimmer medium"></div>
        <div class="datalab-shimmer short"></div>
      </div>
    `;
    modelDraftsEl.insertBefore(tempCard, modelDraftsEl.firstChild);

    chrome.runtime.sendMessage({
      action: "CALL_GEMINI",
      apiKey,
      model,
      prompt,
      systemInstruction
    }, (response) => {
      draftBtn.disabled = false;
      draftBtn.textContent = "Draft Module";

      // Remove temp loading card
      const temp = shadowRoot.getElementById(tempId);
      if (temp) temp.parentNode.removeChild(temp);

      if (response && response.success) {
        modelTextareaEl.value = "";
        
        // Prepend new draft to drafts history
        modelDrafts.unshift({
          prompt: promptText,
          code: response.data,
          date: new Date().toLocaleString()
        });

        saveModelDrafts();
        renderModelDraftsList();
      } else {
        alert("Failed to draft model: " + (response ? response.error : "Unknown error"));
      }
    });
  }

  function renderModelDraftsList() {
    modelDraftsEl.innerHTML = "";

    if (modelDrafts.length === 0) {
      modelDraftsEl.innerHTML = `
        <div class="datalab-empty-state">
          <div class="datalab-empty-icon">🤖</div>
          <p>No model drafts generated yet.</p>
          <p style="font-size:11px;color:rgba(148,163,184,0.4)">Specify model requirements above to generate boilerplates (e.g. PyTorch layers, ResNets, customized MLPs).</p>
        </div>
      `;
      return;
    }

    modelDrafts.forEach((draft, idx) => {
      const card = document.createElement("div");
      card.className = "datalab-draft-card";
      card.innerHTML = `
        <div class="datalab-draft-title">
          <span>Draft: ${draft.prompt.slice(0, 30)}${draft.prompt.length > 30 ? '...' : ''}</span>
          <span class="datalab-draft-date">${draft.date}</span>
        </div>
        <div style="font-size:13px;color:#cbd5e1;line-height:1.4;">
          ${formatMarkdown(draft.code)}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:6px;">
          <button class="datalab-card-delete-btn" style="color:#f87171;font-size:11px;background:transparent;border:none;cursor:pointer;" data-idx="${idx}">&times; Delete</button>
        </div>
      `;

      injectCopyButtons(card);

      card.querySelector(".datalab-card-delete-btn").addEventListener("click", (e) => {
        const dIdx = parseInt(e.currentTarget.getAttribute("data-idx"));
        modelDrafts.splice(dIdx, 1);
        saveModelDrafts();
        renderModelDraftsList();
      });

      modelDraftsEl.appendChild(card);
    });
  }

  // 12. Message Relays (Stream responses)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "OPEN_SIDEBAR") {
      toggleSidebar(true);
      if (message.type === "TRANSLATE_MATH" && message.text) {
        switchTab("math");
        askMathLab(`Translate the following mathematical formula into PyTorch, NumPy, LaTeX, and write clean explanations:\n\n"${message.text}"`);
      } else if (message.type === "SCAN_TABLES") {
        switchTab("tables");
        triggerTableScan();
      } else if (message.type === "OPEN") {
        // Simple Open action
      }
      sendResponse({ success: true });
    }

    if (message.action === "TOGGLE_SIDEBAR") {
      toggleSidebar();
      sendResponse({ success: true });
    }

    // Streaming API updates for Math Lab
    if (message.action === "STREAM_CHUNK" && message.messageId === activeStreamMessageId) {
      const msgEl = shadowRoot.getElementById(activeStreamMessageId);
      if (msgEl) {
        const shimmer = msgEl.querySelector(".datalab-shimmer-container");
        if (shimmer) msgEl.removeChild(shimmer);

        let textContainer = msgEl.querySelector(".datalab-msg-text");
        if (!textContainer) {
          textContainer = document.createElement("div");
          textContainer.className = "datalab-msg-text";
          msgEl.appendChild(textContainer);
        }

        const currentText = textContainer.getAttribute("data-raw-text") || "";
        const nextText = currentText + message.chunk;
        textContainer.setAttribute("data-raw-text", nextText);
        textContainer.innerHTML = formatMarkdown(nextText);
        injectCopyButtons(textContainer);
        scrollChatBottom();
      }
    }

    if (message.action === "STREAM_DONE" && message.messageId === activeStreamMessageId) {
      const msgEl = shadowRoot.getElementById(activeStreamMessageId);
      if (msgEl) {
        const textContainer = msgEl.querySelector(".datalab-msg-text");
        const finalResponseText = textContainer ? textContainer.getAttribute("data-raw-text") : "";
        
        mathChatHistory.push({
          role: "model",
          parts: [{ text: finalResponseText || "" }]
        });
        saveMathChatHistory();
      }
      activeStreamMessageId = null;
      sendBtnEl.disabled = false;
    }

    if (message.action === "STREAM_ERROR" && message.messageId === activeStreamMessageId) {
      const msgEl = shadowRoot.getElementById(activeStreamMessageId);
      if (msgEl) {
        msgEl.innerHTML = `<span style="color:#f87171">Error: ${message.error || 'Failed to complete query.'}</span>`;
      }
      activeStreamMessageId = null;
      sendBtnEl.disabled = false;
    }
  });

  // Run Initialization
  init();
})();
