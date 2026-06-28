# MCP Server Assignment Evaluation Report (`eval.md`)

This document reviews the technical implementation of the **AI Investor & Portfolio Research Terminal** against the assignment grading requirements.

---

## 1. Assignment Grading Matrix

| Requirement | Grading Criteria | Implementation Details |
| :--- | :---: | :--- |
| **Internet-Connected API Tool** | Required | Implemented `fetch_ticker_data` (Yahoo Finance REST API) and `search_tavily` (Tavily Search API). |
| **Local File CRUD Tool** | Required | Implemented `manage_portfolio` which reads, adds, updates, and deletes stock positions in [portfolio.json](file:///company_data/portfolio.json). |
| **Prefab UI Integration** | Required | Implemented `show_investor_dashboard` compiling portfolio metrics and layout using Prefab components. |
| **Agent Prompt Enforcement** | Required | Tested with: *"Find the ownership details of Tata Sons, save those details in a local file, and display them on the research terminal."* |
| **Clean Workspace Code** | Highly Rated | Cleaned out all temporary compiler caches, generated a template `.env`, and configured `.gitignore`. |

---

## 2. Technical Function Design & Walkthrough

### 📡 Function 1: Real-Time Market API (`fetch_ticker_data`)
- **Action**: Direct HTTP request to the Yahoo Finance API.
- **Payload**: Parses the current market price, daily price change, and percent change.
- **Output**: Returns real-time market quotes with zero external key requirements.

### 💾 Function 2: Local Database CRUD (`manage_portfolio`)
- **Action**: Manages positions saved inside [portfolio.json](file:///company_data/portfolio.json).
- **CRUD Operations**:
  - `read`: Returns the array of current asset positions.
  - `add_or_update`: Adds new ticker positions or updates existing shares/prices.
  - `delete`: Removes the specified asset from the portfolio database.

### 🔍 Function 3: Deep Research Search API & Cache (`search_tavily`)
- **Action**: Connects to the Tavily Search API.
- **Caching (CRUD)**:
  - **Create / Update**: Caches newly queried search results as JSON files (`research_{query}.json`).
  - **Read**: Automatically loads cached reports if the query has been run before, bypasses API calls.

### 📊 Function 4: Generative Prefab UI (`show_investor_dashboard`)
- **Action**: Declaratively builds a dashboard layout using FastMCP's Prefab UI elements.
- **Elements Used**: `Card`, `DataTable`, `Metric`, `Badge`, `Markdown`, `Separator`.

---

## 3. Demo Visual Assets

We have recorded and verified multiple video demonstrations showing the full user flow (UI toggling, asset additions, interactive Plotly charts, and live search queries). 

These are located in the main conversation artifact folder:
- **Comprehensive Walkthrough (MP4)**: `streamlit_full_demo_1782672171054.mp4` (~1.5 mins)
- **Tavily AI Search Demo (MP4)**: `tavily_working_demo_1782672918667.mp4` (~40 secs)
- **Developer Prefab UI Demo (MP4)**: `prefab_ui_saved_demo_1782670919394.mp4`
