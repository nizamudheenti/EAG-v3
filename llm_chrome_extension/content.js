chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
        let extractedText = "";
        
        // Strategy 1: Look for an <article> tag (most blogs and news sites use this)
        const articleElement = document.querySelector('article');
        
        if (articleElement) {
            extractedText = articleElement.innerText;
        } else {
            // Strategy 2: If no article tag, grab all paragraphs and headers
            const relevantElements = document.querySelectorAll('h1, h2, h3, p');
            let contentArray = [];
            
            relevantElements.forEach(element => {
                 const text = element.innerText.trim();
                 // Filter out tiny pieces of text like short navigation links
                 if (text.length > 25) { 
                     contentArray.push(text);
                 }
            });
            extractedText = contentArray.join('\n\n');
        }

        // Clean up the text a bit (remove excessive empty lines)
        extractedText = extractedText.replace(/\n{3,}/g, '\n\n').trim();

        // Send the extracted text back to the popup.js
        sendResponse({ text: extractedText });
    }
    
    return true; // Keep the message channel open for the async response
});
