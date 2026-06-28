import streamlit as st
import pandas as pd
import plotly.express as px
import requests
import json
import os
from dotenv import load_dotenv
load_dotenv()
import server  # Import the MCP server module directly
import importlib
importlib.reload(server)

# 1. Page Configuration
st.set_page_config(
    page_title="AI Research Terminal",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 2. Theme Toggle State
if "theme" not in st.session_state:
    st.session_state.theme = "dark"

def toggle_theme():
    st.session_state.theme = "light" if st.session_state.theme == "dark" else "dark"

IS_DARK = st.session_state.theme == "dark"

# 3. Inject CSS Design System
CSS_THEME = f"""
<style>
/* Theme Variables */
:root {{
    --bg: {"#09090b" if IS_DARK else "#ffffff"};
    --bg-subtle: {"#0e0e11" if IS_DARK else "#f9fafb"};
    --card: {"#111116" if IS_DARK else "#ffffff"};
    --card-hover: {"#181822" if IS_DARK else "#f4f4f5"};
    --border: {"#22222d" if IS_DARK else "#e4e4e7"};
    --border-subtle: {"#191924" if IS_DARK else "#f0f0f2"};
    --text: {"#fafafa" if IS_DARK else "#09090b"};
    --text-muted: {"#888896" if IS_DARK else "#71717a"};
    --text-dim: {"#52525b" if IS_DARK else "#a1a1aa"};
    --accent: {"#10b981" if IS_DARK else "#059669"};
    --accent-muted: {"#059669" if IS_DARK else "#047857"};
    --green: {"#10b981" if IS_DARK else "#16a34a"};
    --green-muted: {"rgba(16,185,129,0.12)" if IS_DARK else "rgba(22,163,74,0.08)"};
    --red: {"#ef4444" if IS_DARK else "#dc2626"};
    --red-muted: {"rgba(239,68,68,0.12)" if IS_DARK else "rgba(220,38,38,0.08)"};
    --shadow: {"none" if IS_DARK else "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)"};
    --radius: 12px;
}}

/* Hide Streamlit Chrome Header/Footer */
header[data-testid="stHeader"], footer, [data-testid="stToolbar"], [data-testid="stDecoration"] {{
    display: none !important;
}}

/* App Container */
html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"], .main, .block-container, section[data-testid="stMain"] {{
    background-color: var(--bg) !important;
    color: var(--text) !important;
    font-family: 'DM Sans', -apple-system, sans-serif !important;
}}

.block-container {{
    padding: 2.5rem 3rem !important;
    max-width: 1400px !important;
}}

/* Metric Cards */
.metric-row {{
    display: flex;
    gap: 1.25rem;
    width: 100%;
    margin-bottom: 1.5rem;
}}

.metric-card {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    box-shadow: var(--shadow);
    flex: 1;
    transition: transform 0.2s, border-color 0.2s;
}}

.metric-card:hover {{
    border-color: var(--text-muted);
    transform: translateY(-2px);
}}

.metric-label {{
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}}

.metric-value {{
    font-size: 1.85rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.03em;
    margin-top: 0.25rem;
}}

.metric-delta {{
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 0.4rem;
    padding: 3px 8px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
}}

.delta-up {{
    color: var(--green);
    background: var(--green-muted);
}}

.delta-down {{
    color: var(--red);
    background: var(--red-muted);
}}

/* Data Table Custom Styling */
.data-table-container {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow);
}}

.data-table {{
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.825rem;
}}

.data-table th {{
    text-align: left;
    padding: 0.75rem 0.9rem;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
}}

.data-table td {{
    padding: 0.75rem 0.9rem;
    color: var(--text);
    border-bottom: 1px solid var(--border-subtle);
}}

.data-table tr:hover td {{
    background-color: var(--bg-subtle);
}}

.data-table tr:last-child td {{
    border-bottom: none;
}}

/* Status Badges */
.badge {{
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}}

.badge-green {{
    color: var(--green);
    background: var(--green-muted);
}}

.badge-red {{
    color: var(--red);
    background: var(--red-muted);
}}

.badge-gray {{
    color: var(--text-muted);
    background: var(--border);
}}

.badge-blue {{
    color: var(--text);
    background: rgba(37,99,235,0.15);
    border: 1px solid rgba(37,99,235,0.3);
}}

/* Chart Container */
.chart-wrap {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    box-shadow: var(--shadow);
    margin-bottom: 2rem;
}}

.chart-title-bar {{
    margin-bottom: 1rem;
}}

.chart-title {{
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
}}

.chart-subtitle {{
    font-size: 0.74rem;
    color: var(--text-dim);
}}

/* Custom Brand Header */
.brand-container {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 1rem;
    margin-bottom: 2rem;
}}

.brand-title {{
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
}}

.brand-dot {{
    width: 10px;
    height: 10px;
    background-color: var(--accent);
    border-radius: 50%;
}}

/* Sidebar Custom Styling */
section[data-testid="stSidebar"] {{
    background-color: var(--bg-subtle) !important;
    border-right: 1px solid var(--border) !important;
}}

section[data-testid="stSidebar"] .block-container {{
    padding: 1.5rem !important;
}}

/* Tabs styling */
button[data-baseweb="tab"] {{
    background: transparent !important;
    color: var(--text-muted) !important;
    font-size: 0.835rem !important;
    font-weight: 500 !important;
    padding: 0.55rem 1rem !important;
    border: 1px solid transparent !important;
    border-radius: 7px !important;
}}
button[data-baseweb="tab"][aria-selected="true"] {{
    color: var(--text) !important;
    background: var(--card) !important;
    border-color: var(--border) !important;
}}
[data-baseweb="tab-highlight"], [data-baseweb="tab-border"] {{
    display: none !important;
}}
[data-baseweb="tab-list"] {{
    gap: 4px !important;
    background: var(--bg-subtle) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    padding: 3px;
    margin-bottom: 1.5rem;
}}
</style>
"""
st.markdown(CSS_THEME, unsafe_allow_html=True)

# 4. Metric Card rendering helper
def render_metric_card(label, value, delta=None, delta_type="up", desc=""):
    delta_html = ""
    if delta:
        cls = f"delta-{delta_type}"
        arrow = "↑" if delta_type == "up" else ("↓" if delta_type == "down" else "→")
        delta_html = f'<div class="metric-delta {cls}">{arrow} {delta}</div>'
        
    st.markdown(f"""<div class="metric-card">
<div class="metric-label">{label}</div>
<div class="metric-value">{value}</div>
{delta_html}
<div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.3rem;">{desc}</div>
</div>""", unsafe_allow_html=True)

# 5. Live Ticker Search Helper
def fetch_chart_data(ticker):
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker.upper().strip()}?range=1mo&interval=1d"
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        timestamps = result[0].get("timestamp", [])
        closes = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
        
        # Filter out null values
        valid_data = [(pd.to_datetime(t, unit="s"), c) for t, c in zip(timestamps, closes) if c is not None]
        if not valid_data:
            return None
            
        df = pd.DataFrame(valid_data, columns=["Date", "Close"])
        return df
    except Exception:
        return None

