# AI Investor & Portfolio Research Terminal

An advanced Model Context Protocol (MCP) server and interactive Web Application designed to analyze stocks in real-time, track a local asset portfolio, and visualize performance metrics.

⚡ Powered by **FastMCP**, **Streamlit**, and **Yahoo Finance**.

---

## Key Features

1. **Live Stock Feed (Internet API)**: Fetches real-time price quotes, currency, and daily change statistics directly from Yahoo Finance.
2. **Local Portfolio Tracker (JSON CRUD)**: Performs read, add, update, and delete actions on a local stock position database (`portfolio.json`).
3. **Sleek Streamlit Dashboard (Web UI)**:
   - **Financial Metric Cards**: Real-time KPI summaries displaying Total Valuation, Cost Baseline, and Net Unrealized P&L.
   - **Asset Allocation Table**: Interactive HTML table displaying holdings details, purchase baselines, live pricing updates, and gains.
   - **Plotly Stock Charting**: Renders interactive 1-Month historical price trend lines for any asset selected from the portfolio.
   - **Light/Dark Toggle**: Premium color themes (custom dark/light mode toggle).
4. **FastMCP Prefab UI**: Implements a declarative generative dashboard rendered within compatible MCP clients using Prefab components.

---

## File Architecture

```text
mcp-company-server/
│
├── .venv/                   # Python virtual environment (auto-created)
├── company_data/            # Database folder
│   └── portfolio.json       # Holds saved portfolio holdings
│
├── app.py                   # Streamlit Frontend Web App
├── server.py                # FastMCP Backend Server
└── requirements.txt         # Frozen package dependencies
```

---

## Installation & Setup

Ensure you have **Python 3.10+** installed, then follow these steps:

### 1. Initialize Virtual Environment
```powershell
# Navigate into the project folder
cd mcp-company-server

# Create virtual environment
python -m venv .venv
```

### 2. Install Dependencies
```powershell
# Install packages inside virtual environment
.venv\Scripts\pip.exe install -r requirements.txt
```

---

## Running the Application

### 1. Start the Streamlit Web Dashboard
Run the following command to boot up the interactive Web Dashboard in your browser:
```powershell
.venv\Scripts\streamlit.exe run app.py
```
*Access URL: **`http://localhost:8501`***

### 2. Start the FastMCP Backend Dev UI
To preview the generative Prefab UI or debug the JSON-RPC traffic, launch the built-in Dev UI:
```powershell
# Starts MCP server on 8000 & Dev App UI on 8080
.venv\Scripts\fastmcp.exe dev apps server.py
```
*Access URL: **`http://localhost:8080`***

### 3. Run the MCP Server for Editor Clients (STDIO Mode)
To integrate the server directly with LLM code editors (like Cursor or Gemini IDE):
```powershell
.venv\Scripts\python.exe server.py
```

---

## MCP Tools Reference

The server exposes three major tools to connecting AI agents:

| Tool Name | Type | Arguments | Description |
| :--- | :--- | :--- | :--- |
| `fetch_ticker_data` | Standard Tool | `ticker: str` | Queries the Yahoo Finance endpoint for real-time stock price quotes. |
| `manage_portfolio` | Standard Tool | `action: str, ticker: str, shares: float, avg_price: float` | Manages holdings inside `portfolio.json` (supports `read`, `add_or_update`, and `delete`). |
| `show_investor_dashboard` | App Tool (`app=True`) | None | Rebuilds and returns the Prefab dashboard component tree. |

---

## Example Queries for AI Chat Agents

If connecting this server to an editor agent, try the following prompts:
- *"Check the current price of TCS.NS."*
- *"Add 15 shares of MSFT at average buy price 420.50 to my portfolio holdings."*
- *"Remove AAPL from my holdings and show me the updated dashboard."*
- *"Display my overall portfolio valuation on the dashboard."*
