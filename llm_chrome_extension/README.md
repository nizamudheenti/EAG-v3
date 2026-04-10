# LLM Data Collector Chrome Extension

A custom, lightweight Chrome extension designed specifically for Data Science enthusiasts. It allows you to scrape the main text from any web page (articles, blogs, documentation) and instantly download it in a `JSONL` format ready to be consumed by Large Language Model (LLM) fine-tuning processes (like OpenAI, HuggingFace, etc.).

## Features
- **One-Click Scraping:** Extracts text from your active browser tab.
- **Smart DOM Parsing:** Attempts to locate `<article>` tags or relevant paragraphs, stripping out navigation bars, footers, and other "noisy" HTML.
- **Auto-Formatting:** Saves the extracted text cleanly into a `.jsonl` file to your Downloads folder.

---

## How to Install (Developer Mode)

Because this is a custom local extension, you install it by loading the unpacked folder directly into Chrome.

1. Open Google Chrome. 
2. In the URL address bar, type `chrome://extensions/` and hit Enter.
3. In the top right corner of the Extensions page, ensure **Developer mode** is toggled ON.
4. In the top left corner, click the **Load unpacked** button.
5. A file explorer window will open. Navigate to this exact folder (`llm_chrome_extension`), select it, and click "Select Folder".
6. The "LLM Data Collector" will now appear in your list of extensions!

> **Tip:** You may want to "Pin" the extension to your Chrome upper toolbar by clicking the puzzle piece icon next to your URL bar, identifying the custom extension, and clicking the pin icon.

---

## How to Use

1. Navigate to an article, blog post, or specific chunk of documentation you want to add to your LLM dataset.
2. Click the "LLM Data Collector" icon in your extensions toolbar.
3. Click the **"Download Page as JSONL"** button inside the popup.
4. A file titled `llm_data_[page_name].jsonl` will automatically deposit into your Downloads folder.

### JSONL Format Output
The downloaded format looks exactly like this, meaning it is perfectly formatted for training without extra coding needed:
```json
{"text":"The whole extracted article text goes here...","metadata":{"title":"Page Title Here","source":"https://the-original-url.com"}}
```
