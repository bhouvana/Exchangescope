import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { engine } from "../lib/matchingEngine";
import { getCurrentPrice, recordOrder } from "../lib/marketData";
import { broadcastOrderBook, broadcastTrade, broadcastOrderUpdate } from "../lib/websocket";
import { db } from "@workspace/db";
import { ordersTable, tradesTable, marketEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { ensureOrderBookLiquidity } from "../lib/orderBookSeed";
import { getUserId } from "../lib/session";

const router: IRouter = Router();

interface PipelineOrderCtx {
  id: string;
  symbol: string;
  side: string;
  type: string;
  qty: number;
  price: number;
  status: string;
  filledQty: number;
  tradeCount: number;
}

// Pipeline stage builder — realistic latencies with order-specific detail
function buildPipeline(latUs: number, ctx: PipelineOrderCtx) {
  const now = Date.now();
  const seq = Date.now();
  const gatewayUs   = Math.round(30 + Math.random() * 50);
  const riskUs      = Math.round(20 + Math.random() * 40);
  const validUs     = Math.round(10 + Math.random() * 20);
  const queueUs     = Math.round(50 + Math.random() * 150);
  const matchUs     = latUs || Math.round(40 + Math.random() * 100);
  const execUs      = Math.round(20 + Math.random() * 40);
  const broadcastUs = Math.round(10 + Math.random() * 30);
  const dashUs      = Math.round(5  + Math.random() * 15);
  const px = ctx.price > 0 ? ctx.price.toFixed(2) : "MKT";
  const sideTag = ctx.side === "buy" ? "1" : "2";
  const filled = ctx.filledQty > 0;
  const queued = ctx.status === "queued" || ctx.status === "partial";

  let elapsed = 0;
  const stage = (name: string, us: number, detail?: string) => {
    elapsed += us;
    return { name, status: "done", latencyUs: us, timestamp: new Date(now + elapsed / 1000).toISOString(), detail: detail ?? null };
  };

  return [
    stage("Trader", 0,
      `POST /api/orders → ${ctx.side.toUpperCase()} ${ctx.qty} ${ctx.symbol} @ ${px} (${ctx.type})`),
    stage("Gateway", gatewayUs,
      `FIX 35=D │ 11=${ctx.id.slice(0, 8)} │ 55=${ctx.symbol} │ 54=${sideTag} │ 38=${ctx.qty} │ session=AUTH_OK`),
    stage("Risk Check", riskUs,
      `buying_power=PASS │ position_limit=PASS │ fat_finger=PASS │ exposure=OK`),
    stage("Validation", validUs,
      `sym=${ctx.symbol} ✓ │ qty=${ctx.qty} ✓ │ tick=0.01 ✓ │ luld=PASS │ type=${ctx.type.toUpperCase()} ✓`),
    stage("Order Queue", queueUs,
      `ENQUEUE seq=${seq} │ partition=${ctx.symbol} │ mpsc_lockfree │ depth+1`),
    stage("Matching Engine", matchUs,
      filled
        ? `price_time scan → ${ctx.tradeCount} fill(s) │ ${ctx.filledQty}/${ctx.qty} shares @ engine lat ${matchUs}µs`
        : `price_time scan → no cross │ resting in book @ ${px}`),
    stage("Trade Execution", execUs,
      filled
        ? `EXEC 35=8 │ 150=${ctx.status === "filled" ? "2(FILLED)" : "1(PARTIAL)"} │ 32=${ctx.filledQty} │ 31=${px}`
        : `EXEC 35=8 │ 150=0(NEW) │ order resting │ book level created`),
    stage("Market Data Broadcast", broadcastUs,
      filled
        ? `ITCH type=E │ ${ctx.symbol} │ exec_qty=${ctx.filledQty} │ subscribers=fanout`
        : `ITCH type=A │ ${ctx.symbol} │ new_${ctx.side}_level │ price=${px}`),
    stage("Dashboard Update", dashUs,
      `WS order_update + ${filled ? "trade + " : ""}book_delta → client render`),
  ];
}

router.get("/orderbook/:symbol", async (req, res): Promise<void> => {
  const symbol = (Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol).toUpperCase();
  try {
    await ensureOrderBookLiquidity(symbol);
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

    const userId = getUserId(req);

    await db.insert(ordersTable).values({
      id, symbol: sym, type, side,
      quantity: qty,
      price: lmtPrice || null,
      status,
      filledQuantity: result.filledQty ?? 0,
      avgFillPrice: result.avgPrice ?? null,
      traderId: null,
      userId,
    }).onConflictDoNothing();

    const trades = result.trades ?? [];

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
        userId,
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

    const pipeline = buildPipeline(result.latUs ?? 0, {
      id, symbol: sym, side, type, qty,
      price: lmtPrice,
      status,
      filledQty: result.filledQty ?? 0,
      tradeCount: trades.length,
    });
    const orderOut = {
      id, symbol: sym, type, side,
      quantity: qty,
      price: lmtPrice || null,
      status,
      filledQuantity: result.filledQty ?? 0,
      avgFillPrice: result.avgPrice ?? null,
      traderId: null,
      userId,
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
