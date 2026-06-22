export interface PageGuideContent {
  title: string;
  beginner: {
    headline: string;
    paragraphs: string[];
    lookFor: string[];
  };
  professional: {
    headline: string;
    paragraphs: string[];
    terms: { term: string; definition: string }[];
  };
}

export const PAGE_GUIDES: Record<string, PageGuideContent> = {
  market: {
    title: "Market Overview",
    beginner: {
      headline: "Real market quotes for hundreds of companies",
      paragraphs: [
        "Prices, volume, market cap, and daily change % are pulled from live market data for NASDAQ stocks, and simulated for BSE stocks. Charts use real intraday and historical OHLC data.",
        "The matching engine now scales its behavior with real market data — order book depth, liquidity size, and market maker spreads all adjust to each stock's actual trading volume. Switch between NASDAQ and BSE using the region toggle in the sidebar to see different markets.",
      ],
      lookFor: [
        "Exchange LIVE badge — confirms which market you're viewing",
        "Region toggle — switch between NASDAQ (USD) and BSE (INR)",
        "Top gainer/loser cards — sorted from live change %",
        "Click any row for a real price chart and stats",
      ],
    },
    professional: {
      headline: "Live quote montage (Yahoo Finance / NASDAQ) or simulated BSE data",
      paragraphs: [
        "GET /api/stocks returns symbols for the active region, refreshed every 30s. NASDAQ uses Yahoo Finance quote API; BSE uses simulated data with realistic INR pricing. History from Yahoo chart API (5m intraday, daily for longer periods). The matching engine scales order book depth, spread tightness, and trade frequency proportionally to each symbol's volume.",
      ],
      terms: [
        { term: "Last sale", definition: "regularMarketPrice from live feed (NASDAQ) or simulated price (BSE)" },
        { term: "Change %", definition: "regularMarketChangePercent — vs previous close" },
        { term: "Region switch", definition: "POST /api/market/region changes the active dataset and re-initializes prices" },
      ],
    },
  },
  sectors: {
    title: "Sector Rotation Map",
    beginner: {
      headline: "See where money is flowing across the market",
      paragraphs: [
        "Each colored tile is a company. Tile size reflects market capitalization — bigger companies take more space. Color shows today's price change: green is up, red is down.",
        "Sectors are grouped in columns. Click a sector header to zoom in. Hover any stock for details and links to the order book.",
      ],
      lookFor: [
        "Technology column — usually the largest by market cap",
        "Breadth stats — how many stocks are advancing vs declining",
        "Cap-weighted return — where the big money moved today",
      ],
    },
    professional: {
      headline: "Cap-weighted sector treemap",
      paragraphs: [
        "Sector performance uses cap-weighted change (Σ change% × mktCap / Σ mktCap), not equal-weight averages. Treemap layout: sector column width ∝ sector market cap; stock tile height ∝ stock market cap within sector.",
      ],
      terms: [
        { term: "Sector rotation", definition: "Capital reallocation between sectors as macro conditions shift" },
        { term: "Market breadth", definition: "Ratio of advancing to declining issues; divergence from cap-weighted index signals narrow rallies" },
        { term: "Cap-weighted", definition: "Large-cap moves dominate; differs from equal-weight sector ETFs" },
      ],
    },
  },
  orderbook: {
    title: "Order Book",
    beginner: {
      headline: "See every buyer and seller waiting in line",
      paragraphs: [
        "The left side (green) shows bids — people waiting to buy at specific prices. The right side (red) shows asks — people waiting to sell. The exchange matches the highest bid with the lowest ask.",
        "If you see empty rows, liquidity is being seeded when you open a symbol. Submit an order from the Matching Engine page to watch the book change in real time.",
      ],
      lookFor: [
        "Best bid vs best ask — the spread",
        "Depth bars — thicker = more shares at that price",
        "Recent trades panel — proof that matching is happening",
      ],
    },
    professional: {
      headline: "Level-2 market depth (volume-scaled)",
      paragraphs: [
        "Book data comes from the C++ matching engine via getOrderBook(). Liquidity is seeded on first request with depth, quantity, and spread tightness scaled by real market volume from Yahoo Finance. WebSocket pushes book deltas at /api/ws.",
      ],
      terms: [
        { term: "Price-time priority", definition: "Best price first; FIFO within price level" },
        { term: "Cumulative depth", definition: "Integral of quantity from mid outward" },
        { term: "Spread", definition: "Best ask − best bid; proxy for immediacy cost" },
      ],
    },
  },
  pipeline: {
    title: "Matching Engine Pipeline",
    beginner: {
      headline: "Follow your order through the exchange",
      paragraphs: [
        "When you click Submit, your order does not go 'to Apple.' It traverses 9 production stages — gateway auth, risk checks, validation, queue, C++ matching, execution, ITCH broadcast, and UI update.",
        "Watch the architecture layers highlight, the protocol trace log fill with FIX/ITCH messages, and the deep dive panel explain each subsystem in detail.",
      ],
      lookFor: [
        "Protocol trace console — see FIX tags and ITCH message types as your order flows",
        "Latency waterfall — visual breakdown of where microseconds are spent",
        "Stage deep dive — subsystem, algorithm, and data structure per hop",
      ],
    },
    professional: {
      headline: "Order entry to execution trace",
      paragraphs: [
        "POST /api/orders → engine.addOrder() via stdin/stdout JSON IPC. Pipeline stages carry order-specific FIX/ITCH detail strings. Matching latUs is measured from the C++ engine; other stages use realistic µs distributions.",
        "Architecture layers map to: CLIENT → INGRESS → CONTROLS → QUEUE → CORE → POST-TRADE → FEED → UI. MPSC lock-free queue, price-time priority, ITCH 5.0 fanout.",
      ],
      terms: [
        { term: "MPSC queue", definition: "Multi-producer single-consumer lock-free ingress queue" },
        { term: "Price-time priority", definition: "Best price first; FIFO within price level via seq num" },
        { term: "ITCH 5.0", definition: "NASDAQ binary feed: A=add, E=execute, D=delete, U=replace" },
        { term: "FIX 35=8", definition: "Execution report message type" },
      ],
    },
  },
  control: {
    title: "Control Center",
    beginner: {
      headline: "Stress-test the market safely",
      paragraphs: [
        "Real exchanges face extreme events: flash crashes, bull runs, trading halts. This page lets you trigger those scenarios in a sandbox so you can see how the system responds.",
        "Use the AI explainer at the bottom to ask questions in plain English — powered by Groq, grounded in live market stats.",
      ],
      lookFor: [
        "PAUSE — halts all AI trader activity",
        "FLASH CRASH — cascading automated selling",
        "AI trader panel — who is providing liquidity",
      ],
    },
    professional: {
      headline: "Market simulation control plane",
      paragraphs: [
        "POST /api/market/control drives setMarketState(). Flash crash applies multiplicative price shocks across all symbols. AI traders resume via initAiTraders() timers.",
      ],
      terms: [
        { term: "LULD", definition: "Limit Up-Limit Down — not fully modeled here" },
        { term: "Reg SHO", definition: "Short sale restrictions — not modeled" },
      ],
    },
  },
  analytics: {
    title: "Engine Analytics",
    beginner: {
      headline: "Watch the matching engine breathe",
      paragraphs: [
        "Unlike the sidebar snapshot, this page tracks how the engine performs over time — throughput trends, latency drift, and order outcomes across the whole session.",
        "Session orders counts every order from you and the AI traders. Fill rate shows what percentage actually matched. The latency waterfall shows where microseconds are spent.",
      ],
      lookFor: [
        "Throughput chart — orders/s and trades/s over the last 60 seconds",
        "Order outcomes bar — filled vs queued vs rejected",
        "Latency budget — gateway, queue, and matching as a stacked breakdown",
      ],
    },
    professional: {
      headline: "Engine observability dashboard",
      paragraphs: [
        "ordersPerSecond and tradesPerSecond are computed from C++ engine stat deltas (ordersReceived, tradesExecuted), not simulated. matchingUs comes from engine avgLatUs. Queue depth estimated as λ × (totalUs / 1000).",
      ],
      terms: [
        { term: "avgLatUs", definition: "Mean matching latency from C++ engine sumLatUs / ordersReceived" },
        { term: "Fill rate", definition: "(filled + partial) / ordersReceived for the session" },
        { term: "Queue depth", definition: "Estimated in-flight orders = throughput × processing time" },
      ],
    },
  },
  replay: {
    title: "Market Replay",
    beginner: {
      headline: "Biggest market moments — crashes, surges, and record events",
      paragraphs: [
        "Explore the most devastating crashes and most profitable surges in market history. Each region has its own set of iconic events — from the Dot-com bubble and COVID crash on NASDAQ to the Adani saga and Reliance Jio boom on BSE.",
        "Events are color-coded by type: CRASH (red), SURGE (green), VOLUME SPIKE (yellow), RECORD HIGH (blue), RECORD LOW (purple), and SECTOR SHIFT (cyan). Switch regions to see entirely different historical events.",
      ],
      lookFor: [
        "Event cards — impact magnitude with severity indicators",
        "Filter pills — narrow by event type (crash, surge, etc.)",
        "Live biggest movers — today's most volatile stocks",
        "Region switch — events change completely between NASDAQ and BSE",
      ],
    },
    professional: {
      headline: "Historical market events and live movers by region",
      paragraphs: [
        "Pre-scripted historical events per region with impact metrics, affected stocks, and severity ratings. Live biggest movers computed from current stock data sorted by |changePercent|. Events are cached per region and swap instantly on region change.",
      ],
      terms: [
        { term: "Flash Crash", definition: "Rapid, severe price decline followed by quick recovery — e.g., May 6, 2010" },
        { term: "Circuit Breaker", definition: "Exchange-imposed trading halt triggered by extreme price moves" },
        { term: "Sensex", definition: "BSE benchmark index tracking 30 largest Indian companies" },
      ],
    },
  },
  tape: {
    title: "Trade Tape",
    beginner: {
      headline: "Watch every trade as it happens across the market",
      paragraphs: [
        "The trade tape shows every executed trade flowing through the exchange — one line per fill, scrolling in real time. Each line shows the symbol, price, quantity, and whether the trade was a buy or sell.",
        "This is closest to what professional traders see on their Bloomberg terminals. The tape moves fast — look for patterns like green runs (bullish) or red clusters (bearish).",
      ],
      lookFor: [
        "Green rows = upticks — trades executed at rising prices",
        "Red rows = downticks — trades at falling prices",
        "Volume surges — clusters of larger trades signal big money moving",
        "The running leaderboard — which symbols are trading most frequently",
      ],
    },
    professional: {
      headline: "Real-time tick-level trade feed",
      paragraphs: [
        "Trade data updates via WebSocket push at /api/ws, aggregated on a running ticker. Volume leaderboard rank is recalculated every tick based on cumulative trade count per symbol. Volume bar chart renders last 20 ticks.",
      ],
      terms: [
        { term: "Tick", definition: "Each individual trade execution record" },
        { term: "Uptick / downtick", definition: "Trade price vs the preceding trade; uptick = price increased" },
        { term: "Tape reading", definition: "Classic market analysis by interpreting the speed, size, and sequence of trades" },
      ],
    },
  },
  traders: {
    title: "AI Traders",
    beginner: {
      headline: "See different trading strategies compete against each other",
      paragraphs: [
        "AI traders simulate four real-world trading styles: retail investors, market makers, momentum chasers, and panic sellers. Each has a distinct strategy and responds to market conditions differently.",
        "Market makers try to profit from the spread by posting both buy and sell orders. Momentum traders follow trends. Panic traders dump positions during volatility. Retail traders behave like everyday investors.",
      ],
      lookFor: [
        "Trader type badges — retail, market_maker, momentum, panic",
        "Pulse dots — green dot means actively trading",
        "Order flow — see what each trader is buying and selling in real time",
        "Market maker activity — they add liquidity to keep spreads tight",
      ],
    },
    professional: {
      headline: "Multi-strategy algorithmic trading simulation",
      paragraphs: [
        "Each AI trader type uses a distinct strategy function: market makers quote both sides of the book, momentum traders trend-follow, panic traders liquidate on volatility, retail traders behave stochastically. Trader state toggles via /api/market/control.",
      ],
      terms: [
        { term: "Market maker", definition: "Posts limit orders on both sides to capture the spread; adds liquidity" },
        { term: "Momentum trader", definition: "Buys rising symbols, sells falling ones; can amplify trends" },
        { term: "Panic trader", definition: "Liquidates positions during high volatility; simulates flash-crash selling" },
        { term: "Paper trading", definition: "Simulated trading with zero real money; all AI trades here are paper" },
      ],
    },
  },
  reports: {
    title: "Matching Engine Reports",
    beginner: {
      headline: "Your personal trade history — every order you've ever submitted",
      paragraphs: [
        "Every order you submit and every trade you execute is saved to your account. This page shows your complete history: which symbols you traded, at what prices, how many shares, and whether your orders were filled or are still open.",
        "Use the symbol filter to find specific trades. The summary cards at the top show your totals: number of orders, number of fills, total shares traded, and aggregate notional value.",
      ],
      lookFor: [
        "Summary cards — quick snapshot of your total activity",
        "Orders table — every submission with status (filled, partial, queued, rejected)",
        "Trades table — every executed fill with price and quantity",
        "Symbol filter — narrow down by stock ticker",
      ],
    },
    professional: {
      headline: "User-scoped order and trade query interface",
      paragraphs: [
        "GET /api/auth/orders and GET /api/auth/trades return rows filtered by userId from the session cookie. Data is persisted via Drizzle ORM to PostgreSQL. Queries support optional ?symbol= and ?limit= parameters. Results sorted by createdAt DESC.",
      ],
      terms: [
        { term: "Notional value", definition: "Total monetary value = price × quantity aggregated across all trades" },
        { term: "Fill status", definition: "filled = fully executed, partial = partially filled, queued = resting in book, rejected = failed validation" },
        { term: "Session-scoped", definition: "Data belongs to the authenticated user identified by the signed session cookie" },
      ],
    },
  },
  academy: {
    title: "Academy",
    beginner: {
      headline: "Start here if you've never traded before",
      paragraphs: [
        "The curriculum walks from 'what is a stock?' to 'how does a matching engine work?' in eight structured lessons. Each lesson connects to a real page in this simulator.",
        "Complete lessons at your own pace. Your progress is saved in this browser.",
      ],
      lookFor: [
        "Lesson 1 if you're completely new",
        "Lesson 4 before submitting your first order",
        "Lesson 8 if you work in finance",
      ],
    },
    professional: {
      headline: "Structured microstructure curriculum",
      paragraphs: [
        "Lessons 1–4 cover market mechanics for novices. 5–7 cover pipeline and market structure. Lesson 8 maps to Analytics latency breakdown.",
      ],
      terms: [],
    },
  },
  intelligence: {
    title: "Market Intelligence",
    beginner: {
      headline: "Real-time market data and AI-powered insights",
      paragraphs: [
        "Market Pulse shows sector performance and top movers (gainers, losers, most active) for your selected region. News Center pulls headlines from Finnhub's global feed. Daily Briefing uses Groq AI to generate a 10-point market summary. Earnings Center shows recent quarterly reports.",
        "Switch between NASDAQ and BSE using the region toggle in the sidebar to see data for different markets. All data is region-aware — BSE shows Indian stocks, NASDAQ shows US stocks.",
      ],
      lookFor: [
        "Sector cards — green means up, red means down for the day",
        "Region toggle in sidebar — changes all data to NASDAQ or BSE",
        "Daily Briefing tab — AI-generated market summary",
        "News Center — filter by category (general, forex, crypto, M&A, earnings, IPO)",
      ],
    },
    professional: {
      headline: "Multi-region intelligence platform with AI augmentation",
      paragraphs: [
        "Market movers use Yahoo Finance v8/chart API for NASDAQ (top 30 US stocks by market cap) and BSE (top 30 Indian stocks). Sector performance: NASDAQ uses sector ETFs (XLK, XLF, etc.), BSE uses cap-weighted averages of constituent stocks. News from Finnhub API with BSE keyword filtering. Daily briefing cached in PostgreSQL research_reports table with 24h TTL. Earnings from Finnhub calendar API.",
      ],
      terms: [
        { term: "Cap-weighted sector", definition: "Sector return = weighted average of constituent stock returns by market capitalization" },
        { term: "BSE keyword filter", definition: "News items are matched against Indian-market keywords (sensex, nifty, reliance, tcs, etc.) for region relevance" },
        { term: "Briefing cache", definition: "Daily briefing stored in PostgreSQL with region key to avoid redundant Groq API calls within 24 hours" },
      ],
    },
  },
  research: {
    title: "Research Lab",
    beginner: {
      headline: "AI-powered company research and investment analysis",
      paragraphs: [
        "Company Research generates a comprehensive report: fundamental metrics, recent news, analyst consensus, and AI analysis. Enter any symbol and click Research. Thesis Builder creates structured bull/bear/balanced investment theses. Learning Assistant explains financial concepts at beginner, intermediate, or expert level.",
        "Data is region-aware — NASDAQ symbols for US stocks, BSE symbols for Indian stocks. Fundamentals come from Yahoo Finance with chart API fallback.",
      ],
      lookFor: [
        "Company Research tab — shows fundamentals grid, AI analysis, news, and analyst data",
        "Thesis Builder — select Bull/Bear/Balanced and generate a structured thesis",
        "Learning Assistant — ask any finance question at your level",
        "Region toggle in sidebar — switches symbol universe between NASDAQ and BSE",
      ],
    },
    professional: {
      headline: "Automated equity research pipeline with LLM-generated content",
      paragraphs: [
        "Company research endpoint calls Yahoo Finance v10/quoteSummary with v8/chart fallback, Finnhub for news/analyst data, and Groq LLM for synthesis. Results cached in research_reports table for 24h. Thesis builder uses structured JSON prompting — Groq returns parsed objects with thesis, rationale, catalysts, risks, timeframe, and conviction fields. Learning assistant uses level-adaptive prompts with three tiers.",
      ],
      terms: [
        { term: "Research cache", definition: "Company reports cached by symbol in PostgreSQL with 24-hour TTL; ?refresh=true bypasses cache" },
        { term: "Structured thesis", definition: "Groq response parsed from JSON into typed fields: thesis (string), rationale (string[]), catalysts (string[]), risks (string[]), timeframe (string), conviction (low/medium/high)" },
        { term: "Level-adaptive prompt", definition: "Three prompt templates (simple/intermediate/expert) controlling jargon, depth, and word count for educational responses" },
      ],
    },
  },
};
