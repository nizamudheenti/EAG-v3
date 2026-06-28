import os
import json
import urllib.parse
import requests
from dotenv import load_dotenv
load_dotenv()
from fastmcp import FastMCP
from prefab_ui import PrefabApp
from prefab_ui.components import (
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    DataTable,
    DataTableColumn,
    Heading,
    Text,
    Row,
    Column,
    Separator,
    Badge,
    Markdown,
    Metric
)

# Initialize FastMCP Server
mcp = FastMCP("Investor Research Terminal")

# Data directory path
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "company_data")
os.makedirs(DATA_DIR, exist_ok=True)
PORTFOLIO_PATH = os.path.join(DATA_DIR, "portfolio.json")

# Helper to initialize portfolio file
if not os.path.exists(PORTFOLIO_PATH):
    with open(PORTFOLIO_PATH, "w", encoding="utf-8") as f:
        json.dump({"holdings": []}, f)

@mcp.tool()
def fetch_ticker_data(ticker: str) -> dict:
    """
    Fetch real-time stock price and quote details from Yahoo Finance.
    
    Args:
        ticker: The stock ticker symbol (e.g. 'AAPL', 'MSFT', 'TCS.NS').
    """
    ticker_clean = ticker.upper().strip()
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_clean}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()
        
        result_list = data.get("chart", {}).get("result", [])
        if not result_list:
            return {"success": False, "message": f"No ticker data found for '{ticker_clean}'."}
            
        meta = result_list[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        prev_close = meta.get("previousClose")
        
        if price is None:
            return {"success": False, "message": f"Price data missing for '{ticker_clean}'."}
            
        if prev_close is None:
            prev_close = price
            
        change = price - prev_close
        change_pct = (change / prev_close) * 100 if prev_close else 0.0
        
        return {
            "success": True,
            "ticker": ticker_clean,
            "price": price,
            "previous_close": prev_close,
            "change": change,
            "change_pct": change_pct,
            "currency": meta.get("currency", "USD"),
            "exchange": meta.get("exchangeName", "N/A"),
            "full_name": meta.get("symbol", ticker_clean)
        }
    except Exception as e:
        return {"success": False, "message": f"Error querying Yahoo Finance: {str(e)}"}

@mcp.tool()
def manage_portfolio(action: str, ticker: str = None, shares: float = 0.0, avg_price: float = 0.0) -> dict:
    """
    Perform CRUD operations on the local stock portfolio file.
    
    Args:
        action: The operation to perform ('read', 'add_or_update', 'delete').
        ticker: Stock ticker symbol (required for 'add_or_update' / 'delete').
        shares: Number of shares owned (required for 'add_or_update').
        avg_price: Average purchase price per share (required for 'add_or_update').
    """
    try:
        # Load current portfolio
        with open(PORTFOLIO_PATH, "r", encoding="utf-8") as f:
            portfolio = json.load(f)
            
        holdings = portfolio.get("holdings", [])
        
        if action == "read":
            return {"success": True, "holdings": holdings}
            
        elif action == "add_or_update":
            if not ticker:
                return {"success": False, "message": "Ticker symbol is required to add or update holdings."}
            if shares <= 0:
                return {"success": False, "message": "Shares must be greater than zero."}
            if avg_price <= 0:
                return {"success": False, "message": "Average price must be greater than zero."}
                
            ticker_clean = ticker.upper().strip()
            
            # Check if ticker already exists in holdings
            updated = False
            for holding in holdings:
                if holding["ticker"] == ticker_clean:
                    holding["shares"] = shares
                    holding["avg_price"] = avg_price
                    updated = True
                    break
                    
            if not updated:
                holdings.append({
                    "ticker": ticker_clean,
                    "shares": shares,
                    "avg_price": avg_price
                })
                
            portfolio["holdings"] = holdings
            with open(PORTFOLIO_PATH, "w", encoding="utf-8") as f:
                json.dump(portfolio, f, indent=2)
                
            action_desc = "updated" if updated else "added"
            return {"success": True, "message": f"Successfully {action_desc} {shares} shares of {ticker_clean} at average price ${avg_price:,.2f}."}
            
        elif action == "delete":
            if not ticker:
                return {"success": False, "message": "Ticker symbol is required for delete action."}
                
            ticker_clean = ticker.upper().strip()
            initial_len = len(holdings)
            holdings = [h for h in holdings if h["ticker"] != ticker_clean]
            
            if len(holdings) == initial_len:
                return {"success": False, "message": f"Ticker '{ticker_clean}' not found in portfolio holdings."}
                
            portfolio["holdings"] = holdings
            with open(PORTFOLIO_PATH, "w", encoding="utf-8") as f:
                json.dump(portfolio, f, indent=2)
                
            return {"success": True, "message": f"Successfully deleted {ticker_clean} from portfolio holdings."}
            
        else:
            return {"success": False, "message": f"Invalid action '{action}'. Use 'read', 'add_or_update', or 'delete'."}
            
    except Exception as e:
        return {"success": False, "message": f"Portfolio file operation error: {str(e)}"}

@mcp.tool(app=True)
def show_investor_dashboard() -> PrefabApp:
    """
    Renders an interactive Prefab UI dashboard showing the stock portfolio overview,
    real-time valuations, cost baselines, and unrealized gains/losses.
    """
    try:
        with open(PORTFOLIO_PATH, "r", encoding="utf-8") as f:
            portfolio = json.load(f)
        holdings = portfolio.get("holdings", [])
    except Exception:
        holdings = []
        
    rows_data = []
    total_cost = 0.0
    total_value = 0.0
    
    # Process each holding with real-time price lookup
    for holding in holdings:
        ticker = holding["ticker"]
        shares = holding["shares"]
        avg_price = holding["avg_price"]
        cost_basis = shares * avg_price
        
        # Live fetch from Yahoo Finance
        market_res = fetch_ticker_data(ticker)
        current_price = avg_price
        price_change_desc = "N/A"
        
        if market_res.get("success"):
            current_price = market_res["price"]
            daily_change_pct = market_res["change_pct"]
            price_change_desc = f"{daily_change_pct:+.2f}%"
            
        current_value = shares * current_price
        holding_return = current_value - cost_basis
        holding_return_pct = (holding_return / cost_basis) * 100 if cost_basis else 0.0
        
        total_cost += cost_basis
        total_value += current_value
        
        rows_data.append({
            "ticker": ticker,
            "shares": f"{shares:,.2f}",
            "avg_price": f"${avg_price:,.2f}",
            "current_price": f"${current_price:,.2f}",
            "daily_change": price_change_desc,
            "cost_basis": f"${cost_basis:,.2f}",
            "current_value": f"${current_value:,.2f}",
            "net_return": f"${holding_return:+,.2f}",
            "return_pct": f"{holding_return_pct:+.2f}%"
        })
        
    net_return = total_value - total_cost
    net_return_pct = (net_return / total_cost) * 100 if total_cost else 0.0
    
    # Visual components
    ui_elements = []
    
    # Header Section
    ui_elements.append(
        Row(
            children=[
                Heading(content="AI Investor Research Terminal", level=1),
                Badge(label="Live Portfolio Valuations", css_class="bg-emerald-500 text-white ml-3 self-center")
            ],
            css_class="mb-2"
        )
    )
    ui_elements.append(Text(content="This terminal displays your financial holdings and aggregates real-time performance tracking using the Yahoo Finance API.", css_class="text-muted-foreground text-sm mb-6"))
    ui_elements.append(Separator(css_class="mb-6"))
    
    # Financial metrics row
    trend_val = "up" if net_return >= 0 else "down"
    sentiment_val = "positive" if net_return >= 0 else "negative"
    
    metrics_row = Row(
        children=[
            Metric(
                label="Total Valuation",
                value=f"${total_value:,.2f}",
                description="Current portfolio value",
                css_class="flex-1"
            ),
            Metric(
                label="Total Invested Capital",
                value=f"${total_cost:,.2f}",
                description="Purchase cost baseline",
                css_class="flex-1"
            ),
            Metric(
                label="Unrealized Returns",
                value=f"${net_return:+,.2f}",
                description="Net gains / losses",
                delta=f"{net_return_pct:+.2f}%",
                trend=trend_val,
                trend_sentiment=sentiment_val,
                css_class="flex-1"
            )
        ],
        css_class="flex gap-4 w-full mb-8"
    )
    ui_elements.append(metrics_row)
    ui_elements.append(Separator(css_class="mb-6"))
    
    # Portfolio DataTable Section
    ui_elements.append(Heading(content="Active Asset Allocation", level=3, css_class="text-lg font-semibold mb-3"))
    
    if holdings:
        ui_elements.append(
            DataTable(
                columns=[
                    DataTableColumn(key="ticker", header="Ticker", sortable=True),
                    DataTableColumn(key="shares", header="Shares"),
                    DataTableColumn(key="avg_price", header="Avg Price"),
                    DataTableColumn(key="current_price", header="Current Price"),
                    DataTableColumn(key="daily_change", header="Daily Change"),
                    DataTableColumn(key="cost_basis", header="Cost Basis"),
                    DataTableColumn(key="current_value", header="Current Value"),
                    DataTableColumn(key="net_return", header="Gains/Loss"),
                    DataTableColumn(key="return_pct", header="Return %", sortable=True)
                ],
                rows=rows_data,
                paginated=False
            )
        )
    else:
        ui_elements.append(
            Card(
                children=[
                    CardContent(
                        children=[
                            Text(content="Your portfolio is currently empty. Ask the agent to add holdings to get started!", css_class="text-muted-foreground text-center py-6")
                        ]
                    )
                ],
                css_class="border-dashed border-2 border-slate-700 bg-transparent"
            )
        )
        
    ui_elements.append(Separator(css_class="my-6"))
    
    # Watchlist & Help Guide
    guide_markdown = """
### Quick Guide: Managing Portfolio Holdings
You can instruct the AI assistant to perform CRUD operations on your local portfolio database:
*   **To Add/Update Assets**: *"Add 10 shares of AAPL at average price 180.50"*
*   **To Remove Assets**: *"Remove MSFT from my holdings"*
*   **To Fetch Live Markets**: *"What is the current stock price of TCS.NS?"*
    """
    ui_elements.append(Markdown(content=guide_markdown))
    
    root_view = Card(
        children=[
            CardContent(
                children=ui_elements,
                css_class="p-6"
            )
        ],
        css_class="max-w-5xl mx-auto shadow-xl rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur-md"
    )
    
    return PrefabApp(
        title="AI Investor Terminal",
        view=root_view
    )

@mcp.tool()
def search_tavily(query: str, api_key: str = None) -> dict:
    """
    Search the internet using Tavily Search API for deep financial analysis,
    analyst consensus, or stock news. Caches results locally.
    
    Args:
        query: Search query (e.g. 'AAPL stock analyst price target 2026').
        api_key: Optional Tavily API Key. If not provided, reads from environment TAVILY_API_KEY.
    """
    import re
    # Create safe filename
    query_slug = re.sub(r'[^a-zA-Z0-9]', '_', query.lower().strip())
    query_slug = query_slug[:50]
    filename = f"research_{query_slug}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    # Check cache (CRUD: Read)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            cached_data["cached"] = True
            return cached_data
        except Exception:
            pass
            
    # Resolve API Key
    resolved_key = api_key or os.environ.get("TAVILY_API_KEY")
    if not resolved_key:
        return {"success": False, "message": "Tavily API Key is missing. Please provide it in the sidebar or set TAVILY_API_KEY in environment."}
    resolved_key = resolved_key.strip("'\"")
        
    try:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": resolved_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": True
        }
        res = requests.post(url, json=payload, timeout=15)
        res.raise_for_status()
        data = res.json()
        
        result = {
            "success": True,
            "query": query,
            "answer": data.get("answer", "No synthesized answer available."),
            "results": data.get("results", []),
            "cached": False
        }
        
        # Save to local cache (CRUD: Create/Update)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
            
        return result
    except Exception as e:
        return {"success": False, "message": f"Tavily Search API Error: {str(e)}"}

if __name__ == "__main__":
    mcp.run()
