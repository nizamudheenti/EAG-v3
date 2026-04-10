# Webpage to PDF Converter (Mozilla extension)

A custom-built Mozilla Firefox extension that allows you to instantly convert and download any webpage as a PDF file with a single click.

## Why this is Unique
This extension leverages the `browser.tabs.saveAsPDF` API, which is a powerful, exclusive API built strictly into Mozilla Firefox's Manifest V3 architecture. Unlike Chrome extensions which require messy workarounds or third-party libraries (like `html2pdf`) to generate documents, this extension hooks directly into the browser's native rendering engine to generate a perfect PDF in the background.

## Features
- **One-Click Download:** No print dialog boxes or messy configuration menus.
- **Native Rendering:** Perfect PDF conversion keeping the webpage's original layout.
- **Custom Headers & Footers:** Automatically injects the Webpage Title in the top-left, the URL in the right, and numbers the pages automatically at the bottom.
- **Graceful Fallback:** If you attempt to run it on a restricted browser page (like the settings menu), it gracefully falls back to the standard Print dialog.

---

## Installation Guide for Firefox

Because this is an unpublished developer extension, you need to load it as a "Temporary Add-on".

1. Open **Mozilla Firefox**.
2. Type **`about:debugging`** into the URL address bar and press **Enter**.
3. On the left-hand navigation menu, click on **This Firefox**.
4. Under "Temporary Extensions", click the button that says **Load Temporary Add-on...**
5. A file explorer window will open. Navigate to the folder containing this extension (`mozilla_pdf_extension`).
6. Select any file inside the folder (for example, click `manifest.json`) and click **Open**.
7. The extension is now installed! You will see the new PDF icon in your Firefox extensions toolbar.

---

## How to Record Your Demo Video

Here is a recommended flow for your assignment submission video:

1. **Start Screen:** Show off the `popup.js` code, highlighting the `browser.tabs.saveAsPDF` function. Briefly explain how this is unique to Firefox and saves time compared to standard Chrome extensions.
2. **Action:** Navigate to a content-heavy webpage (like a Wikipedia article or an interesting blog post).
3. **Execution:** Click the Extension in the toolbar, and hit **"Download as PDF"**.
4. **Result:** Show the file instantly downloading in the background. Open the downloaded PDF to show the clean styling, the URL at the top, and the page numbers at the bottom.
