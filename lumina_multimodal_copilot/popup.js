// Lumina AI - Settings Popup Controller

const apiKeyInput = document.getElementById("api-key-input");
const modelSelect = document.getElementById("model-select");
const saveBtn = document.getElementById("btn-save-settings");
const apiStatus = document.getElementById("api-status");
const statusDot = document.getElementById("status-dot");
const footerStatus = document.getElementById("footer-status");
const openSidebarBtn = document.getElementById("btn-open-sidebar");

// Load stored settings
async function loadSettings() {
  chrome.storage.sync.get(["geminiApiKey", "geminiModel"], (res) => {
    const key = res.geminiApiKey || "";
    const model = res.geminiModel || "gemini-2.5-flash";

    modelSelect.value = model;

    if (key) {
      apiKeyInput.placeholder = "••••••••••••" + key.slice(-4);
      statusDot.classList.add("active");
      footerStatus.textContent = "Ready";
      apiStatus.textContent = "API key configured";
      apiStatus.style.color = "#4ade80";
    } else {
      statusDot.classList.remove("active");
      footerStatus.textContent = "Setup Required";
      apiStatus.textContent = "No key configured";
      apiStatus.style.color = "#cbd5e1";
    }
  });
}

// Save settings
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  const model = modelSelect.value;

  const dataToSave = { geminiModel: model };

  if (key) {
    if (!key.startsWith("AIza")) {
      apiStatus.textContent = "Key should start with AIza...";
      apiStatus.style.color = "#f87171";
      return;
    }
    dataToSave.geminiApiKey = key;
  }

  chrome.storage.sync.set(dataToSave, () => {
    apiStatus.textContent = "✓ Settings saved!";
    apiStatus.style.color = "#4ade80";
    statusDot.classList.add("active");
    footerStatus.textContent = "Ready";
    apiKeyInput.value = "";
    if (key) {
      apiKeyInput.placeholder = "••••••••••••" + key.slice(-4);
    }
    
    // Clear success message after 2s
    setTimeout(loadSettings, 2000);
  });
});

// Trigger sidebar opening
openSidebarBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "OPEN_SIDEBAR_FROM_POPUP", type: "OPEN" }, () => {
    window.close();
  });
});

// Load on start
loadSettings();
