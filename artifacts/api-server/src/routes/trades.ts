import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradesTable, marketEventsTable } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/trades", async (req, res): Promise<void> => {
  const { symbol, limit } = req.query;
  const lim = Math.min(Number(limit) || 100, 500);
  const rows = symbol
    ? await db.select().from(tradesTable).where(eq(tradesTable.symbol, String(symbol).toUpperCase())).orderBy(desc(tradesTable.timestamp)).limit(lim)
    : await db.select().from(tradesTable).orderBy(desc(tradesTable.timestamp)).limit(lim);

  res.json(rows.map(r => ({
    id: r.id,
    symbol: r.symbol,
    price: r.price,
    quantity: r.quantity,
    side: r.side,
    buyOrderId: r.buyOrderId,
    sellOrderId: r.sellOrderId,
    buyTraderId: r.buyTraderId,
    sellTraderId: r.sellTraderId,
    timestamp: r.timestamp?.toISOString() ?? new Date().toISOString(),
  })));
});

router.get("/trades/replay", async (req, res): Promise<void> => {
  const { symbol, since } = req.query;
  const lim = 1000;

  let query = db.select().from(marketEventsTable).orderBy(marketEventsTable.timestamp).limit(lim);

  const rows = symbol
    ? await db.select().from(marketEventsTable).where(eq(marketEventsTable.symbol, String(symbol).toUpperCase())).orderBy(marketEventsTable.timestamp).limit(lim)
    : await db.select().from(marketEventsTable).orderBy(marketEventsTable.timestamp).limit(lim);

  res.json(rows.map(r => ({
    id: r.id,
    type: r.type,
    symbol: r.symbol,
    timestamp: r.timestamp?.toISOString() ?? new Date().toISOString(),
    data: r.data,
  })));
});

export default router;
