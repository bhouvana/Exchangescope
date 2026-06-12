import { Router, type IRouter } from "express";
import { getTraders } from "../lib/aiTraders";

const router: IRouter = Router();

router.get("/traders", async (_req, res): Promise<void> => {
  const traders = getTraders();
  res.json(traders.map(t => ({
    id: t.id,
    type: t.type,
    symbol: t.symbol,
    ordersPlaced: t.ordersPlaced,
    fills: t.fills,
    pnl: +t.pnl.toFixed(2),
    isActive: t.isActive,
    lastAction: t.lastAction,
  })));
});

export default router;
