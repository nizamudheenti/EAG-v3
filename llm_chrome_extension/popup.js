document.getElementById('extractBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.textContent = 'Extracting...';
  
    // Get current active tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    // Execute content script in the current tab
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      // Send message to the content script we just injected
      chrome.tabs.sendMessage(tab.id, { action: "extract" }, (response) => {
          if (chrome.runtime.lastError) {
            status.textContent = 'Error: Please refresh the page and try again.';
            return;
          }
  
          if (response && response.text) {
            triggerJSONLDownload(response.text, tab.title, tab.url);
            status.textContent = 'Successfully Downloaded!';
          } else {
            status.textContent = 'Could not find main text on this page.';
          }
      });
    });
});
  
function triggerJSONLDownload(text, title, url) {
    // Format required for LLMs (Adding URL and Title as metadata)
    const dataObj = {
        text: text,
        metadata: {
            title: title,
            source: url
        }
    };
    
    // JSONL requires the object to be stringified on a single line
    const jsonlString = JSON.stringify(dataObj) + '\n';
    
    // Create Blob for file download
    const blob = new Blob([jsonlString], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Format a clean filename based on page title
    const filename = 'llm_data_' + (title || 'extract').replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) + '.jsonl';
    
    // Trigger Chrome to download the file
    chrome.downloads.download({
        url: blobUrl,
        filename: filename,
        saveAs: false
    });
}
