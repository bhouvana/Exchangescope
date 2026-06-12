# ExchangeScope

An interactive stock exchange & matching engine visualizer — a financial systems visualization laboratory showing how orders flow through an exchange internally (NOT a trading platform). Think x-ray machine for stock exchanges.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/exchange-scope run dev` — run the React frontend (port 20691, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `GROQ_API_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + WebSocket (ws) at /api/ws
- DB: PostgreSQL + Drizzle ORM (tables: orders, trades, market_events)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + Framer Motion + Recharts + wouter

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas for backend
- `lib/db/src/schema/` — Drizzle ORM schema (orders, trades, marketEvents)
- `artifacts/api-server/src/engine/matching_engine.cpp` — C++ matching engine source
- `artifacts/api-server/engine/matching_engine` — compiled binary (built at startup)
- `artifacts/api-server/src/lib/` — matchingEngine.ts, marketData.ts, aiTraders.ts, websocket.ts
- `artifacts/api-server/src/routes/` — stocks, orders, trades, market, traders, ai
- `artifacts/exchange-scope/src/pages/` — MarketOverview, OrderBook, Pipeline, Control, Replay
- `artifacts/exchange-scope/src/components/Layout.tsx` — sidebar + main layout

## Architecture decisions

- **C++ matching engine**: compiled at startup if source is newer than binary; communicates via stdin/stdout newline-delimited JSON; single-threaded (one command → one response)
- **Market data**: pure Node.js random walk simulation (no Python dependency); 7 symbols with realistic base prices
- **AI traders**: 8 instances across 4 types (retail, market_maker, momentum, panic) running on interval timers
- **WebSocket**: upgrades HTTP server to ws server at /api/ws; broadcasts orderbook/trade/stats/order_update events
- **No auth**: this is a visualization lab, not a trading platform

## Product

Five pages:
1. **Market Overview** (`/`) — live watchlist of 7 symbols, price charts, market movers
2. **Order Book** (`/orderbook`) — live bid/ask depth from C++ engine, depth chart, recent trades
3. **Matching Engine Pipeline** (`/pipeline`) — submit orders, watch them animate through 8 stages
4. **Control Center** (`/control`) — market scenarios, AI trader stats, live gauges, Groq AI explainer
5. **Market Replay** (`/replay`) — timeline slider over all market events stored in DB

## User preferences

- Color palette: Background #0A0A0A, Cards #151515, Accent #00FF88, Text #FFFFFF
- No emojis in UI
- Monospace font throughout (JetBrains Mono)
- AI explanations via Groq (llama-3.3-70b-versatile)

## Gotchas

- C++ engine binary lives at `artifacts/api-server/engine/matching_engine` — recompile after changing the .cpp source with `g++ -std=c++20 -O2 -o artifacts/api-server/engine/matching_engine artifacts/api-server/src/engine/matching_engine.cpp`
- AI trader orders go to orders+trades tables but NOT market_events (only user-submitted orders create events for the Replay page)
- WebSocket path is /api/ws — covered by the api-server artifact's paths=["/api"]
- matchingEngine.ts compiles the binary automatically if source is newer than binary

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
