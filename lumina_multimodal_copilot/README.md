# Lumina AI - Multimodal Research Companion

Lumina AI is an advanced, premium Google Chrome Extension integrated with Google Gemini Flash / Flash-Lite models. It provides a visual and contextual workspace directly on any webpage, utilizing Gemini's multimodal capabilities (image + text) and long-context processing to deliver high-speed, cost-efficient web intelligence and learning tools.

---

## Key Features

1. **Multimodal Screen Snipping & Explainer**:
   - Crop any region of the active tab (formulas, UI layouts, diagrams, tables, charts).
   - Feed the cropped image and optional prompt directly to Gemini Flash/Flash-Lite for immediate analysis.
2. **Context-Aware Smart Pill & Active-Recall Quizzes**:
   - Highlight text on any page to reveal a sleek floating prompt pill.
   - Generate interactive multiple-choice questions or flashcards about the selection.
   - Play and check answers directly in the panel with score tracking.
3. **Premium Glassmorphic Floating Sidebar (Shadow DOM)**:
   - Completely isolated sidebar using Shadow DOM to prevent CSS stylesheet leaks or conflicts with the host website.
   - Gorgeous aesthetics: Backdrop filters, glowing violet/teal gradient accents, slide-in animations, skeleton loaders, and responsive layouts.
   - Tabs: 
     - 💬 **Chat**: Multimodal conversations with contextual memory.
     - 💾 **Highlights**: Saved clips, annotations, and notes (supports export to Markdown).
     - 🧠 **Quiz Vault**: Saved cards for interactive revisions.
4. **Customizable Model Selection**:
   - Support for `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`, and `gemini-2.0-flash`.
   - Configurations saved securely in `chrome.storage.sync`.

---

## File Architecture

- **`manifest.json`**: Configures permissions (`activeTab`, `storage`, `contextMenus`, `scripting`), background script registers, extension popup actions, and scopes resource loading.
- **`background.js`**: Background service worker. Listens for hotkeys (`Ctrl+Shift+L` / `Command+Shift+L`), manages context menus, captures screenshots, and routes CORS-bypassing fetch streams.
- **`content.js`**: Content script. Injects the isolated Shadow DOM workspace, tracks mouse selections for floating pill coordinates, overlays transparent screenshot canvases, formats markdown, and manages SSE streams.
- **`sidebar.css`**: Stylesheet loaded strictly inside the Shadow DOM containing CSS variables, shimmers, and layout animations.
- **`popup.html` & `popup.js`**: Popover menu in the Chrome toolbar to configure the Gemini API Key, model tiers, and trigger sidebar visibility.
- **`create_icons.py`**: Pure Python script that generates the extension icons in `icons/` folder using mathematical canvas drawings.
- **`icons/`**: Directory containing PNG assets (`icon16.png`, `icon48.png`, `icon128.png`).

---

## Installation & Setup

1. **Download / Clone**: Ensure the `lumina_multimodal_copilot` directory is on your local machine.
2. **Enable Developer Mode**:
   - Open Google Chrome and navigate to `chrome://extensions/`.
   - Toggle the **Developer mode** switch in the top-right corner to **On**.
3. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `lumina_multimodal_copilot` folder.
4. **Set Up API Key**:
   - Click the Extension jigsaw icon in the Chrome toolbar.
   - Click **Lumina AI** to open the configurations menu.
   - Paste your **Google Gemini API Key** (retrieve one for free from [Google AI Studio](https://aistudio.google.com)).
   - Select your preferred model (e.g. Gemini 3.1 Flash-Lite) and click **Save**.
5. **How to Use**:
   - Press **`Ctrl+Shift+L`** (or `Cmd+Shift+L` on Mac) to toggle the sidebar on any webpage.
   - Highlight text on any page to show the prompt options pill.
   - Select the 📷 camera button in the input box to start cropping parts of the screen.
