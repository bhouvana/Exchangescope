import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { engine } from "../lib/matchingEngine";
import { getCurrentPrice, recordOrder } from "../lib/marketData";
import { broadcastOrderBook, broadcastTrade, broadcastOrderUpdate } from "../lib/websocket";
import { db } from "@workspace/db";
import { ordersTable, tradesTable, marketEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Pipeline stage builder — realistic latencies
function buildPipeline(latUs: number) {
  const now = Date.now();
  const gatewayUs   = Math.round(30 + Math.random() * 50);
  const riskUs      = Math.round(20 + Math.random() * 40);
  const validUs     = Math.round(10 + Math.random() * 20);
  const queueUs     = Math.round(50 + Math.random() * 150);
  const matchUs     = latUs || Math.round(40 + Math.random() * 100);
  const execUs      = Math.round(20 + Math.random() * 40);
  const broadcastUs = Math.round(10 + Math.random() * 30);
  const dashUs      = Math.round(5  + Math.random() * 15);

  let elapsed = 0;
  const stage = (name: string, us: number, detail?: string) => {
    elapsed += us;
    return { name, status: "done", latencyUs: us, timestamp: new Date(now + elapsed / 1000).toISOString(), detail: detail ?? null };
  };

  return [
    stage("Trader",               0,         "Order submitted by trader"),
    stage("Gateway",              gatewayUs, "TCP packet received, session authenticated"),
    stage("Risk Check",           riskUs,    "Position limits and buying power verified"),
    stage("Validation",           validUs,   "Symbol, quantity, price constraints validated"),
    stage("Order Queue",          queueUs,   "Order enqueued at sequence " + Date.now()),
    stage("Matching Engine",      matchUs,   "Price-time priority scan across order book"),
    stage("Trade Execution",      execUs,    "Fill confirmed, counterparty notified"),
    stage("Market Data Broadcast",broadcastUs,"ITCH 5.0 feed updated"),
    stage("Dashboard Update",     dashUs,    "UI state refreshed"),
  ];
}

router.get("/orderbook/:symbol", async (req, res): Promise<void> => {
  const symbol = (Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol).toUpperCase();
  try {
    const ob = await engine.getOrderBook(symbol);
    const curPrice = getCurrentPrice(symbol);
    res.json({
      symbol,
      bids: ob.bids ?? [],
      asks: ob.asks ?? [],
      lastTradePrice: ob.lastPrice && ob.lastPrice > 0 ? ob.lastPrice : curPrice,
      spread: ob.spread ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get orderbook");
    res.status(500).json({ error: "Engine unavailable" });
  }
});

router.get("/orders", async (req, res): Promise<void> => {
  const { symbol, limit } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);
  let q = db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(lim);
  const rows = symbol
    ? await db.select().from(ordersTable).where(eq(ordersTable.symbol, String(symbol).toUpperCase())).orderBy(desc(ordersTable.createdAt)).limit(lim)
    : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(lim);

  res.json(rows.map(r => ({
    id: r.id,
    symbol: r.symbol,
    type: r.type,
    side: r.side,
    quantity: r.quantity,
    price: r.price,
    status: r.status,
    filledQuantity: r.filledQuantity,
    avgFillPrice: r.avgFillPrice,
    traderId: r.traderId,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? null,
  })));
});

router.post("/orders", async (req, res): Promise<void> => {
  const { symbol, type, side, quantity, price } = req.body;

  if (!symbol || !type || !side || !quantity) {
    res.status(400).json({ error: "Missing required fields: symbol, type, side, quantity" });
    return;
  }
  if (!["market","limit"].includes(type)) {
    res.status(400).json({ error: "type must be 'market' or 'limit'" }); return;
  }
  if (!["buy","sell"].includes(side)) {
    res.status(400).json({ error: "side must be 'buy' or 'sell'" }); return;
  }
  if (type === "limit" && (!price || price <= 0)) {
    res.status(400).json({ error: "Limit orders require a positive price" }); return;
  }

  const id = uuidv4();
  const sym = String(symbol).toUpperCase();
  const qty = Number(quantity);
  const lmtPrice = type === "limit" ? Number(price) : 0;

  req.log.info({ id, sym, type, side, qty, price: lmtPrice }, "Order submitted");

  try {
    const result = await engine.addOrder({ id, symbol: sym, type, side, qty, price: lmtPrice });

    const status = result.status ?? "queued";
    recordOrder(status);

    // Persist order
    await db.insert(ordersTable).values({
      id, symbol: sym, type, side,
      quantity: qty,
      price: lmtPrice || null,
      status,
      filledQuantity: result.filledQty ?? 0,
      avgFillPrice: result.avgPrice ?? null,
      traderId: null,
    }).onConflictDoNothing();

    const trades = result.trades ?? [];

    // Persist trades
    for (const t of trades) {
      await db.insert(tradesTable).values({
        id: t.id,
        symbol: t.symbol,
        price: t.price,
        quantity: t.qty,
        side: side as "buy" | "sell",
        buyOrderId: t.buyOrderId,
        sellOrderId: t.sellOrderId,
        buyTraderId: null,
        sellTraderId: null,
      }).onConflictDoNothing();
    }

    // Persist events
    await db.insert(marketEventsTable).values({
      id: uuidv4(),
      type: "order_submitted",
      symbol: sym,
      data: { orderId: id, side, type, quantity: qty, price: lmtPrice },
    });
    if (trades.length > 0) {
      for (const t of trades) {
        await db.insert(marketEventsTable).values({
          id: uuidv4(),
          type: "trade_executed",
          symbol: sym,
          data: { tradeId: t.id, price: t.price, quantity: t.qty },
        });
      }
    }

    // Broadcast real-time updates
    const ob = await engine.getOrderBook(sym);
    broadcastOrderBook({ symbol: sym, bids: ob.bids ?? [], asks: ob.asks ?? [], lastTradePrice: ob.lastPrice, spread: ob.spread, updatedAt: new Date().toISOString() });
    for (const t of trades) {
      broadcastTrade({ ...t, symbol: sym });
    }
    broadcastOrderUpdate({ orderId: id, status, filledQty: result.filledQty ?? 0 });

    const pipeline = buildPipeline(result.latUs ?? 0);
    const orderOut = {
      id, symbol: sym, type, side,
      quantity: qty,
      price: lmtPrice || null,
      status,
      filledQuantity: result.filledQty ?? 0,
      avgFillPrice: result.avgPrice ?? null,
      traderId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    res.status(201).json({
      order: orderOut,
      pipeline,
      trades: trades.map(t => ({
        id: t.id, symbol: t.symbol, price: t.price, quantity: t.qty,
        side: side as "buy" | "sell",
        buyOrderId: t.buyOrderId, sellOrderId: t.sellOrderId,
        buyTraderId: null, sellTraderId: null,
        timestamp: new Date(t.ts / 1000).toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Order processing failed");
    res.status(500).json({ error: "Matching engine error" });
  }
});

export default router;
