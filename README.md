<div align="center">

# ExchangeScope

**A full-stack stock market intelligence platform**

Real-time order matching · Live market data across 4 exchanges · AI-powered research · Interactive candlestick charts

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-0.45-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

</div>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-exchangescope.onrender.com-00FF88?logo=render&logoColor=white)](https://exchangescope.onrender.com)


---

## What is ExchangeScope?

ExchangeScope is a production-grade financial intelligence platform that brings four of the world's major stock exchanges to one place. It streams live prices from Yahoo Finance for over **1,200 companies** across NASDAQ, NYSE, NSE (India), and BSE (India), runs a real matching engine that executes orders in microseconds, and layers Groq-powered AI on top for company research, investment thesis generation, news sentiment analysis, and an always-on learning assistant.

Everything — market data, order execution, AI insights — updates in real time via WebSocket. There are no mocked delays or fake numbers; prices come from Yahoo Finance on 5-minute cycles, market caps from Finnhub, and research from a 70-billion-parameter language model.

---

## Feature Highlights

### Market Data & Exchanges
- **4 live exchanges** — NASDAQ, NYSE, NSE, BSE with 1,200+ companies
- **Real-time quote streaming** from Yahoo Finance (5-minute intervals, batched in groups of 20)
- **Market cap enrichment** from Finnhub at ~54 calls/minute (free-tier safe)
- **Full OHLCV history** — up to max range for daily bars, 1 month for intraday
- **Synthetic chart fallback** — if Yahoo is rate-limited, generates realistic bars from live price data so charts are never blank
- **Stable pagination** — snapshot cache ensures page 1 and page 2 always draw from the same sorted list

### Interactive Charting
- **Candlestick, OHLC, Line, Area, Heikin-Ashi, Hollow candle** chart types
- **13 timeframes** — 1m, 5m, 15m, 30m, 1H, 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, MAX
- **Technical indicators** — SMA, EMA (multiple periods), Bollinger Bands, RSI, MACD, Trend
- **Drawing tools** — Trend line, Horizontal, Vertical, Rectangle, Ray, Arrow, Fibonacci, Free draw
- **Zoom, pan, inertia scroll** with keyboard shortcuts
- **Chart state persistence** to localStorage (range, chart type, indicators, drawings)
- **Expand to full-screen** from any compact chart card

### Order Matching Engine
- **Market and limit orders** with price-time priority
- **Full execution pipeline** with measured latency at each stage:
  - Gateway (30–80 µs) → Risk Check → Validation → Queue → Matching Engine (40–140 µs) → Execution → Broadcast → Dashboard
- **Partial fills**, order cancellations, and rejection handling
- **Live order book** with bid/ask depth visualization
- **Trade tape** — real-time feed of executed trades
- **WebSocket broadcast** — every order event streams to all connected clients instantly

### AI Traders
- **Autonomous trading agents** that continuously place orders based on market conditions
- Agents respond to scenario changes (flash crash, bull/bear modes)
- Configurable agent profiles — monitor activity in the AI Traders panel

### Market Intelligence (Groq + Finnhub)
- **Company Research** — fundamentals, recent news, analyst ratings, insider transactions, and a full AI analysis with bull/bear case, risk factors, and price target commentary
- **Investment Thesis Builder** — generate custom buy/sell/hold theses per symbol
- **Sector Analysis** — cap-weighted sector performance across all exchanges
- **Earnings Calendar** — upcoming and historical EPS reports with surprise tracking
- **Analyst Consensus** — rating upgrades/downgrades, 12-month price targets
- **News Feed** — Finnhub headlines with AI sentiment scoring
- **Daily Briefing** — AI-generated market summary cached per region per day
- **Learning Assistant** — explain any financial concept at beginner, intermediate, or advanced level

### Market Control
- **Scenarios** — Flash Crash, Bull Market, Bear Market, High Volatility mode, Pause, Reset
- All scenarios broadcast to connected clients and affect AI trader behavior
- **Market events log** — full replay of all control actions

### Market Overview Dashboard
- **Top Gainer, Top Loser, High Volume, Largest Cap** cards update every 15 seconds
- **Market breadth** — advancing vs declining vs unchanged counts
- **Sector heatmap** — color-coded performance tiles per sector
- **Persistent sort** — sort by symbol, price, change%, volume, or market cap with stable cross-page ordering
- **Analytics page** — depth charts, fill rates, order statistics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                          │
│  React 19 · Vite 6 · TanStack Query · Framer Motion · Radix UI │
│                                                                 │
│  Pages: Market Overview · Order Book · Trade Tape · Analytics   │
│         Research Lab · Market Intelligence · Academy · Control  │
│                                                                 │
│  Chart Engine: Canvas-based · 13 timeframes · 6 chart types     │
│                7 drawing tools · 5 technical indicators         │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP + WebSocket (/api)
┌───────────────────────────▼─────────────────────────────────────┐
│                     Express API Server                          │
│  Port 8082 · Express 5 · Pino logging · Cookie-based auth      │
│                                                                 │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐│
│  │ Matching Eng │  │  Live Quotes   │  │   AI Service (Groq)  ││
│  │ Market/Limit │  │  Yahoo Finance │  │ llama-3.3-70b-versati││
│  │ Orders & Fills│ │  Spark + Chart │  │ Research · Thesis    ││
│  └──────────────┘  │  Batch 20/req  │  │ Learning · Briefing  ││
│  ┌──────────────┐  └────────────────┘  └──────────────────────┘│
│  │  AI Traders  │  ┌────────────────┐  ┌──────────────────────┐│
│  │ Autonomous   │  │    Finnhub     │  │   WebSocket Server   ││
│  │ Order Agents │  │ Enrichment     │  │ Broadcast: orders,   ││
│  └──────────────┘  │ 54 calls/min   │  │ trades, stats, book  ││
│                    └────────────────┘  └──────────────────────┘│
└───────────────────────────┬─────────────────────────────────────┘
                            │  Drizzle ORM
┌───────────────────────────▼─────────────────────────────────────┐
│                      PostgreSQL Database                        │
│                                                                 │
│  companies · exchanges · orders · trades · marketEvents        │
│  cachedNews · cachedEarnings · cachedAnalystRatings            │
│  cachedFundamentals · researchReports                          │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo Layout

```
AI-Task-Runner/              ← Turborepo root
├── artifacts/
│   ├── api-server/          ← Express backend (TypeScript + esbuild)
│   │   └── src/
│   │       ├── routes/      ← All HTTP endpoints
│   │       ├── lib/         ← Market data, matching engine, AI
│   │       └── index.ts     ← Server entry point
│   └── exchange-scope/      ← React + Vite frontend
│       └── src/
│           ├── pages/       ← 15 full-page views
│           ├── components/  ← Shared UI components
│           ├── chart/       ← Complete charting system
│           └── context/     ← RegionContext, QueryClient
├── lib/
│   ├── db/                  ← Drizzle schema + client
│   ├── api-spec/            ← OpenAPI YAML definition
│   └── api-client-react/    ← Generated React Query hooks
└── start.bat                ← One-command dev startup (Windows)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19.1, Vite 6.3 |
| Styling | Tailwind CSS 4.1, Radix UI, shadcn/ui |
| State / Data | TanStack Query v5, Wouter routing, Framer Motion |
| Backend | Node.js, Express 5.2, TypeScript 5.9 |
| Database | PostgreSQL, Drizzle ORM 0.45 |
| Real-time | WebSocket (ws 8.21) |
| AI | Groq API — llama-3.3-70b-versatile |
| Market Data | Yahoo Finance (quotes + history), Finnhub (fundamentals + news) |
| Auth | Google OAuth 2.0 (+ dev-mode bypass) |
| Build | esbuild (API), Vite (frontend), Turborepo |
| Package Manager | pnpm (strict supply-chain security) |
| Logging | Pino (structured JSON) |

---

## Database Schema

| Table | Purpose |
|---|---|
| `companies` | 1,200+ companies — symbol, name, exchange, sector, market cap |
| `exchanges` | Exchange metadata — timezone, currency, market hours |
| `orders` | All submitted orders with status lifecycle |
| `trades` | Executed trade records with buyer/seller IDs |
| `marketEvents` | Full event log — orders, fills, control actions |
| `cachedNews` | Company news from Finnhub (24-hour retention) |
| `cachedEarnings` | EPS reports, surprises, guidance |
| `cachedAnalystRatings` | Rating changes, price targets |
| `cachedFundamentals` | P/E, beta, revenue, margins, ownership |
| `researchReports` | AI-generated research, theses, briefings |

---

## API Reference

All endpoints are prefixed with `/api`.

### Market Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stocks` | All quotes or filtered by `?exchange=` |
| `GET` | `/stocks/:symbol` | Live quote + company info |
| `GET` | `/stocks/:symbol/history/:period` | OHLCV bars (1m → max) |
| `GET` | `/companies` | Paginated list with search, filter, sort |
| `GET` | `/companies/search` | Autocomplete search (top 15) |
| `GET` | `/companies/sectors` | Distinct sectors per exchange |
| `GET` | `/exchanges` | Exchange metadata |
| `GET` | `/market/overview` | Top movers, sector performance |
| `GET` | `/market/stats` | Engine statistics |
| `GET` | `/market/region` | Current active region |

### Order Flow

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/orderbook/:symbol` | Live bids and asks |
| `GET` | `/orders` | Order history `?symbol=&limit=` |
| `POST` | `/orders` | Submit market or limit order |
| `GET` | `/trades` | Trade history `?symbol=&limit=` |
| `GET` | `/trades/replay` | Market events replay |

### Market Control

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/market/control` | Trigger scenario (flash_crash, bull, bear, volatile, pause, reset) |
| `GET` | `/traders` | AI trader status |

### Research & Intelligence

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/research/company/:symbol` | Full AI company report |
| `POST` | `/research/thesis` | Generate investment thesis |
| `POST` | `/research/learn` | Learning assistant |
| `POST` | `/research/sentiment` | News sentiment analysis |
| `GET` | `/research/historical/:event` | Historical market events |
| `GET` | `/intelligence/news` | Market news feed |
| `GET` | `/intelligence/earnings` | Earnings calendar |
| `GET` | `/intelligence/analysts/:symbol` | Analyst ratings |
| `GET` | `/intelligence/daily-briefing` | AI daily market briefing |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/google` | Google OAuth login |
| `GET` | `/auth/session` | Current session info |
| `POST` | `/auth/logout` | Destroy session |
| `GET` | `/auth/orders` | Authenticated user orders |
| `GET` | `/auth/trades` | Authenticated user trades |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+ — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- API keys for Finnhub and Groq (free tiers are sufficient)

---

## Local Setup

### 1 — Clone and install

```bash
git clone https://github.com/bhouvana/Exchangescope.git
cd Exchangescope
pnpm install
```

### 2 — Start PostgreSQL

```bash
docker run -d \
  --name exchangescope-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=exchangescope \
  -p 5434:5432 \
  postgres:15
```

### 3 — Configure environment

Create `.env` in the repository root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/exchangescope
FINNHUB_API_KEY=your_finnhub_key_here
GROQ_API_KEY=your_groq_key_here
SESSION_SECRET=change-this-to-a-random-secret
PORT=8082
NODE_ENV=development
```

Get your free API keys:
- **Finnhub** — [finnhub.io](https://finnhub.io/) — Free tier: 60 calls/minute
- **Groq** — [console.groq.com](https://console.groq.com/) — Free tier: generous daily token limit

### 4 — Push database schema

```bash
cd lib/db
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/exchangescope pnpm drizzle-kit push
cd ../..
```

### 5 — Build the API server

```bash
cd artifacts/api-server
node ./build.mjs
cd ../..
```

### 6 — Start services

**Windows (automated):**
```bat
start.bat
```

**Manual (any OS):**

Terminal 1 — API server:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/exchangescope \
FINNHUB_API_KEY=your_key \
GROQ_API_KEY=your_key \
SESSION_SECRET=dev-secret \
PORT=8082 \
NODE_ENV=development \
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Terminal 2 — Frontend:
```bash
cd artifacts/exchange-scope
npx vite --port 20691
```

### 7 — Seed company data

On first run, trigger the company seed endpoint:

```bash
curl -X POST http://localhost:8082/api/seed/companies
```

This loads ~1,200 companies across all 4 exchanges. Takes about 5 seconds.

### 8 — Open the app

Navigate to **http://localhost:20691**

---

## Deployment on Render

The repo includes `render.yaml` — Render's blueprint format. It provisions a managed PostgreSQL database and a single Node.js web service that builds both the frontend and API, then serves everything from one URL.

### Deploy in 3 steps

**1. Connect the repo**

Go to [render.com](https://render.com) → **New → Blueprint** → connect `bhouvana/Exchangescope`. Render detects `render.yaml` and shows two resources to create: the database and the web service. Click **Apply**.

**2. Set your API keys**

After the first deploy completes, go to the `exchangescope` web service → **Environment** and set:

```
FINNHUB_API_KEY   your key from finnhub.io
GROQ_API_KEY      your key from console.groq.com
```

Click **Save Changes** — Render redeploys automatically.

**3. Done**

The app is live. `DATABASE_URL` and `SESSION_SECRET` are wired up automatically by `render.yaml`; company data seeds itself on every startup.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `FINNHUB_API_KEY` | ✅ | Finnhub API key — market caps, news, analyst data |
| `GROQ_API_KEY` | ✅ | Groq API key — AI research and analysis |
| `SESSION_SECRET` | ✅ | Secret for signing session cookies |
| `PORT` | ✗ | API server port (default: 8082) |
| `NODE_ENV` | ✗ | `development` or `production` |
| `FRONTEND_URL` | ✗ | Frontend URL for CORS (production) |

---

## Pages & Navigation

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Marketing home page |
| Market Overview | `/market` | Company list, prices, charts, search |
| Sector Heatmap | `/sectors` | Visual sector performance grid |
| Order Book | `/orderbook` | Live bid/ask depth |
| Trade Tape | `/trades` | Real-time execution feed |
| Analytics | `/analytics` | Fill rates, order statistics |
| Pipeline | `/pipeline` | Order execution latency breakdown |
| Market Replay | `/replay` | Historical event playback |
| Control Center | `/control` | Market scenario triggers |
| AI Traders | `/ai-traders` | Autonomous agent monitoring |
| Research Lab | `/research` | AI-powered company research |
| Market Intelligence | `/intelligence` | News, earnings, analyst data |
| Academy | `/academy` | Learning assistant |
| Reports | `/reports` | Saved research reports |

---

## How Live Data Works

```
Every 30 seconds:
  Yahoo Finance Spark API ──▶ batch(20 symbols) ──▶ in-memory quote cache
                                                          │
  Finnhub profile2 API ──▶ 1 call per 1.1s ──────────── ▼
  (market cap enrichment)                      enriched quote cache
                                                          │
  On-demand (chart clicks):                              ▼
  Yahoo Finance Chart API ──▶ OHLCV bars ──▶ TanStack Query (60s stale)
  (fallback: synthetic bars from live quote if Yahoo unavailable)
                                                          │
  Company list pagination:                               ▼
  Snapshot cache (20s TTL) ──▶ consistent page ordering across all pages
```

---

## Exchanges & Coverage

| Exchange | Country | Currency | Companies | Suffix |
|---|---|---|---|---|
| NASDAQ | USA | USD | ~362 | — |
| NYSE | USA | USD | ~361 | — |
| NSE | India | INR | ~264 | `.NS` |
| BSE | India | INR | ~246 | `.BO` |
| **Total** | | | **~1,233** | |

NASDAQ and NYSE coverage includes major sectors: Technology, Healthcare, Financials, Energy, Consumer, Industrials, Materials, Utilities, Real Estate, Communication Services.

NSE and BSE coverage includes major Indian large-caps: IT (TCS, Infosys, Wipro), Financials (HDFC, ICICI, SBI), Energy (Reliance, ONGC), FMCG, Auto, Pharma.

---

## Development Notes

### Rebuild the API after source changes

```bash
cd artifacts/api-server
node ./build.mjs
```

Then restart the Node process.

### Push schema changes

```bash
cd lib/db
DATABASE_URL=... pnpm drizzle-kit push
```

### Re-seed company data

```bash
curl -X POST http://localhost:8082/api/seed/companies
```

### WebSocket events

Connect to `ws://localhost:8082/api` and listen for events:
- `order_book` — updated bids/asks for a symbol
- `trade` — newly executed trade
- `stats` — engine throughput metrics
- `market_event` — scenario changes, control actions

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and ensure TypeScript compiles: `pnpm typecheck`
4. Commit: `git commit -m "feat: my feature"`
5. Push: `git push origin feature/my-feature`
6. Open a pull request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with Express · React · PostgreSQL · Yahoo Finance · Finnhub · Groq

</div>
