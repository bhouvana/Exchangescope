export type ExperienceLevel = "beginner" | "intermediate" | "professional";

export interface LessonStep {
  title: string;
  body: string;
  /** Real-world anchor — grounds the lesson in actual markets */
  realWorld?: string;
  action?: { label: string; path: string };
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  duration: string;
  level: ExperienceLevel;
  steps: LessonStep[];
  practicePath: string;
  practiceLabel: string;
  keyTakeaway: string;
}

export const CURRICULUM: Lesson[] = [
  {
    id: "what-is-a-stock",
    number: 1,
    title: "What is a stock?",
    subtitle: "Ownership, companies, and why shares exist at all",
    duration: "15 min",
    level: "beginner",
    keyTakeaway: "A stock is a tiny ownership slice of a company. You are not lending money — you are buying a claim on future profits and assets, proportional to how many shares you hold.",
    practicePath: "/market",
    practiceLabel: "Open Market Overview",
    steps: [
      {
        title: "Start with a real company",
        body: "Let's begin with something concrete. Apple Inc. trades under the ticker symbol AAPL on the NASDAQ exchange. When Apple needed money to build factories, hire engineers, and develop the iPhone, it didn't just walk into a bank — it sold ownership stakes to the public. Today, Apple has issued roughly 15 billion shares outstanding. If you purchase one share of AAPL, you legally own one fifteen-billionth of the company. That means you have a proportional claim on Apple's assets (cash, buildings, patents) and its future earnings. You can vote on certain corporate decisions at shareholder meetings, and if Apple pays a dividend, you receive a small cash payment per share. The same principle applies in India: Reliance Industries Limited trades as RELIANCE on the NSE. When Reliance wanted to expand into telecom with Jio, it raised capital partly through rights issues and partly through earnings reinvestment — but the underlying concept is identical. A share of Reliance is a fractional ownership stake in one of India's most valuable companies. Owning a stock is not the same as lending money. A bond is a loan you make to a company — they owe you interest and must repay you. A stock is ownership. If the company thrives, your share can rise in value. If it fails, you can lose your entire investment.",
        realWorld: "When you tap 'Buy' on Zerodha or Robinhood, your broker doesn't send the order to the company itself. It sends it to a stock exchange — NSE or BSE in India, NASDAQ or NYSE in the US — where your buy order competes with millions of others. ExchangeScope simulates exactly what happens on that exchange after your broker delivers your order.",
      },
      {
        title: "Why do companies issue stock?",
        body: "Companies need capital — money — to grow. There are two main ways to raise it: debt and equity. Debt means borrowing (bonds, bank loans) and paying interest. Equity means selling ownership (stock) and sharing future profits with investors. When a private company decides to 'go public' through an Initial Public Offering (IPO), it sells a portion of its shares to investors for the first time on an exchange. The company receives cash it can invest in growth. Investors receive shares they hope will increase in value. After the IPO, those shares trade freely between investors on the secondary market — the everyday buying and selling you see in this simulator. The company itself doesn't receive money from secondary market trades; those transactions are between investors. In India, IPOs are regulated by SEBI (Securities and Exchange Board of India) and typically listed on both NSE and BSE simultaneously. In the US, companies list on either NASDAQ or NYSE — sometimes both, but usually one primary listing. Companies choose IPOs when they need large amounts of capital, want to use stock as currency for acquisitions, or want to give early employees and founders a way to sell their shares. The tradeoff is significant: founders dilute their control, must disclose financials publicly, and face constant scrutiny from analysts and regulators.",
        realWorld: "Apple went public on December 12, 1980 at $22 per share. TCS (Tata Consultancy Services) had India's largest IPO in 2004, raising ₹5,000 crore. Both companies' shares now trade many multiples above their IPO price — but countless other IPO companies failed entirely.",
      },
      {
        title: "What you see on this simulator",
        body: "ExchangeScope is an educational laboratory that simulates how stock exchanges work internally across four real markets: NASDAQ, NYSE, NSE (National Stock Exchange of India), and BSE (Bombay Stock Exchange). You can switch between US and Indian markets using the region selector — prices update instantly to show live data from Yahoo Finance for whichever exchange you're studying. The 2,400+ companies you see have realistic names, sectors, and price levels pulled from real market feeds. What is genuine is the machinery underneath: a real C++ matching engine pairs buy and sell orders using the same price-time priority rules as NASDAQ and NSE. When prices move in this simulator, it's because live data from real exchanges is feeding the price display. When you submit an order on the Matching Engine page, it travels through the same eight-stage pipeline a real order would. Think of this simulator as a flight simulator for pilots: the cockpit instruments use real data, and the physics of flight are accurate. Your job here is to understand the physics of how exchanges work — whether you're planning to invest via Zerodha on NSE or via Fidelity on NYSE.",
        action: { label: "Switch to NSE or BSE and explore", path: "/market" },
      },
    ],
  },
  {
    id: "why-prices-move",
    number: 2,
    title: "Why do prices move?",
    subtitle: "Supply, demand, and the auction that never stops",
    duration: "15 min",
    level: "beginner",
    keyTakeaway: "No one 'sets' the stock price. It emerges from the last trade — the price at which a willing buyer and a willing seller agreed to exchange shares.",
    practicePath: "/market",
    practiceLabel: "Watch live price changes",
    steps: [
      {
        title: "The simplest model",
        body: "The stock market is, at its core, an auction that never closes during trading hours. Imagine a farmers' market with only one product: iPhones. If 100 people show up wanting to buy and only 10 iPhones are available, sellers will raise their prices until only the buyers willing to pay the most remain. The last sale might happen at ₹1,20,000. The next day, if only 5 people want to buy and 50 sellers show up, prices fall until buyers emerge — maybe the last sale is ₹80,000. No committee decided either price. It emerged from supply and demand. The stock market works identically, whether you're trading AAPL on NASDAQ in New York or RELIANCE on NSE in Mumbai. Millions of participants globally place buy and sell orders that determine prices every millisecond. The 'current price' you see on any financial app — Zerodha, Groww, Robinhood, Fidelity — is simply the price of the most recent trade for that stock. It is a snapshot of where buyers and sellers last agreed, not a decree from the company, the exchange, or the government.",
      },
      {
        title: "News, earnings, and fear",
        body: "If prices are just supply and demand, what causes supply and demand to shift? Information and emotion. When TCS reports quarterly earnings that beat expectations, more investors want to buy, pushing demand up and prices higher. When a CEO resigns unexpectedly, sellers flood the market, pushing supply up and prices lower. Macroeconomic forces matter too: when the Reserve Bank of India (RBI) raises interest rates, borrowing becomes more expensive, which reduces corporate profits and makes stocks less attractive. When the US Federal Reserve raises rates, it affects both US and Indian markets — global capital flows between markets based on relative returns. Geopolitical events — wars, trade disputes, pandemics — create uncertainty that drives selling across all exchanges simultaneously. But here's a crucial insight: the exchange itself is neutral. NSE and NASDAQ do not judge whether your reason for buying or selling is good or bad. They simply match willing buyers with willing sellers at the best available prices. A pension fund buying HDFC Bank for a 30-year goal and a day trader selling it to lock in intraday profit are treated identically by the matching engine.",
        realWorld: "When Infosys reports quarterly earnings, trading volume on NSE often surges 5–10× the daily average in the first minutes after results are released. The price can move 8–15% in a single session. The same pattern plays out for Apple on NASDAQ — the mechanisms are identical even though the currency is different.",
      },
      {
        title: "What the green and red numbers mean",
        body: "In the Market Overview, every stock shows a price, a change amount, and a change percentage. Green indicates the current price is higher than the previous day's official closing price. Red means it's lower. The percentage tells you the magnitude of the move. Volume — the number of shares traded today — tells you how much conviction backed the move. A price rise on heavy volume suggests broad participation; a rise on light volume might be less meaningful. Market capitalization (market cap) is calculated as share price multiplied by total shares outstanding. It represents the market's collective estimate of the company's total value. Reliance Industries' market cap of roughly ₹19 lakh crore makes it one of the most valuable companies in Asia. Apple's market cap of around $3 trillion makes it one of the most valuable in the world. These numbers update continuously during trading hours — 9:15 AM to 3:30 PM IST on NSE/BSE, 9:30 AM to 4:00 PM ET on NASDAQ/NYSE. Switch between exchanges in the simulator to compare how different markets move at different times of day.",
        action: { label: "Compare NSE movers vs NASDAQ movers", path: "/market" },
      },
    ],
  },
  {
    id: "the-order-book",
    number: 3,
    title: "The order book",
    subtitle: "Every open bid and ask, visible for the first time",
    duration: "18 min",
    level: "beginner",
    keyTakeaway: "The order book is a live ledger of everyone waiting to trade. Bids are buy orders; asks are sell orders. The gap between the best bid and best ask is the spread — the cost of immediate trading.",
    practicePath: "/orderbook?symbol=AAPL",
    practiceLabel: "Open Apple's order book",
    steps: [
      {
        title: "Bids and asks",
        body: "When you want to buy or sell a stock, your order doesn't execute instantly against thin air — it interacts with other people's resting orders. The order book is the complete list of all outstanding limit orders for a given stock, organized by price. Bids represent buy orders: 'I will buy up to X shares at ₹Y or less.' The highest bid is the best bid — the most any buyer is currently willing to pay. Asks represent sell orders: 'I will sell up to X shares at ₹Z or more.' The lowest ask is the best ask — the cheapest any seller is currently willing to accept. When the best bid equals the best ask, a trade can happen immediately. Usually there's a gap between them called the spread. If the best bid for Reliance is ₹2,850.00 and the best ask is ₹2,850.25, the spread is ₹0.25. If you submit a market buy, you'll pay ₹2,850.25 (the ask). If you submit a market sell, you'll receive ₹2,850.00 (the bid). That ₹0.25 difference is the implicit cost of wanting to trade right now instead of waiting. The same logic applies to Apple at $211.00 bid / $211.05 ask on NASDAQ. Order books are universal — only the currency changes.",
        realWorld: "NSE's order book for large-cap stocks like HDFC Bank or TCS can show thousands of orders queued at each price level during peak trading hours. On NASDAQ, Apple's order book updates tens of thousands of times per second. ExchangeScope shows you a real order book driven by a live matching engine.",
      },
      {
        title: "Depth and liquidity",
        body: "Liquidity is the ease of buying or selling without significantly moving the price. A 'liquid' stock like RELIANCE on NSE has thousands of shares waiting at each price level — you can buy 100 or 10,000 shares without dramatically shifting the market. An 'illiquid' small-cap stock might have only a handful of shares at each level. Depth refers to how many shares are queued at each price away from the best bid and ask. Look at the depth bars in the order book — wider bars mean more shares at that level. The cumulative depth chart shows total volume available if you kept buying (or selling) at progressively worse prices. Indian market participants should note: NSE and BSE both publish full market depth (20 best bid/ask levels) for all stocks, similar to NASDAQ's TotalView feed. This 20-level depth — sometimes called 'Level 2 data' — is available through most Indian brokers for a nominal fee. In ExchangeScope, the depth you see is seeded and maintained by AI market makers and traders, mimicking the liquidity structure of real markets on all four exchanges.",
      },
      {
        title: "Read the book like a pro",
        body: "Professional traders read the order book the way chess players read a board — looking for patterns, imbalances, and opportunities. In ExchangeScope, bids appear on the left in green and asks on the right in red. Each row shows the price, quantity of shares, and number of individual orders at that level. If you see a large bid wall at a key level — a huge quantity of buy orders — that price may act as support. A large ask wall above might act as resistance. On NSE, circuit filter limits constrain how far a stock can move in a single session (typically ±5%, ±10%, or ±20% depending on the stock). When prices approach the upper circuit, sellers dominate the ask side; at the lower circuit, buyers crowd the bid side. Try submitting a limit buy order below the best bid on the Matching Engine page, then return here and watch your order appear in the book. You are now a visible participant in the auction — whether you chose AAPL on NASDAQ or INFY on NSE.",
        action: { label: "Study order book depth on any symbol", path: "/orderbook?symbol=AAPL" },
      },
    ],
  },
  {
    id: "your-first-order",
    number: 4,
    title: "Your first order",
    subtitle: "Market vs limit, buy vs sell — the four combinations",
    duration: "20 min",
    level: "beginner",
    keyTakeaway: "A market order prioritizes speed: 'fill me now at the best available price.' A limit order prioritizes price: 'only fill me at this level or better, even if I have to wait.'",
    practicePath: "/pipeline?symbol=AAPL",
    practiceLabel: "Submit a practice order",
    steps: [
      {
        title: "Buy vs sell",
        body: "Every single trade in history has had exactly two sides: one buyer and one seller. There is no such thing as a trade with only buyers or only sellers. When you buy 100 shares of TCS on NSE, someone else sold you those 100 shares. You might be a retail investor investing through Groww; your counterparty might be a foreign institutional investor (FII) rebalancing their India allocation. The exchange doesn't care — it matches orders, not people. A buy order expresses demand: you want to acquire shares and are willing to pay. A sell order expresses supply: you want to dispose of shares you own and are willing to accept a price. In this simulator, you can practice both sides without risk. When starting out, try a small buy order — perhaps 10 shares of AAPL or 5 shares of RELIANCE. Watch what happens in the order book and the Matching Engine pipeline. One key Indian market concept: NSE and BSE use a 'demat account' model where shares are held electronically by a depository (NSDL or CDSL). In the US, your broker holds shares in 'street name' at DTCC. Different systems, same outcome — you own the shares.",
      },
      {
        title: "Market order",
        body: "A market order says: 'Execute my trade immediately at the best price currently available.' When you submit a market buy, the matching engine pairs you with the lowest-priced sell orders (asks) in the book, starting from the best ask and working upward until your quantity is filled. You get speed and certainty of execution, but you don't control the exact price. In a liquid stock like HDFC Bank with a tight spread, a small market order will likely fill at or very near the displayed ask price. But in volatile or illiquid conditions, the price you receive can differ from what you saw on screen — this is called slippage. On NSE, market orders during the opening auction (9:00–9:15 AM IST) work differently — they queue and fill at the auction's discovered opening price, not at a live ask. On NASDAQ, pre-market and after-hours trading also carry higher slippage risk. Market orders are simple and usually fine for large-cap, heavily traded stocks. For smaller stocks or volatile conditions, limit orders give you more control.",
        realWorld: "SEBI mandates that Indian brokers show you a 'best execution' price confirmation before market orders in certain volatile conditions. In the US, brokers are required by Regulation NMS to seek the National Best Bid and Offer (NBBO) for market orders. Both are investor protections against bad fills.",
      },
      {
        title: "Limit order",
        body: "A limit order says: 'I want to trade, but only at this specific price or better.' A buy limit at ₹2,840 on RELIANCE means: 'Buy shares for me, but only if the price is ₹2,840 or lower.' If the current ask is ₹2,850, your order rests in the order book as a bid at ₹2,840, waiting for a seller willing to meet your price. A sell limit at ₹2,870 means: 'Sell my shares, but only if I can get ₹2,870 or higher.' Limit orders give you price control but not time certainty — your order might fill in seconds, hours, or never. You can cancel unfilled limit orders at any time. One important Indian market note: NSE and BSE use a unified Good Till Cancelled (GTC) system, but most retail platforms default to 'Day orders' that expire at market close. In the US, limit orders can be set as GTC (typically valid for 30–90 days depending on the broker). Try this in the simulator: submit a limit buy for any stock at a price ₹1–2 (or $1–2) below the current market price. Go to the Order Book and find your order sitting in the bids. You're now providing liquidity to the market — exactly what professional market makers do all day.",
        action: { label: "Submit a limit buy and watch it queue", path: "/pipeline?symbol=AAPL" },
      },
    ],
  },
  {
    id: "inside-the-engine",
    number: 5,
    title: "Inside the matching engine",
    subtitle: "What happens in the microseconds after you click Buy",
    duration: "20 min",
    level: "intermediate",
    keyTakeaway: "Your order passes through eight real stages — gateway, risk, validation, queue, matching, execution, broadcast, and dashboard update — each measured in microseconds. This pipeline is identical whether you're trading on NSE in Mumbai or NASDAQ in New York.",
    practicePath: "/pipeline",
    practiceLabel: "Watch the pipeline animate",
    steps: [
      {
        title: "Not magic — a pipeline",
        body: "When you click 'Submit' on a trading app, it feels instantaneous. Under the hood, your order traverses a carefully engineered pipeline of systems, each with a specific job. First, your broker packages your order into a standardized message and sends it to an exchange gateway. The gateway authenticates your session, confirms your identity, and timestamps your arrival to the microsecond. Next, pre-trade risk checks verify you have sufficient buying power, aren't exceeding position limits, and aren't flagged for compliance issues. On NSE, SEBI mandates specific risk controls including a 'peak margin' framework — you must maintain margin even during intraday volatility. On NASDAQ, FINRA Rule 4370 mandates similar pre-trade risk checks for broker-dealers. After risk validation, the order enters the matching engine's queue, receives a sequence number, and the matching algorithm runs. ExchangeScope runs this entire pipeline with a real C++ matching engine and reports actual latency at each stage.",
        realWorld: "NSE's NEAT (National Exchange for Automated Trading) system processes orders with a claimed throughput of over 1 million orders per second. NASDAQ's matching engine handles similar volumes. Both use price-time priority — the rules are universal even though the software and hardware differ.",
      },
      {
        title: "Price-time priority",
        body: "The matching algorithm used by most equity exchanges follows a deceptively simple rule: price-time priority. Price priority means the best-priced order always wins. For buy orders, 'best' means the highest price. For sell orders, 'best' means the lowest price. If you offer to buy INFY at ₹1,810 and someone else offers ₹1,800, your order is ahead — you want to pay more, so you get priority. Time priority means that among orders at the same price, the earliest order wins. This rule is fundamental to market fairness. Without time priority, there would be no incentive to show your order early. Without price priority, there would be no incentive to offer competitive prices. Together, these rules create the auction dynamic that produces fair prices. One notable variant: BSE's BOLT (BSE On-Line Trading) system historically used the same price-time priority as NSE. Both Indian exchanges also use an opening call auction (9:00–9:15 AM IST) where orders accumulate and the opening price is determined by finding the price that maximizes traded volume — a different algorithm from continuous trading.",
      },
      {
        title: "A real C++ engine",
        body: "Many financial education tools animate a fake progress bar when you 'submit' an order. ExchangeScope does not do that. When you submit an order on the Matching Engine page, it is sent via HTTP to a Node.js API server, which forwards it to a compiled C++ matching engine via stdin/stdout JSON messages. The engine updates its in-memory order book, runs the matching algorithm, and returns the result — including which trades occurred, the order's final status (filled, partial, queued, rejected), and the actual matching latency in microseconds. The API server then constructs the eight pipeline stages with realistic per-stage timing and returns them to your browser, where they animate one by one. This means the latencies you see are grounded in real engine performance. The total end-to-end time is typically a few hundred microseconds to low milliseconds in this local setup — real exchanges (NSE, NASDAQ) on colocated hardware achieve consistent sub-100-microsecond matching. Submit a market order and watch every stage. Submit a limit order below the market and watch it queue. You are interacting with the same class of technology that powers global financial markets.",
        action: { label: "Submit and watch all 8 stages", path: "/pipeline" },
      },
    ],
  },
  {
    id: "who-else-trades",
    number: 6,
    title: "Who else is trading?",
    subtitle: "Market makers, algorithms, and why the book is never empty",
    duration: "18 min",
    level: "intermediate",
    keyTakeaway: "You trade alongside market makers, pension funds, hedge funds, mutual funds (MFs), and algorithms — each with different goals, time horizons, and strategies. The cast of characters is similar on NSE and NASDAQ; only the regulatory names change.",
    practicePath: "/traders",
    practiceLabel: "Meet the AI traders",
    steps: [
      {
        title: "You are not alone",
        body: "The stock market is not a two-player game between you and the company. At any moment, thousands of distinct participants are trading the same symbols, each with different motivations and constraints. In India, the key participant types include: retail investors (like you, trading through Zerodha or Groww), domestic institutional investors (DIIs — mutual funds like SBI MF, HDFC MF, insurance companies like LIC), and foreign institutional investors (FIIs/FPIs — global hedge funds and pension funds that have registered with SEBI to trade Indian markets). On the other side of this, proprietary trading firms and algorithmic traders place orders within microseconds. In the US, the equivalent categories are retail investors (via Robinhood, Fidelity), institutional investors (Vanguard, BlackRock, pension funds), hedge funds (Citadel, Bridgewater), and high-frequency traders (HFTs). The matching engine treats all of them identically — a limit order from LIC gets the same queue position as a limit order from a retail investor, as long as the price and time of arrival are the same.",
      },
      {
        title: "Market makers",
        body: "Market makers are the invisible infrastructure of modern markets. Their job is to continuously post both buy and sell quotes for a stock, ensuring that when you want to trade, someone is always on the other side. They profit from the bid-ask spread. In India, SEBI designates 'market makers' for stocks listed under the SME (Small and Medium Enterprise) segment where liquidity is thin — these firms are contractually obligated to provide two-way quotes. For large-cap NSE stocks, the equivalent liquidity provision happens informally through proprietary trading desks and algorithmic participants. On NASDAQ, firms like Citadel Securities and Virtu Financial handle a large share of retail order flow as market makers, enabled by the 'payment for order flow' model that isn't permitted in India. In ExchangeScope, the 'market_maker' AI traders simulate this behavior by posting limit orders on both sides of the book at regular intervals, keeping the spread tight and the book deep.",
        realWorld: "NSE's liquidity provider scheme for index options requires designated firms to post quotes within a spread of 1% of the mid-price for 90% of market hours. NASDAQ has similar obligations for its market maker members. Without these rules and participants, spreads would widen dramatically and trading costs would rise.",
      },
      {
        title: "Watch them work",
        body: "ExchangeScope runs eight AI traders across four archetypes, each placing real orders into the same matching engine you use. Retail traders submit small random buy and sell limit orders. Market makers post bids and asks on both sides, maintaining spread and depth. Momentum traders watch price direction and pile into the trend — buying when prices rise, selling when they fall. Panic traders sell aggressively during price drops, simulating the fear-driven behavior that amplifies crashes — the same behavior seen in both the 2008 global financial crisis and India's 2020 COVID-induced market halt. You can observe all of them on the AI Traders page, which shows each trader's symbol, order count, fill rate, profit and loss, and last action. On the Control Center, you can pause all AI activity to see how the market behaves without algorithmic participation. Trigger a flash crash and watch panic traders accelerate the decline while market makers potentially provide stabilizing liquidity. These are real orders flowing through the real matching engine, creating the conditions you experience when you trade.",
        action: { label: "View AI trader activity", path: "/traders" },
      },
    ],
  },
  {
    id: "when-markets-break",
    number: 7,
    title: "When markets break",
    subtitle: "Flash crashes, circuit breakers, and feedback loops",
    duration: "18 min",
    level: "intermediate",
    keyTakeaway: "Markets can fail when automated strategies amplify selling faster than humans can intervene. Both US and Indian exchanges have circuit breaker systems — the levels and triggers differ, but the purpose is identical: break the feedback loop.",
    practicePath: "/control",
    practiceLabel: "Trigger a flash crash scenario",
    steps: [
      {
        title: "Two crashes: New York 2010, Mumbai 2020",
        body: "On May 6, 2010, the US stock market experienced one of its most alarming events. The Dow Jones Industrial Average plunged roughly 9% — about 1,000 points — in just minutes, then recovered most of those losses within half an hour. Individual stocks traded at absurd prices: Accenture briefly traded at one cent. The cause was a cascade: a large mutual fund sold $4.1 billion in E-mini S&P 500 futures using an algorithm that prioritized volume over price or time. High-frequency traders initially absorbed the selling but then withdrew, removing the liquidity that normally stabilizes prices. A decade later, on March 13, 2020, Indian markets halted trading for the first time in history. The Nifty 50 fell more than 10% in a single session as the COVID-19 pandemic triggered panic selling. SEBI's market-wide circuit breaker triggered at the 10% level, halting all trading on NSE and BSE for 45 minutes. When trading resumed, the fall continued — ending the day down 8%. Over the following weeks, the Nifty fell from 12,000 to 7,500 — a 37% decline. The mechanisms of both crashes were similar: cascading automated selling, liquidity withdrawal, and fear feedback loops.",
        realWorld: "The SEC and CFTC joint report on the 2010 Flash Crash (September 2010) remains essential reading. SEBI's 2020 annual report analyzed the COVID crash in detail and led to reforms in margin requirements that affected millions of retail traders in India.",
      },
      {
        title: "Circuit breakers: US vs India",
        body: "Both the US and India use circuit breakers to halt trading and prevent feedback loops. In the US, market-wide circuit breakers trigger if the S&P 500 falls 7% (Level 1 — 15 minute halt), 13% (Level 2 — 15 minute halt), or 20% (Level 3 — trading halted for the rest of the day). Individual stocks also have 'Limit Up-Limit Down' (LULD) rules that pause trading if a stock moves too far from its recent price. In India, SEBI's market-wide circuit breakers trigger based on the Nifty 50 or Sensex moving ±10% (45-minute halt), ±15% (1 hour 45 minute halt, or close for the day after 2 PM), or ±20% (close for the day). Additionally, individual stocks have their own circuit filter limits — typically ±2%, ±5%, ±10%, or ±20% depending on the stock's volatility history. Stocks that hit their upper circuit limit cannot be bought (no sellers willing to accept the limit); stocks at their lower circuit cannot be sold (no buyers willing to pay the limit). This is a situation you won't see on NASDAQ, where individual stock LULD rules only pause trading briefly rather than creating an absolute cap.",
      },
      {
        title: "Try it safely here",
        body: "One of the unique advantages of a simulator is the ability to stress-test market structure without real consequences. The Control Center gives you direct control over market conditions that would be impossible — and illegal — to manipulate in real markets. You can pause all trading to see a frozen market. You can trigger a bull scenario that injects upward price pressure. You can simulate a bear market, volatile conditions, or a flash crash. After triggering a scenario, visit the Market Overview to see prices moving, the Order Book to see how depth evaporates or rebuilds, and the Trade Tape to watch executions stream by. Then go to Market Replay and scrub the timeline to inspect every event that was recorded. Switch to the NSE or BSE region before triggering a flash crash — the same matching engine mechanics play out with Indian stocks and rupee prices. This is exactly how exchange engineers and regulators — at both NSE and NASDAQ — test their systems in controlled environments before extreme events happen in production.",
        action: { label: "Open Control Center", path: "/control" },
      },
    ],
  },
  {
    id: "microstructure-deep-dive",
    number: 8,
    title: "Microstructure deep dive",
    subtitle: "Latency, protocols, and what separates retail from HFT",
    duration: "22 min",
    level: "professional",
    keyTakeaway: "Every microsecond in the order lifecycle is accounted for. Firms colocate servers inside exchange data centers — in Mumbai's BKC district for NSE, or Mahwah, NJ for NYSE — to minimize physical distance between their strategies and the matching engine.",
    practicePath: "/analytics",
    practiceLabel: "Open latency analytics",
    steps: [
      {
        title: "Latency budget",
        body: "In modern equity markets, speed is a critical competitive advantage for certain strategies. High-frequency trading firms measure their round-trip time in microseconds — millionths of a second. A human blink takes about 100,000 microseconds. The entire order lifecycle in ExchangeScope typically completes in a few hundred to low thousands of microseconds. Each stage consumes part of this 'latency budget': gateway authentication (30–80µs), pre-trade risk checks (20–40µs), order validation (10–20µs), queue insertion (50–150µs), matching engine (40–100µs), execution and confirmation (20–40µs), market data broadcast (10–30µs). In the US, firms colocate servers at Mahwah, NJ (NYSE) or Carteret, NJ (NASDAQ), placing hardware just feet from the matching engine. In India, NSE's colocation facility in Mumbai's BKC district draws the same class of firms — domestic algorithmic traders and global firms seeking exposure to India. NSE has been controversial for alleged colocation irregularities (the 2016 algo-trading scandal), which led to SEBI investigations and reforms that reshaped India's HFT industry.",
        realWorld: "NSE processes approximately 2 billion orders per day across all segments. NASDAQ processes roughly 1.5 billion. Both systems rely on kernel-bypass networking (DPDK or similar) and FPGA-based risk checks to achieve sub-microsecond processing at the hardware level.",
      },
      {
        title: "ITCH, FIX, and NEAT/BOLT",
        body: "Financial markets run on standardized communication protocols. FIX (Financial Information eXchange) is the legacy text-based protocol used for order entry across global markets — your broker sends a FIX message to the exchange. Modern venues increasingly accept binary protocols for order entry. On the US market data side, NASDAQ's ITCH 5.0 broadcasts order book changes in a compact binary stream: 'A' for add order, 'E' for execute, 'D' for delete, 'U' for replace. On Indian exchanges, NSE uses its own proprietary protocol over the NEAT (National Exchange for Automated Trading) infrastructure; BSE uses BOLT (BSE On-Line Trading). For data dissemination, NSE publishes the 'NSE Data Feed' in binary format for market data subscribers; BSE has a similar datafeed system. The SIP (Securities Information Processor) in the US consolidates feeds from all exchanges into the NBBO. India has no exact equivalent — the NTP (NSE Trading Platform) and BSE's feed are the primary sources, and the two Indian exchanges do not share a consolidated tape. Understanding these protocols matters for anyone building trading infrastructure or analyzing market data, regardless of which exchange they target.",
      },
      {
        title: "Measure, don't guess",
        body: "Performance engineering in trading systems follows a simple principle: measure every component, optimize the bottleneck, repeat. ExchangeScope's Analytics page displays live throughput metrics (orders per second, trades per second, queue depth) and a per-stage latency breakdown from actual engine measurements. Compare gateway time to matching time to identify where congestion forms. When you submit a burst of orders on the Matching Engine page, return to Analytics and watch queue depth spike and latency shift. This is how exchange SRE teams at both NSE and NASDAQ monitor production systems: dashboards showing real-time latency percentiles (p50, p99, p99.9), alert thresholds, and historical replay for post-incident analysis. Key metrics to watch: orders received vs filled vs rejected (fill rate), partial fills (indicates insufficient liquidity), and the ratio of queue time to match time. One critical difference between US and Indian market microstructure: SEBI's 2021 'peak margin' rule introduced intraday margin snapshots, requiring brokers to check margin at four random points during the trading day. This changed intraday strategy design significantly — HFT firms that rely on intraday leverage face different constraints on NSE than on NASDAQ.",
        action: { label: "Inspect latency pipeline", path: "/analytics" },
      },
    ],
  },
  {
    id: "global-market-structures",
    number: 9,
    title: "US vs India: market structures compared",
    subtitle: "Same rules, different regulations, different market hours",
    duration: "20 min",
    level: "professional",
    keyTakeaway: "The core mechanics — price-time priority, order types, market makers, circuit breakers — are universal. What differs between US and Indian markets are regulatory frameworks, settlement timelines, currency, trading hours, and the structure of derivative markets.",
    practicePath: "/market",
    practiceLabel: "Switch between NSE and NASDAQ",
    steps: [
      {
        title: "Settlement: T+1 on both sides of the world",
        body: "Settlement is the process by which traded shares are actually transferred from seller to buyer, and cash from buyer to seller. Historically, US markets settled on T+2 (two business days after trade date) and Indian markets on T+2 as well. In January 2023, India became the first major market to transition to T+1 (next business day) settlement for all equity stocks — a significant achievement, as it reduced counterparty risk and freed up capital more quickly. The US followed in May 2024, shortening equity settlement from T+2 to T+1 across all major exchanges. Both markets now settle equities the next business day. Derivatives (futures and options) settle differently: US equity options settle T+1, while NSE's equity derivatives (Nifty futures, stock futures) use a mixed T+0 and T+1 settlement depending on contract type and expiry. For this simulator, settlement is abstracted away — trades appear in your account immediately. In real markets, your broker extends you intraday credit against the T+1 obligation, which is why margin requirements and overnight positions are treated differently.",
        realWorld: "India's shift to T+1 was driven by SEBI's desire to reduce settlement risk in a market that saw significant retail participation growth post-2020 (Zerodha alone onboarded 10 million accounts between 2020 and 2022). The US shift was driven by the GameStop episode in 2021, where T+2 settlement created temporary capital strain for brokers like Robinhood.",
      },
      {
        title: "Regulators: SEC, FINRA vs SEBI",
        body: "Every major market has a primary regulator. In the US, the SEC (Securities and Exchange Commission) oversees securities markets broadly — listing requirements, disclosure rules, insider trading enforcement, and market structure rules. FINRA (Financial Industry Regulatory Authority) is a self-regulatory organization that oversees broker-dealers specifically. In India, SEBI (Securities and Exchange Board of India) is the equivalent of both the SEC and FINRA — it regulates exchanges (NSE, BSE), broker-dealers, mutual funds, and foreign portfolio investors (FPIs) all under one roof. Key differences in approach: SEBI has been more proactive in mandating specific circuit breaker mechanisms, margin requirements, and algorithmic trading regulations than the SEC. SEBI's 2022 circular requiring 'risk disclosure' for new derivatives traders was a direct response to studies showing large retail losses in F&O (futures and options). The SEC takes a more disclosure-oriented approach, providing information but generally allowing investors to make their own risk decisions. Both regulators are powerful — insider trading is aggressively prosecuted in both jurisdictions.",
      },
      {
        title: "Derivative markets: F&O on NSE, options on US exchanges",
        body: "India has one of the world's largest derivatives markets by volume, dominated by weekly and monthly Nifty 50 and Bank Nifty options contracts. NSE's derivatives segment regularly exceeds the equity cash segment in volume by 20–30×, driven largely by retail participation in index options. This creates a unique dynamic: retail traders in India often start with derivatives (higher leverage, lower capital requirement per trade) rather than buying stocks outright. In the US, the options market (primarily CBOE, NYSE Arca, NASDAQ PHLX) is large but retail participation in options is more sophisticated and generally lower as a share of total market activity. ExchangeScope simulates the equity cash market (stocks) rather than derivatives, but understanding this context is important: when you see Nifty-linked stocks like TCS, HDFC Bank, or Reliance move sharply in the simulator, imagine that each of those moves ripples into the derivatives market where hundreds of thousands of option contracts are simultaneously being repriced. The two markets — cash and derivatives — are tightly coupled through arbitrage by professional firms.",
        action: { label: "Compare NSE and NASDAQ market overviews", path: "/market" },
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return CURRICULUM.find(l => l.id === id);
}

export function getNextLesson(currentId: string): Lesson | undefined {
  const idx = CURRICULUM.findIndex(l => l.id === currentId);
  return idx >= 0 && idx < CURRICULUM.length - 1 ? CURRICULUM[idx + 1] : undefined;
}
