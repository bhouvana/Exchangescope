import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { engine } from "../lib/matchingEngine";
import { getStats, getSymbols, setMarketState, resetStats, getMarketState, getMarketDataMeta, getRegion, setRegion, getRegionMeta, getAllQuotes, enrichCompany } from "../lib/marketData";
import type { Region, Quote } from "../lib/marketData";
import { buildMarketStats, resetRateTracker } from "../lib/marketStats";
import { stopTrading, resumeTrading } from "../lib/aiTraders";
import { broadcastStats } from "../lib/websocket";
import { db } from "@workspace/db";
import { companiesTable, marketEventsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

router.get("/market/info", (_req, res): void => {
  res.json({ ...getMarketDataMeta(), symbolCount: getSymbols().length, region: getRegion(), regionMeta: getRegionMeta() });
});

router.get("/market/region", (_req, res): void => {
  res.json({ region: getRegion(), regionMeta: getRegionMeta() });
});

router.post("/market/region", (req, res): void => {
  const { region } = req.body;
  const validRegions = ["nasdaq", "nyse", "nse", "bse"];
  if (!validRegions.includes(region)) {
    res.status(400).json({ error: "Invalid region. Must be one of: nasdaq, nyse, nse, bse" }); return;
  }
  setRegion(region as Region);
  resetStats();
  res.json({ region: getRegion(), regionMeta: getRegionMeta(), message: `Switched to ${getRegionMeta().label}` });
});

router.get("/market/overview", async (_req, res): Promise<void> => {
  try {
    const region = getRegion();
    const inMemory = getAllQuotes();

    // Build baseline from DB for accurate counts; enrich with in-memory data where available
    const dbCompanies = await db.select({
      symbol: companiesTable.symbol,
      name: companiesTable.name,
      exchange: companiesTable.exchange,
      sector: companiesTable.sector,
      market_cap: companiesTable.marketCap,   // snake_case alias matches enrichCompany signature
    }).from(companiesTable)
      .where(eq(companiesTable.exchange, region))
      .orderBy(sql`random()`)
      .limit(5000);

    const allQuotes: Quote[] = dbCompanies.length === 0
      ? inMemory
      : dbCompanies.map(c => enrichCompany(c));   // enrichCompany now uses market_cap fallback

    // Only use stocks that have a real price for stats and rankings
    const quotes = allQuotes.filter(q => q.price > 0);
    const totalCompanies = allQuotes.length;
    const pricedCount = quotes.length;
    const advancing = quotes.filter(q => q.changePercent > 0).length;
    const declining = quotes.filter(q => q.changePercent < 0).length;
    const unchanged = pricedCount - advancing - declining;
    const topGainers = [...quotes].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const topLosers = [...quotes].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
    const mostActive = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 5);
    const largestCaps = [...quotes].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)).slice(0, 5);

    const sectors = [...new Set(quotes.map(q => q.sector))].sort();
    const sectorPerformance = sectors.map(sec => {
      const secStocks = quotes.filter(q => q.sector === sec && q.price > 0);
      const count = secStocks.length;
      const totalCap = secStocks.reduce((s, q) => s + (q.marketCap ?? 0), 0);
      const avgChange = secStocks.reduce((s, q) => s + q.changePercent, 0) / (count || 1);
      const capWeighted = totalCap > 0
        ? secStocks.reduce((s, q) => s + q.changePercent * (q.marketCap ?? 0), 0) / totalCap
        : avgChange;
      return { sector: sec, count, totalCap, avgChange, capWeighted };
    });

    res.json({
      exchange: getRegionMeta(),
      region,
      totalCompanies,
      pricedCompanies: pricedCount,
      advancing,
      declining,
      unchanged,
      topGainers,
      topLosers,
      mostActive,
      largestCaps,
      sectorPerformance,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to build overview" });
  }
});

router.get("/market/stats", async (_req, res): Promise<void> => {
  try {
    const merged = await buildMarketStats();
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
      resetRateTracker();
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
