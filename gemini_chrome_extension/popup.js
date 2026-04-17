async function getApiKey() {
  return new Promise(resolve =>
    chrome.storage.sync.get("geminiApiKey", d => resolve(d.geminiApiKey || ""))
  );
}

async function init() {
  const key = await getApiKey();
  const dot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const apiInput = document.getElementById("api-key-input");
  const apiStatus = document.getElementById("api-status");

  if (key) {
    dot.classList.remove("inactive");
    statusText.textContent = "API key configured · Ready";
    apiInput.placeholder = "••••••••••••" + key.slice(-4);
    apiStatus.textContent = "✓ Key saved";
    apiStatus.style.color = "#4ade80";
  } else {
    dot.classList.add("inactive");
    statusText.textContent = "No API key — setup required";
    apiStatus.textContent = "Add your key to get started";
  }
}

document.getElementById("btn-open").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "OPEN_PANEL_FROM_POPUP", type: "OPEN" });
  window.close();
});

document.getElementById("btn-summarize").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "OPEN_PANEL_FROM_POPUP", type: "SUMMARIZE_PAGE" });
  window.close();
});

document.getElementById("api-save-btn").addEventListener("click", async () => {
  const key = document.getElementById("api-key-input").value.trim();
  const apiStatus = document.getElementById("api-status");

  if (!key) {
    apiStatus.textContent = "Please enter a key";
    apiStatus.style.color = "#f87171";
    return;
  }
  if (!key.startsWith("AIza")) {
    apiStatus.textContent = "Key should start with AIza...";
    apiStatus.style.color = "#f87171";
    return;
  }

  await chrome.storage.sync.set({ geminiApiKey: key });
  apiStatus.textContent = "✓ Saved!";
  apiStatus.style.color = "#4ade80";
  document.getElementById("status-dot").classList.remove("inactive");
  document.getElementById("status-text").textContent = "API key configured · Ready";
  document.getElementById("api-key-input").value = "";
  document.getElementById("api-key-input").placeholder = "••••••••••••" + key.slice(-4);
});

document.getElementById("api-key-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("api-save-btn").click();
});

init();