# 6. Build Brand Header
st.markdown(f"""
<div class="brand-container">
    <div class="brand-title">
        <div class="brand-dot"></div>
        AI Research Terminal
    </div>
    <div style="font-size: 0.8rem; color: var(--text-muted);">
        Market Live Feed • Mode: {"Dark" if IS_DARK else "Light"}
    </div>
</div>
""", unsafe_allow_html=True)

# Header Theme Toggle button
col_header_left, col_header_right = st.columns([10, 2])
with col_header_right:
    theme_btn_label = "☀️ Switch to Light" if IS_DARK else "🌙 Switch to Dark"
    st.button(theme_btn_label, on_click=toggle_theme, use_container_width=True)

# 7. Sidebar Panel (CRUD Actions)
with st.sidebar:
    st.markdown('<div class="brand-title" style="font-size: 1.15rem; margin-bottom: 1.25rem;">⚡ Portfolio Actions</div>', unsafe_allow_html=True)
    
    # Action tab selection
    crud_mode = st.radio("Select Operation", ["View Stats", "Add / Update Holding", "Delete Holding"])
    
    # Fetch current holdings
    port_res = server.manage_portfolio("read")
    current_holdings = port_res.get("holdings", [])
    
    if crud_mode == "Add / Update Holding":
        st.markdown("<hr style='margin: 1rem 0; border-color: var(--border);'/>", unsafe_allow_html=True)
        st.subheader("Manage Positions")
        with st.form("add_holding_form"):
            form_ticker = st.text_input("Ticker Symbol", placeholder="e.g. AAPL, TCS.NS").upper().strip()
            form_shares = st.number_input("Shares Owned", min_value=0.0, step=1.0)
            form_price = st.number_input("Average Purchase Price ($ / INR)", min_value=0.0, step=0.1)
            submitted = st.form_submit_button("Save to Portfolio", use_container_width=True)
            
            if submitted:
                if not form_ticker:
                    st.error("Please enter a ticker symbol.")
                elif form_shares <= 0:
                    st.error("Shares must be greater than 0.")
                elif form_price <= 0:
                    st.error("Price must be greater than 0.")
                else:
                    save_res = server.manage_portfolio("add_or_update", form_ticker, form_shares, form_price)
                    if save_res.get("success"):
                        st.success(save_res.get("message"))
                        st.rerun()
                    else:
                        st.error(save_res.get("message"))
                        
    elif crud_mode == "Delete Holding":
        st.markdown("<hr style='margin: 1rem 0; border-color: var(--border);'/>", unsafe_allow_html=True)
        st.subheader("Remove Position")
        if current_holdings:
            ticker_list = [h["ticker"] for h in current_holdings]
            ticker_to_delete = st.selectbox("Select Asset to Remove", ticker_list)
            if st.button("Delete Holding", type="primary", use_container_width=True):
                del_res = server.manage_portfolio("delete", ticker_to_delete)
                if del_res.get("success"):
                    st.success(del_res.get("message"))
                    st.rerun()
                else:
                    st.error(del_res.get("message"))
        else:
            st.info("No active holdings to delete.")
            
    else:  # View Stats Info
        st.markdown("<hr style='margin: 1rem 0; border-color: var(--border);'/>", unsafe_allow_html=True)
        st.markdown("### Terminal Diagnostics")
        st.write(f"**Portfolio JSON Path**:\n`{server.PORTFOLIO_PATH}`")
        st.write(f"**Holdings Tracked**: `{len(current_holdings)}` assets")
        st.write("**GCP Server Host**: `localhost:8000`")
        
    st.markdown("<hr style='margin: 1rem 0; border-color: var(--border);'/>", unsafe_allow_html=True)
    st.markdown("### 🔍 Tavily Search Config")
    tavily_key = st.text_input("Tavily API Key", type="password", value=st.session_state.get("tavily_key", ""))
    st.session_state.tavily_key = tavily_key

