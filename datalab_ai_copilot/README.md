# DataLab AI - Data Scientist's Web Companion

DataLab AI is a specialized Google Chrome Extension powered by Google Gemini Flash / Flash-Lite. It acts as an intelligent assistant to bridge the gap between academic research papers (PDFs), web tables, and Python coding (PyTorch, JAX, NumPy) directly in the browser.

---

## Key Features

1. **Multimodal Formula-to-Code Translator (Math OCR)**:
   - Crop mathematical equations from arXiv papers, blog posts, or lecture slides.
   - Use Gemini Flash/Flash-Lite to translate visual math into:
     - Formatted **LaTeX** equations.
     - Ready-to-run vectorized **NumPy / SciPy** calculations.
     - Clean **PyTorch / JAX** class modules.
     - A detailed variable breakdown and mathematical intuition explanation.
2. **HTML Table Extractor & Pandas Profiler**:
   - Scan page for HTML `<table>` elements and highlight them with active outline boundaries.
   - Select any table card from the list to:
     - **Profile Data**: Sends table metadata to Gemini to generate full Pandas profiling check commands and descriptive plot routines (Seaborn/Matplotlib).
     - **Export CSV**: Extracts table contents directly from the page DOM and starts a local `.csv` file download.
3. **Deep Learning Model Drafting**:
   - Enter model layers specifications (e.g. "A multi-branch CNN with residual layers in PyTorch").
   - Gemini compiles boilerplate PyTorch modules with annotated tensor shape updates.
4. **Jupyter-themed Isolated Sidebar (Shadow DOM)**:
   - Floating panel styled with VS Code and Jupyter Lab slate/amber highlights.
   - Automatically injects hover-to-copy buttons on all generated Python and LaTeX code blocks.

---

## File Architecture

- **`manifest.json`**: Standard settings permissions (`activeTab`, `storage`, `contextMenus`, `scripting`), default actions, and web-accessible scoping settings.
- **`background.js`**: Intercepts screenshot captures (`chrome.tabs.captureVisibleTab`), listens to keyboard commands, and handles CORS-bypassing fetch streams.
- **`content.js`**: Injects Shadow DOM container, outlines scanned tables in the DOM, overlays transparent cropping layers, formats code copy overlays, and handles SSE stream relays.
- **`sidebar.css`**: Scoped style parameters (Jupyter slate theme, gold scrollbars, loader blocks) loaded strictly inside the Shadow DOM.
- **`popup.html` & `popup.js`**: Toolbar configuration panels to save Gemini API keys, choose models, select code framework preferences (PyTorch, JAX, TensorFlow, NumPy), and toggle workspace visibility.
- **`create_icons.py`**: Pure Python script that generates the custom icon set with a stylized mathematical Lambda symbol.
- **`icons/`**: Directory containing PNG assets (`icon16.png`, `icon48.png`, `icon128.png`).

---

## Installation & Setup

1. **Download / Clone**: Ensure the `datalab_ai_copilot` directory is on your local machine.
2. **Enable Developer Mode**:
   - Open Google Chrome and navigate to `chrome://extensions/`.
   - Toggle the **Developer mode** switch in the top-right corner to **On**.
3. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `datalab_ai_copilot` folder.
4. **Set Up API Key**:
   - Click the Extension jigsaw icon in the Chrome toolbar.
   - Click **DataLab AI** to open the configurations menu.
   - Paste your **Google Gemini API Key** (retrieve one for free from [Google AI Studio](https://aistudio.google.com)).
   - Select your preferred model (e.g. Gemini 3.1 Flash-Lite) and coding framework (e.g. PyTorch). Click **Save**.
5. **How to Use**:
   - Press **`Ctrl+Shift+D`** (or `Cmd+Shift+D` on Mac) to toggle the sidebar on any webpage.
   - Click **Scan Page for HTML Tables** in the Tables tab to highlight and extract structured datasets.
   - Click the 📷 camera crop button in the Math Lab input box to crop formulas from papers and view Python implementations.
