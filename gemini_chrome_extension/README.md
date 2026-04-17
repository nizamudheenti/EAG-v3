# GeminiPage — AI Web Intelligence Chrome Extension

> Instantly analyze any webpage with Google Gemini Flash 2.0. Summarize, ask questions, and get real-time AI-powered insights without leaving your browser.

![GeminiPage Banner](icons/icon128.png)

---

## What It Does

GeminiPage injects a sleek floating AI panel into every webpage. It reads the page content, sends it to **Gemini Flash 2.0**, and lets you have a full conversation about what you're reading — all in real time with streaming responses.

---

## Features

| Feature | Description |
|---|---|
| 💬 **Floating Chat Panel** | Slides in from the right side of any page — resizable, closable |
| ⚡ **Streaming Responses** | Text streams word-by-word powered by Gemini Flash 2.0 SSE |
| 📄 **Page Summarizer** | One click to get a clean summary of any article or webpage |
| 🎯 **Key Points Extractor** | Pulls out the most important bullet points instantly |
| ✨ **Simplify Mode** | Explains complex content in plain, simple language |
| 🔍 **Critique Mode** | Analyzes content for strengths, biases, and gaps |
| ❓ **Quiz Generator** | Creates 5 quiz questions to test your understanding |
| 🖱️ **Right-Click Menu** | Select any text → right-click → "Ask Gemini about this" |
| ⌨️ **Keyboard Shortcut** | `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) to toggle the panel |
| 🧠 **Multi-Turn Chat** | Maintains conversation history for follow-up questions |
| 📋 **Copy Responses** | Hover any AI response to copy it to clipboard |

---

## Installation

### Step 1 — Clone or Download
```bash
git clone https://github.com/your-username/EAG-v3.git
cd EAG-v3/gemini_chrome_extension
```

### Step 2 — Load in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `gemini_chrome_extension` folder

### Step 3 — Get a Free API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key** → copy the key

### Step 4 — Configure the Extension
1. Click the **GeminiPage icon** in your Chrome toolbar
2. Paste your API key into the field and click **Save**
3. You're ready — visit any webpage and press `Ctrl+Shift+G`!

---

## How to Use

### Open the Panel
- Click the **✦ GeminiPage** icon in your toolbar → **Open AI Panel**
- Or press **`Ctrl+Shift+G`** on any page
- Or click the **floating ✦ button** on the right edge of any page

### Quick Actions
Once the panel is open, use the quick-action buttons at the top:

| Button | What it does |
|---|---|
| 📄 Summarize | 3–5 sentence summary of the entire page |
| 🎯 Key Points | Top 5–7 bullet points from the content |
| ✨ Simplify | Plain-language explanation for anyone |
| 🔍 Critique | Critical analysis — strengths, weaknesses, biases |
| ❓ Quiz Me | 5 quiz questions with answers based on the page |

### Ask Custom Questions
Type anything into the chat box at the bottom:
- *"What is the author's main argument?"*
- *"Are there any statistics mentioned?"*
- *"How does this relate to machine learning?"*
- *"Translate the key ideas into bullet points"*

### Right-Click on Selected Text
1. Highlight any text on the page
2. Right-click → choose **"Ask Gemini about this"** or **"Explain with Gemini"**
3. The panel opens with an instant AI response

---

## Project Structure

```
gemini_chrome_extension/
├── manifest.json        # MV3 manifest — permissions, commands, content scripts
├── background.js        # Service worker — Gemini API calls + SSE streaming
├── content.js           # Content script — panel UI + page content extraction
├── panel.css            # Floating panel styles (dark-mode, animations)
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic — quick actions, API key management
├── create_icons.py      # Script to regenerate PNG icons
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Tech Stack

- **Manifest V3** — latest Chrome extension standard
- **Google Gemini Flash 2.0** — via `generateContent` and `streamGenerateContent` APIs
- **Server-Sent Events (SSE)** — for real-time streaming responses
- **Vanilla JS + CSS** — zero external dependencies, fast and lightweight
- **chrome.storage.sync** — secure API key storage synced across devices

---

## Architecture

```
User Action
    │
    ▼
content.js (panel UI)
    │  chrome.runtime.sendMessage
    ▼
background.js (service worker)
    │  fetch() → Gemini Flash 2.0 API
    ▼
generativelanguage.googleapis.com
    │  SSE stream
    ▼
background.js → chrome.tabs.sendMessage (STREAM_CHUNK)
    │
    ▼
content.js → renders text incrementally in panel
```

---

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `activeTab` | Read the current tab's content for analysis |
| `storage` | Save your API key securely |
| `contextMenus` | Add right-click "Ask Gemini" menu items |
| `scripting` | Inject the panel into pages |
| `host_permissions` | Make API calls to Google's Gemini endpoint |

---

## Troubleshooting

**Panel doesn't open?**
- Make sure the extension is enabled in `chrome://extensions/`
- Try refreshing the page after installing

**"API call failed" error?**
- Double-check your API key in the popup settings
- Ensure your key has access to the Gemini API at [AI Studio](https://aistudio.google.com/app/apikey)

**No response on some pages?**
- Some pages (Chrome Web Store, `chrome://` URLs) block content scripts by design

---

## License

MIT License — free to use, modify, and distribute.

---

*Built as part of the EAG v3 course assignments.*
