---
name: ExchangeScope Architecture
description: Key decisions for the ExchangeScope matching engine visualizer project
---

## C++ Matching Engine

- Source: `artifacts/api-server/src/engine/matching_engine.cpp`
- Binary: `artifacts/api-server/engine/matching_engine`
- Auto-compiles at Node.js startup if source mtime > binary mtime (in matchingEngine.ts)
- Protocol: newline-delimited JSON on stdin/stdout; one command → one response (single-threaded)
- Commands: `add`, `cancel`, `orderbook`, `stats`, `reset`
- Result for `add` includes `{ status, filledQty, avgPrice, latUs, trades: [...] }`
- Compile: `g++ -std=c++20 -O2 -o <bin> <src>`

**Why:** C++ engine is the showpiece of the visualization — demonstrates real matching engine internals with sub-millisecond latency readings.

**How to apply:** Any changes to the matching protocol must be made in both matching_engine.cpp (output format) and matchingEngine.ts (parsing).

## Market Data

- Pure Node.js random walk in `artifacts/api-server/src/lib/marketData.ts`
- No Python/yfinance dependency
- 7 symbols: AAPL, MSFT, NVDA, GOOG, AMZN, META, TSLA
- Market state modes: running, paused, flash_crash, bull, bear, volatile
- History generated on-the-fly with random walk from base prices

## AI Traders

- 8 instances across 4 types: retail (×2), market_maker (×2), momentum (×2), panic (×2)
- All submit orders through the C++ engine via matchingEngine.ts
- AI trader orders persist to orders + trades tables BUT NOT to market_events
- Only user-submitted orders via POST /api/orders create market_events (for Replay page)

## WebSocket

- Set up in websocket.ts using the `ws` package
- HTTP server upgraded in index.ts (createServer pattern, not app.listen)
- Path: /api/ws (covered by api-server artifact path prefix /api)
- Broadcasts: orderbook, trade, stats, order_update types

## Database Tables

- orders: id, symbol, type, side, quantity, price, status, filledQuantity, avgFillPrice, traderId, createdAt
- trades: id, symbol, price, quantity, side, buyOrderId, sellOrderId, buyTraderId, sellTraderId, timestamp
- market_events: id, type, symbol, data (jsonb), timestamp