# 8. Setup Tabs
tab_portfolio, tab_research = st.tabs(["📊 Portfolio Allocation", "🔍 AI Deep Research (Tavily)"])

# ==================== PORTFOLIO ALLOCATION TAB ====================
with tab_portfolio:
    total_cost = 0.0
    total_val = 0.0
    table_rows_html = ""
    holdings_data_list = []
    
    for holding in current_holdings:
        ticker = holding["ticker"]
        shares = holding["shares"]
        avg_price = holding["avg_price"]
        cost_basis = shares * avg_price
        
        # Fetch live price
        market_res = server.fetch_ticker_data(ticker)
        curr_price = avg_price
        daily_change_desc = "0.00%"
        badge_cls = "badge-gray"
        
        if market_res.get("success"):
            curr_price = market_res["price"]
            chg_pct = market_res["change_pct"]
            daily_change_desc = f"{chg_pct:+.2f}%"
            badge_cls = "badge-green" if chg_pct >= 0 else "badge-red"
            
        curr_val = shares * curr_price
        ret_val = curr_val - cost_basis
        ret_pct = (ret_val / cost_basis) * 100 if cost_basis else 0.0
        
        total_cost += cost_basis
        total_val += curr_val
        
        # Save processed dict for plotting and tables
        holdings_data_list.append({
            "Ticker": ticker,
            "Shares": shares,
            "Avg Price": avg_price,
            "Current Price": curr_price,
            "Value": curr_val
        })
        
        # Accumulate rows for HTML table (Zero leading whitespace to avoid markdown parsing bugs)
        ret_cls = "color: var(--green);" if ret_val >= 0 else "color: var(--red);"
        table_rows_html += f"""<tr>
<td><b>{ticker}</b></td>
<td>{shares:,.2f}</td>
<td>${avg_price:,.2f}</td>
<td>${curr_price:,.2f}</td>
<td><span class="badge {badge_cls}">{daily_change_desc}</span></td>
<td>${cost_basis:,.2f}</td>
<td>${curr_val:,.2f}</td>
<td style="{ret_cls} font-weight: 600;">${ret_val:+,.2f}</td>
<td style="{ret_cls} font-weight: 600;">{ret_pct:+.2f}%</td>
</tr>"""
        
    # Compute portfolio returns
    net_return = total_val - total_cost
    net_return_pct = (net_return / total_cost) * 100 if total_cost else 0.0
    
    # Render 3 KPI Metric Cards in columns
    st.markdown('<div class="metric-row">', unsafe_allow_html=True)
    col1, col2, col3 = st.columns(3)
    with col1:
        render_metric_card("Total Valuation", f"${total_val:,.2f}", desc="Current total market value of all positions")
    with col2:
        render_metric_card("Total Invested", f"${total_cost:,.2f}", desc="Cost baseline of accumulated holdings")
    with col3:
        dt = "up" if net_return >= 0 else "down"
        render_metric_card(
            "Net Portfolio Returns",
            f"${net_return:+,.2f}",
            delta=f"{net_return_pct:+.2f}%",
            delta_type=dt,
            desc="Total unrealized gains/losses since purchase"
        )
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Render Assets Table
    st.markdown('<div class="data-table-container">', unsafe_allow_html=True)
    st.markdown('<div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem;">Active Asset Allocation Table</div>', unsafe_allow_html=True)
    if current_holdings:
        st.markdown(f"""<table class="data-table">
<thead>
<tr>
<th>Ticker</th>
<th>Shares</th>
<th>Avg Buy Price</th>
<th>Current Price</th>
<th>Daily Change</th>
<th>Cost Basis</th>
<th>Current Value</th>
<th>Unrealized P&L</th>
<th>Return %</th>
</tr>
</thead>
<tbody>
{table_rows_html}
</tbody>
</table>""", unsafe_allow_html=True)
    else:
        st.markdown("<div style='text-align: center; color: var(--text-muted); padding: 2rem;'>Your portfolio is currently empty. Use the sidebar form to add assets!</div>", unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Real-Time Stock Analytics & Interactive Charting
    if current_holdings:
        col_chart_left, col_chart_right = st.columns([8, 4])
        
        with col_chart_right:
            st.markdown('<div class="chart-wrap" style="height: 100%;">', unsafe_allow_html=True)
            st.markdown('<div class="chart-title">Select Ticker Asset Analysis</div>', unsafe_allow_html=True)
            st.markdown('<div class="chart-subtitle" style="margin-bottom: 1rem;">View detailed stock chart & history</div>', unsafe_allow_html=True)
            ticker_list = [h["ticker"] for h in current_holdings]
            selected_ticker = st.selectbox("Asset Ticker", ticker_list)
            
            # Load details
            m_data = server.fetch_ticker_data(selected_ticker)
            if m_data.get("success"):
                st.markdown(f"""<div style="background: var(--bg-subtle); border-radius: 8px; padding: 1rem; border: 1px solid var(--border); margin-top: 1rem;">
<div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Current Price Quote</div>
<div style="font-size: 1.6rem; font-weight: 700; margin-top: 0.2rem;">${m_data["price"]:,.2f} {m_data["currency"]}</div>
<div style="font-size: 0.8rem; margin-top: 0.4rem;">
Daily Change: <span class="badge {'badge-green' if m_data['change'] >= 0 else 'badge-red'}">{m_data['change_pct']:+.2f}%</span>
</div>
<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.8rem;">
Exchange: <b>{m_data["exchange"]}</b><br/>
Previous Close: <b>${m_data["previous_close"]:,.2f}</b>
</div>
</div>""", unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            
        with col_chart_left:
            st.markdown('<div class="chart-wrap">', unsafe_allow_html=True)
            st.markdown(f'<div class="chart-title">Historical Price Chart: {selected_ticker}</div>', unsafe_allow_html=True)
            st.markdown('<div class="chart-subtitle">1-Month Historical Trend (Daily Closing Price)</div>', unsafe_allow_html=True)
            
            chart_df = fetch_chart_data(selected_ticker)
            if chart_df is not None:
                # Styled Line Chart
                fig = px.line(
                    chart_df,
                    x="Date",
                    y="Close",
                    markers=True
                )
                
                # Apply strict layout themes
                font_color = "#fafafa" if IS_DARK else "#09090b"
                grid_color = "rgba(255,255,255,0.06)" if IS_DARK else "rgba(0,0,0,0.04)"
                
                fig.update_traces(
                    line_color="#10b981",
                    line_width=2.5,
                    marker=dict(size=6, color="#059669")
                )
                
                fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    font=dict(family="DM Sans, sans-serif", color=font_color, size=11),
                    margin=dict(l=0, r=0, t=10, b=0),
                    height=300,
                    xaxis=dict(
                        gridcolor=grid_color,
                        zerolinecolor=grid_color,
                        title="",
                        tickfont=dict(size=9)
                    ),
                    yaxis=dict(
                        gridcolor=grid_color,
                        zerolinecolor=grid_color,
                        title="",
                        tickfont=dict(size=9)
                    ),
                )
                
                st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
            else:
                st.error("Unable to load chart history. Check internet connection or symbol accuracy.")
            st.markdown('</div>', unsafe_allow_html=True)
            
    st.markdown("<hr style='margin: 1.5rem 0; border-color: var(--border);'/>", unsafe_allow_html=True)
    
    # Watchlist & Help Guide
    guide_markdown = """
### Quick Guide: Managing Portfolio Holdings
You can instruct the AI assistant to perform CRUD operations on your local portfolio database:
*   **To Add/Update Assets**: *"Add 10 shares of AAPL at average price 180.50"*
*   **To Remove Assets**: *"Remove MSFT from my holdings"*
*   **To Fetch Live Markets**: *"What is the current stock price of TCS.NS?"*
    """
    st.markdown(guide_markdown)

# ==================== AI DEEP RESEARCH TAB ====================
with tab_research:
    st.markdown("""
    <div style="margin-bottom: 1.5rem;">
        <span class="badge badge-blue">New Feature</span>
        <h3 style="margin-top: 0.5rem; margin-bottom: 0.25rem;">AI Stock & News Synthesis</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0;">Perform advanced research searches powered by the Tavily Search Engine. Insights are cached in local JSON profiles.</p>
    </div>
    """, unsafe_allow_html=True)
    
    research_query = st.text_input("Deep Research Search Query", placeholder="e.g. AAPL stock dividend forecast 2026 or Sir Dorabji Tata Trust shareholding", help="Enter a search topic related to stocks, financial performance, or company holdings.")
    
    if st.button("Run Tavily Research ✦", type="primary"):
        if not research_query:
            st.error("Please enter a research query.")
        else:
            with st.spinner("Executing Tavily Deep Search (Advanced)..."):
                # Call search_tavily
                search_res = server.search_tavily(research_query, st.session_state.get("tavily_key"))
                
            if not search_res.get("success"):
                st.error(search_res.get("message"))
            else:
                st.balloons()
                
                # Display Cache Status
                cache_status = "Loaded from Local Storage (Cached)" if search_res.get("cached") else "Fetched live from Tavily AI Search"
                st.markdown(f'<span class="badge badge-blue" style="margin-bottom: 1rem;">{cache_status}</span>', unsafe_allow_html=True)
                
                # Display Synthesized Answer
                st.markdown(f"""<div class="chart-wrap" style="margin-bottom: 1.5rem;">
                    <div class="chart-title">🤖 AI Synthesized Market Synthesis</div>
                    <div style="font-size: 0.825rem; line-height: 1.6; color: var(--text); margin-top: 0.5rem; white-space: pre-line;">{search_res["answer"]}</div>
                </div>""", unsafe_allow_html=True)
                
                # Display Search Results Table
                results = search_res.get("results", [])
                if results:
                    st.markdown('<div class="data-table-container">', unsafe_allow_html=True)
                    st.markdown('<div class="chart-title" style="margin-bottom: 0.75rem;">Source Citations & Web Results</div>', unsafe_allow_html=True)
                    
                    rows_html = ""
                    for r in results:
                        score_desc = f"{int(r.get('score', 0)*100)}%" if r.get('score') else "N/A"
                        rows_html += f"""<tr>
                            <td><a href="{r['url']}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: none;">{r['title']}</a></td>
                            <td style="color: var(--text-muted); font-size: 0.75rem; max-width: 450px;">{r['content']}</td>
                            <td><span class="badge badge-gray">{score_desc}</span></td>
                        </tr>"""
                        
                    st.markdown(f"""<table class="data-table">
                        <thead>
                            <tr>
                                <th>Source Link</th>
                                <th>Content Excerpt</th>
                                <th>Relevance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows_html}
                        </tbody>
                    </table>""", unsafe_allow_html=True)
                    st.markdown('</div>', unsafe_allow_html=True)
                else:
                    st.info("No sources fetched for this query.")
