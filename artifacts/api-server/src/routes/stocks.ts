import { Router, type IRouter } from "express";
import { getAllQuotes, getQuote, getHistory, getRegion, getRegionMeta, getActiveSymbolData, enrichCompany, findSymbolData, setEnrichedCache } from "../lib/marketData";
import { getLiveQuote, generateSyntheticBars } from "../lib/liveQuotes";
import { db } from "@workspace/db";
import { companiesTable, exchangesTable } from "@workspace/db/schema";
import { eq, like, or, and, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const YAHOO_SUFFIX: Record<string, string> = {
  nasdaq: "", nyse: "", nse: ".NS", bse: ".BO",
};

const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function yahooQuote(sym: string, suffix: string): Promise<any> {
  const ySym = suffix && !sym.endsWith(suffix) ? sym + suffix : sym;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?range=1d&interval=5m&includePrePost=false`;
  const res = await fetch(url, { headers: { "User-Agent": YAHOO_UA, Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { chart?: { result?: any[] } };
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quotes = result?.indicators?.quote?.[0] ?? {};
  const bars: any[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quotes.open?.[i];
    const close = quotes.close?.[i];
    if (open == null || close == null) continue;
    bars.push({ open, close, high: quotes.high?.[i] ?? close, low: quotes.low?.[i] ?? close, volume: quotes.volume?.[i] ?? 0 });
  }
  return bars.length > 0 ? bars : null;
}

router.get("/stocks", async (req, res): Promise<void> => {
  const exchange = req.query.exchange as string || "";
  if (exchange && ["nasdaq", "nyse", "nse", "bse"].includes(exchange)) {
    const stocks = await db.select().from(companiesTable)
      .where(eq(companiesTable.exchange, exchange))
      .orderBy(desc(companiesTable.marketCap))
      .limit(200);
    const withQuotes = stocks.map(s => {
      const quote = getQuote(s.symbol);
      return quote ? { ...s, ...quote } : s;
    });
    res.json(withQuotes);
  } else {
    res.json(getAllQuotes());
  }
});

router.get("/stocks/:symbol", async (req, res): Promise<void> => {
  const sym = (Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol).toUpperCase();

  // 1. Look up company from DB for name/sector
  const rows = await db.select({
    symbol: companiesTable.symbol,
    name: companiesTable.name,
    exchange: companiesTable.exchange,
    sector: companiesTable.sector,
    market_cap: companiesTable.marketCap,
  }).from(companiesTable).where(eq(companiesTable.symbol, sym)).limit(1);
  const c = rows[0];

  // 3. Try Yahoo Finance with each exchange suffix until one works
  // (INFY exists as nyse/nse/bse; we need to try .NS to get INR price)
  const suffixesToTry = [".NS", ".BO", ""];
  for (const suffix of suffixesToTry) {
    try {
      const bars = await yahooQuote(sym, suffix);
      if (bars) {
        const last = bars[bars.length - 1];
        const prevClose = bars.length > 1 ? bars[bars.length - 2].close : last.close;
        const change = last.close - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const liveQ = getLiveQuote(sym);
        const result = {
          symbol: sym,
          name: c?.name || sym,
          sector: c?.sector || "",
          price: +last.close.toFixed(2),
          change: +change.toFixed(2),
          changePercent: +changePercent.toFixed(2),
          volume: last.volume,
          marketCap: liveQ?.marketCap ?? 0,
          peRatio: liveQ?.peRatio ?? 0,
          week52High: liveQ?.week52High ?? last.close,
          week52Low: liveQ?.week52Low ?? last.close,
          updatedAt: new Date().toISOString(),
        };
        setEnrichedCache(sym, result);
        res.json(result);
        return;
      }
    } catch { /* try next suffix */ }
  }

  // 4. Fall back to DB enrich
  if (c) { res.json(enrichCompany(c)); return; }
  res.status(404).json({ error: "Symbol not found" });
});

router.get("/stocks/:symbol/history/:period", async (req, res): Promise<void> => {
  const sym    = (Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol).toUpperCase();
  const period = Array.isArray(req.params.period) ? req.params.period[0] : req.params.period;

  // Look up exchange to use the correct Yahoo suffix
  const rows = await db.select({ exchange: companiesTable.exchange })
    .from(companiesTable).where(eq(companiesTable.symbol, sym)).limit(1);

  const suffix = rows.length > 0 ? (YAHOO_SUFFIX[rows[0].exchange] ?? "") : undefined;
  const history = await getHistory(sym, period, suffix);

  if (history.length > 0) {
    res.json(history);
    return;
  }

  // Yahoo Finance failed (rate-limited, market closed, or symbol unavailable).
  // Generate synthetic bars from the live quote so the chart is never blank.
  const live = getLiveQuote(sym);
  if (live && live.price > 0) {
    const synthetic = generateSyntheticBars(live, period);
    if (synthetic.length > 0) {
      res.set("X-Data-Source", "synthetic");
      res.json(synthetic);
      return;
    }
  }

  res.status(404).json({ error: "No chart data available for " + sym });
});

export default router;
