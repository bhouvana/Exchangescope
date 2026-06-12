import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { engine } from "../lib/matchingEngine";
import { getStats, setMarketState, resetStats, getMarketState } from "../lib/marketData";
import { stopTrading, resumeTrading } from "../lib/aiTraders";
import { broadcastStats } from "../lib/websocket";
import { db } from "@workspace/db";
import { marketEventsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/market/stats", async (_req, res): Promise<void> => {
  try {
    const engineStats = await engine.getStats();
    const appStats = getStats();

    const merged = {
      ...appStats,
      ordersReceived: Math.max(appStats.ordersReceived, engineStats.ordersReceived ?? 0),
      ordersFilled:   Math.max(appStats.ordersFilled,   engineStats.ordersFilled   ?? 0),
      ordersRejected: Math.max(appStats.ordersRejected, engineStats.ordersRejected ?? 0),
      partialFills:   Math.max(appStats.partialFills,   engineStats.partialFills   ?? 0),
    };

    broadcastStats(merged);
    res.json(merged);
  } catch {
    res.json(getStats());
  }
});

router.post("/market/control", async (req, res): Promise<void> => {
  const { action } = req.body;
  const valid = ["start","pause","reset","flash_crash","bull","bear","volatile"];
  if (!valid.includes(action)) {
    res.status(400).json({ error: "Invalid action" }); return;
  }

  let message = "";
  let state = action;

  switch (action) {
    case "start":
      setMarketState("running");
      resumeTrading();
      message = "Market started";
      break;
    case "pause":
      setMarketState("paused");
      stopTrading();
      message = "Market paused";
      break;
    case "reset":
      setMarketState("running");
      resetStats();
      await engine.reset();
      resumeTrading();
      message = "Market reset";
      break;
    case "flash_crash":
      setMarketState("flash_crash");
      message = "Flash crash initiated — panic selling in progress";
      state = "flash_crash";
      break;
    case "bull":
      setMarketState("bull");
      resumeTrading();
      message = "Bull market scenario activated";
      break;
    case "bear":
      setMarketState("bear");
      resumeTrading();
      message = "Bear market scenario activated";
      break;
    case "volatile":
      setMarketState("volatile");
      resumeTrading();
      message = "High volatility scenario activated";
      break;
  }

  await db.insert(marketEventsTable).values({
    id: uuidv4(),
    type: "market_control",
    symbol: "ALL",
    data: { action, state, message },
  });

  res.json({ action, state: getMarketState(), message });
});

export default router;
