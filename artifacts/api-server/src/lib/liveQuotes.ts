import { logger } from "./logger";

export interface LiveQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  previousClose: number;
  updatedAt: string;
}

interface OhlcBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SPARK_URL = "https://query1.finance.yahoo.com/v7/finance/spark";
const CHART_URL  = "https://query1.finance.yahoo.com/v8/finance/chart";
const QUOTE_URL  = "https://query1.finance.yahoo.com/v7/finance/quote";
const BATCH_SIZE = 20;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// Resolution-based config — each entry loads the maximum history Yahoo Finance
// allows for that interval, giving thousands of bars to scroll through freely.
const CHART_CFG: Record<string, { range: string; interval: string }> = {
  "1m":  { range: "7d",  interval: "1m"  },  // max for 1m:  7d  → ~2 730 bars
  "5m":  { range: "1mo", interval: "5m"  },  // 1mo ≈ 22 trading days → ~1716 bars; 3mo exceeds Yahoo's 60d intraday limit
  "15m": { range: "1mo", interval: "15m" },  // 1mo → ~572 bars
  "30m": { range: "1mo", interval: "30m" },  // 1mo → ~286 bars
  "1h":  { range: "2y",  interval: "60m" },  // max for 60m: 2y  → ~3 250 bars
  "1d":  { range: "max", interval: "1d"  },  // daily:  max history → ~2 500+ bars
  "1w":  { range: "max", interval: "1wk" },  // weekly: max history → ~500+ bars
  "1M":  { range: "max", interval: "1mo" },  // monthly: max history → ~120+ bars
  // Long-form period keys from frontend
  "3M":  { range: "max", interval: "1d"  },
  "6M":  { range: "max", interval: "1d"  },
  "1Y":  { range: "max", interval: "1d"  },
  "5Y":  { range: "max", interval: "1wk" },
  // Legacy keys kept so any cached/persisted requests don't 404
  "5d":  { range: "5d",  interval: "5m"  },
  "1mo": { range: "max", interval: "1d"  },
  "3mo": { range: "max", interval: "1d"  },
  "6mo": { range: "max", interval: "1d"  },
  "1y":  { range: "max", interval: "1d"  },
  "5y":  { range: "max", interval: "1wk" },
  "max": { range: "max", interval: "1mo" },
};

// Fallback range sequences for intraday periods — if 1mo returns empty (e.g. very illiquid stocks),
// try 5d and finally fall back to daily bars so the chart is never blank.
const INTRADAY_FALLBACKS: Record<string, Array<{ range: string; interval: string }>> = {
  "5m":  [
    { range: "5d",  interval: "5m"  },
    { range: "max", interval: "1d"  },  // daily bars as last resort
  ],
  "15m": [
    { range: "5d",  interval: "15m" },
    { range: "max", interval: "1d"  },
  ],
  "30m": [
    { range: "5d",  interval: "30m" },
    { range: "max", interval: "1d"  },
  ],
};

const cache = new Map<string, LiveQuote>();
const historyCache = new Map<string, { at: number; bars: OhlcBar[] }>();

let lastRefresh: string | null = null;
let refreshInFlight = false;

/** Update cache while preserving enriched fields (marketCap, peRatio) that the spark/chart
 *  endpoints don't return — prevents background-enriched values from being wiped on refresh. */
function cacheSet(symbol: string, q: LiveQuote): void {
  const existing = cache.get(symbol);
  if (existing) {
    if (q.marketCap === 0 && existing.marketCap > 0) q.marketCap = existing.marketCap;
    if (q.peRatio === 0 && existing.peRatio > 0) q.peRatio = existing.peRatio;
  }
  cache.set(symbol, q);
}
let liveMode = false;
let yahooSuffix = ""; // ".BO" for BSE, "" for NASDAQ
let activeSymbols: string[] = [];
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const YAHOO_OVERRIDES: Record<string, string> = {
  NIFTY: "^NSEI",
  NIFTY_NS: "^NSEI",
};

const YAHOO_REVERSE: Record<string, string> = {
  "^NSEI": "NIFTY",
};

export function toYahooSymbol(sym: string): string {
  if (YAHOO_OVERRIDES[sym]) return YAHOO_OVERRIDES[sym];
  const base = sym.replace(/_/g, "-");
  return yahooSuffix && !base.endsWith(yahooSuffix) ? base + yahooSuffix : base;
}

export function fromYahooSymbol(sym: string): string {
  if (YAHOO_REVERSE[sym]) return YAHOO_REVERSE[sym];
  const stripped = yahooSuffix && sym.endsWith(yahooSuffix)
    ? sym.slice(0, -yahooSuffix.length) : sym;
  return stripped.replace(/-/g, "_");
}

export function setYahooSuffix(suffix: string) {
  yahooSuffix = suffix;
}

export function getLiveQuote(symbol: string): LiveQuote | undefined {
  return cache.get(symbol);
}

export function getYahooSuffix(): string {
  return yahooSuffix;
}

export function isLiveMode(): boolean {
  return liveMode;
}

export function getLiveQuoteMeta() {
  return {
    dataSource: liveMode ? (yahooSuffix === ".BO" ? "bse-live" as const : "nasdaq-live" as const) : "simulated" as const,
    quotesLoaded: cache.size,
    lastRefresh,
  };
}

interface SparkMeta {
  symbol?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  longName?: string;
  shortName?: string;
}

async function fetchSparkBatch(symbols: string[]): Promise<LiveQuote[]> {
  if (!symbols.length) return [];

  const yahooSyms = symbols.map(toYahooSymbol).join(",");
  const url = `${SPARK_URL}?symbols=${encodeURIComponent(yahooSyms)}&range=1d&interval=5m`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Yahoo spark HTTP ${res.status}`);

  const data = await res.json() as {
    spark?: {
      result?: Array<{ symbol?: string; response?: Array<{ meta?: SparkMeta }> }>;
      error?: { description?: string };
    };
  };

  if (data.spark?.error) {
    throw new Error(data.spark.error.description ?? "Yahoo spark error");
  }

  const out: LiveQuote[] = [];
  for (const item of data.spark?.result ?? []) {
    const meta = item.response?.[0]?.meta;
    if (!meta) continue;

    const price = meta.regularMarketPrice;
    if (!price || price <= 0) continue;

    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    const changePercent = prev > 0 ? (change / prev) * 100 : 0;
    const symbol = fromYahooSymbol(meta.symbol ?? item.symbol ?? "");

    out.push({
      symbol,
      name: meta.longName ?? meta.shortName ?? symbol,
      price,
      change,
      changePercent,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: 0,
      peRatio: 0,
      week52High: meta.fiftyTwoWeekHigh ?? price,
      week52Low: meta.fiftyTwoWeekLow ?? price,
      previousClose: prev,
      updatedAt: new Date().toISOString(),
    });
  }

  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function refreshLiveQuotes(symbols: string[], onRefreshed?: () => void): Promise<number> {
  if (refreshInFlight) return cache.size;
  refreshInFlight = true;

  try {
    const batches = chunk(symbols, BATCH_SIZE);
    let loaded = 0;

    for (const batch of batches) {
      try {
        const quotes = await fetchSparkBatch(batch);
        for (const q of quotes) {
          cacheSet(q.symbol, q);
          loaded++;
        }
        // Fallback: if Spark API returned 0 and suffix is .BO, try chart API per-symbol
        if (quotes.length === 0 && yahooSuffix === ".BO") {
          logger.warn({ batch: batch.length }, "Spark API returned 0 for BSE batch — falling back to chart API");
          const chartQuotes = await fetchChartBatch(batch);
          for (const q of chartQuotes) {
            cacheSet(q.symbol, q);
            loaded++;
          }
        }
      } catch (err) {
        logger.warn({ err, batch: batch.length }, "Live quote batch failed");
        // On error with .BO suffix, try chart API fallback
        if (yahooSuffix === ".BO") {
          const chartQuotes = await fetchChartBatch(batch);
          for (const q of chartQuotes) {
            cacheSet(q.symbol, q);
            loaded++;
          }
        }
      }
      if (batches.length > 1) await sleep(200);
    }

    if (loaded > 0) {
      liveMode = true;
      lastRefresh = new Date().toISOString();
      logger.info({ loaded, total: symbols.length, suffix: yahooSuffix || "none" }, "Live quotes refreshed");
      onRefreshed?.();
    }

    return cache.size;
  } finally {
    refreshInFlight = false;
  }
}

export function initLiveQuotes(symbols: string[], intervalMs = 30_000, onRefreshed?: () => void) {
  activeSymbols = symbols;
  refreshLiveQuotes(symbols, onRefreshed).catch(err => {
    logger.error({ err }, "Initial live quote fetch failed — using simulated fallback");
  });

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    refreshLiveQuotes(activeSymbols, onRefreshed).catch(err => {
      logger.warn({ err }, "Live quote refresh failed");
    });
  }, intervalMs);
}

/** Re-initialize live quotes with a new set of symbols (e.g. on region switch).
 *  Uses a shadow cache so old data remains visible until new data is fully loaded. */
export function switchLiveSymbols(symbols: string[], onRefreshed?: () => void) {
  activeSymbols = symbols;
  // Do NOT clear cache or set liveMode=false here.
  // Instead, fetch into a shadow map and swap atomically when complete.
  shadowSwitch(symbols, onRefreshed).catch(err => {
    logger.warn({ err }, "Live quote switch failed");
  });
}

async function shadowSwitch(symbols: string[], onRefreshed?: () => void): Promise<void> {
  if (refreshInFlight) return;
  refreshInFlight = true;

  const shadow = new Map<string, LiveQuote>();
  const batches = chunk(symbols, BATCH_SIZE);
  let loaded = 0;

  try {
    for (const batch of batches) {
      try {
        const quotes = await fetchSparkBatch(batch);
        for (const q of quotes) {
          shadow.set(q.symbol, q);
          loaded++;
        }
      } catch (err) {
        logger.warn({ err, batch: batch.length }, "Shadow switch batch failed");
      }
      if (batches.length > 1) await sleep(200);
    }

    if (loaded > 0) {
      // Atomic swap: replace cache and set liveMode in one go
      cache.clear();
      for (const [k, v] of shadow) cache.set(k, v);
      liveMode = true;
      lastRefresh = new Date().toISOString();
      logger.info({ loaded, total: symbols.length, suffix: yahooSuffix || "none" }, "Live quotes switched (shadow swap)");
      onRefreshed?.();
    }
  } finally {
    refreshInFlight = false;
  }
}

export async function fetchLiveHistory(symbol: string, period: string): Promise<OhlcBar[]> {
  const cacheKey = `${symbol}:${period}`;
  const cached = historyCache.get(cacheKey);
  const ttl = period === "1m" ? 30_000 : period === "5m" || period === "15m" || period === "30m" ? 60_000 : 900_000;
  if (cached && Date.now() - cached.at < ttl) return cached.bars;

  const cfg = CHART_CFG[period] ?? CHART_CFG["1d"];
  const ySym = toYahooSymbol(symbol);

  const attempts: Array<{ range: string; interval: string }> = [
    { range: cfg.range, interval: cfg.interval },
    ...(INTRADAY_FALLBACKS[period] ?? []),
  ];

  for (const attempt of attempts) {
    try {
      const url = `${CHART_URL}/${ySym}?range=${attempt.range}&interval=${attempt.interval}&includePrePost=false`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const data = await res.json();
      const bars = parseChartBars(data);
      if (bars.length > 0) {
        historyCache.set(cacheKey, { at: Date.now(), bars });
        return bars;
      }
    } catch { /* try next attempt */ }
  }

  return [];
}

/** Parse OHLC bars from a Yahoo Finance chart API response. */
function parseChartBars(data: any): OhlcBar[] {
  const result = data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const quotes = result?.indicators?.quote?.[0] ?? {};
  const bars: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quotes.open?.[i];
    const close = quotes.close?.[i];
    if (open == null || close == null || isNaN(open) || isNaN(close)) continue;
    bars.push({
      timestamp: new Date((timestamps[i] ?? 0) * 1000).toISOString(),
      open: +open.toFixed(4),
      high: +(quotes.high?.[i] ?? open).toFixed(4),
      low: +(quotes.low?.[i] ?? open).toFixed(4),
      close: +close.toFixed(4),
      volume: Math.round(quotes.volume?.[i] ?? 0),
    });
  }
  return bars;
}

/** Fetch live history using a specific Yahoo Finance suffix instead of the global one.
 *  For intraday periods (5m, 15m, 30m), tries progressively shorter ranges as fallback
 *  because international exchanges (BSE, NSE) have less intraday history than US exchanges. */
export async function fetchLiveHistoryWithSuffix(symbol: string, period: string, suffix: string): Promise<OhlcBar[]> {
  const cacheKey = `${symbol}:${period}:${suffix}`;
  const cached = historyCache.get(cacheKey);
  const ttl = period === "1m" ? 30_000 : period === "5m" || period === "15m" || period === "30m" ? 60_000 : 900_000;
  if (cached && Date.now() - cached.at < ttl) return cached.bars;

  const cfg = CHART_CFG[period] ?? CHART_CFG["1d"];
  const base = symbol.replace(/_/g, "-");
  const ySym = suffix && !base.endsWith(suffix) ? base + suffix : base;

  // Build ordered list of (range, interval) attempts for this period
  const attempts: Array<{ range: string; interval: string }> = [
    { range: cfg.range, interval: cfg.interval },
    ...(INTRADAY_FALLBACKS[period] ?? []),
  ];

  for (const attempt of attempts) {
    try {
      const url = `${CHART_URL}/${ySym}?range=${attempt.range}&interval=${attempt.interval}&includePrePost=false`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const data = await res.json();
      const bars = parseChartBars(data);
      if (bars.length > 0) {
        historyCache.set(cacheKey, { at: Date.now(), bars });
        return bars;
      }
    } catch { /* try next attempt */ }
  }

  return [];
}

/**
 * Generate synthetic OHLC bars from a live quote when Yahoo Finance is unavailable.
 * Produces a realistic-looking chart using the live price, change%, and 52-week range.
 * Used as the last-resort fallback so charts are never blank when we have live price data.
 */
export function generateSyntheticBars(quote: LiveQuote, period: string): OhlcBar[] {
  const { price, changePercent, volume, week52High, week52Low } = quote;
  if (!price || price <= 0) return [];

  const prevClose = changePercent !== 0 ? price / (1 + changePercent / 100) : price * 0.999;

  const isIntraday = ["1m", "5m", "15m", "30m", "1h"].includes(period);

  const intervalMs: Record<string, number> = {
    "1m": 60_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
    "1h": 3_600_000, "1d": 86_400_000, "1w": 604_800_000, "1M": 2_592_000_000,
    "3M": 86_400_000, "6M": 86_400_000, "1Y": 86_400_000, "5Y": 604_800_000,
    "max": 86_400_000,
  };
  const msPerBar = intervalMs[period] ?? 86_400_000;
  const nBars = isIntraday ? 78 : 250;
  const now = Date.now();
  const bars: OhlcBar[] = [];

  if (isIntraday) {
    // Walk from prevClose to current price across the trading day
    let p = prevClose;
    const step = (price - prevClose) / nBars;
    const vol = price * 0.0015; // per-bar volatility

    for (let i = 0; i < nBars; i++) {
      // Deterministic noise seeded by (symbol hash + bar index) for chart stability
      const seed = (price * 1000 + i * 37) % 1;
      const noise = (((price * 13 + i * 7) % 100) / 100 - 0.5) * vol * 2;
      const open = p;
      const close = Math.max(price * 0.001, open + step + noise);
      const spread = Math.abs(close - open) * 0.4 + vol * 0.2;
      const highNoise = ((price * 17 + i * 11) % 100) / 100;
      const lowNoise  = ((price * 19 + i * 13) % 100) / 100;
      bars.push({
        timestamp: new Date(now - (nBars - i) * msPerBar).toISOString(),
        open: +open.toFixed(4),
        high: +(Math.max(open, close) + spread * highNoise).toFixed(4),
        low:  +(Math.max(Math.min(open, close) - spread * lowNoise, price * 0.001)).toFixed(4),
        close: +close.toFixed(4),
        volume: Math.round(volume / nBars),
      });
      p = close;
    }
  } else {
    // Walk from 52W low toward current price with upward trend
    const rangeStart = week52Low > 0 ? week52Low : price * 0.65;
    const step = (price - rangeStart) / nBars;
    const vol = price * 0.012;
    let p = rangeStart;

    for (let i = 0; i < nBars; i++) {
      const noise = (((price * 13 + i * 7) % 100) / 100 - 0.44) * vol;
      const open = p;
      const close = Math.max(price * 0.001, open + step + noise);
      const spread = Math.abs(close - open) * 0.5 + vol * 0.25;
      const highNoise = ((price * 17 + i * 11) % 100) / 100;
      const lowNoise  = ((price * 19 + i * 13) % 100) / 100;
      bars.push({
        timestamp: new Date(now - (nBars - i) * msPerBar).toISOString(),
        open: +open.toFixed(4),
        high: +(Math.max(open, close) + spread * highNoise).toFixed(4),
        low:  +(Math.max(Math.min(open, close) - spread * lowNoise, price * 0.001)).toFixed(4),
        close: +close.toFixed(4),
        volume: Math.round(volume),
      });
      p = close;
    }
  }

  return bars;
}

/** Fallback: fetch quotes from chart API per-symbol (used when Spark API fails for .BO suffixes) */
async function fetchChartBatch(symbols: string[]): Promise<LiveQuote[]> {
  const results: LiveQuote[] = [];
  for (const sym of symbols) {
    try {
      const ySym = toYahooSymbol(sym);
      const url = `${CHART_URL}/${encodeURIComponent(ySym)}?range=1d&interval=5m&includePrePost=false`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const data = await res.json() as any;
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) continue;
      const price = meta.regularMarketPrice;
      if (!price || price <= 0) continue;
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
      results.push({
        symbol: sym,
        name: meta.longName ?? meta.shortName ?? sym,
        price,
        change: price - prev,
        changePercent: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volume: meta.regularMarketVolume ?? 0,
        marketCap: 0,
        peRatio: 0,
        week52High: meta.fiftyTwoWeekHigh ?? price,
        week52Low: meta.fiftyTwoWeekLow ?? price,
        previousClose: prev,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Skip failed symbols
    }
    // Throttle individual chart API calls to avoid rate limits
    await sleep(150);
  }
  return results;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Multi-exchange support ────────────────────────────────────────────────────

export interface ExchangeDef {
  name: string;
  symbols: string[];
  suffix: string;
}

/** Like fetchSparkBatch but uses an explicit suffix instead of the global. */
async function fetchSparkBatchWithSuffix(symbols: string[], suffix: string): Promise<LiveQuote[]> {
  if (!symbols.length) return [];
  const yahooSyms = symbols.map(sym => {
    if (YAHOO_OVERRIDES[sym]) return YAHOO_OVERRIDES[sym];
    const base = sym.replace(/_/g, "-");
    return suffix && !base.endsWith(suffix) ? base + suffix : base;
  }).join(",");

  const url = `${SPARK_URL}?symbols=${encodeURIComponent(yahooSyms)}&range=1d&interval=5m`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Yahoo spark HTTP ${res.status}`);

  const data = await res.json() as {
    spark?: { result?: Array<{ symbol?: string; response?: Array<{ meta?: SparkMeta }> }>; error?: { description?: string } };
  };
  if (data.spark?.error) throw new Error(data.spark.error.description ?? "Yahoo spark error");

  const out: LiveQuote[] = [];
  for (const item of data.spark?.result ?? []) {
    const meta = item.response?.[0]?.meta;
    if (!meta) continue;
    const price = meta.regularMarketPrice;
    if (!price || price <= 0) continue;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    const changePercent = prev > 0 ? (change / prev) * 100 : 0;
    // Strip Yahoo suffix to get the plain symbol key stored in cache
    let rawSym = meta.symbol ?? item.symbol ?? "";
    if (YAHOO_REVERSE[rawSym]) rawSym = YAHOO_REVERSE[rawSym];
    else if (suffix && rawSym.endsWith(suffix)) rawSym = rawSym.slice(0, -suffix.length);
    const symbol = rawSym.replace(/-/g, "_");
    out.push({
      symbol, name: meta.longName ?? meta.shortName ?? symbol,
      price, change, changePercent,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: 0, peRatio: 0,
      week52High: meta.fiftyTwoWeekHigh ?? price,
      week52Low: meta.fiftyTwoWeekLow ?? price,
      previousClose: prev,
      updatedAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Concurrent chart-API fallback with explicit suffix (5 parallel requests). */
async function fetchChartBatchWithSuffix(symbols: string[], suffix: string): Promise<LiveQuote[]> {
  const CONCURRENCY = 5;
  const results: LiveQuote[] = [];
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(async sym => {
      const base = sym.replace(/_/g, "-");
      const ySym = suffix && !base.endsWith(suffix) ? base + suffix : base;
      const url = `${CHART_URL}/${encodeURIComponent(ySym)}?range=1d&interval=5m&includePrePost=false`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) return null;
      const data = await res.json() as any;
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice;
      if (!price || price <= 0) return null;
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
      return {
        symbol: sym, name: meta.longName ?? meta.shortName ?? sym,
        price, change: price - prev,
        changePercent: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volume: meta.regularMarketVolume ?? 0,
        marketCap: 0, peRatio: 0,
        week52High: meta.fiftyTwoWeekHigh ?? price,
        week52Low: meta.fiftyTwoWeekLow ?? price,
        previousClose: prev,
        updatedAt: new Date().toISOString(),
      } as LiveQuote;
    }));
    for (const r of settled) if (r.status === "fulfilled" && r.value) results.push(r.value);
    await sleep(250);
  }
  return results;
}

/** Fetch one full exchange: spark batch first, chart API for misses. */
export async function fetchAllExchange(symbols: string[], suffix: string, name: string): Promise<number> {
  let loaded = 0;
  const batches = chunk(symbols, BATCH_SIZE);
  for (const batch of batches) {
    try {
      const quotes = await fetchSparkBatchWithSuffix(batch, suffix);
      const fetched = new Set(quotes.map(q => q.symbol));
      for (const q of quotes) { cacheSet(q.symbol, q); loaded++; }
      // Chart-API fallback for symbols the spark endpoint missed
      const missing = batch.filter(s => !fetched.has(s));
      if (missing.length > 0) {
        const fallback = await fetchChartBatchWithSuffix(missing, suffix);
        for (const q of fallback) { cacheSet(q.symbol, q); loaded++; }
      }
    } catch (err) {
      logger.warn({ err, exchange: name, batch: batch.length }, "Spark batch failed, using chart fallback");
      try {
        const fallback = await fetchChartBatchWithSuffix(batch, suffix);
        for (const q of fallback) { cacheSet(q.symbol, q); loaded++; }
      } catch { /* skip */ }
    }
    await sleep(200);
  }
  return loaded;
}

// ── Yahoo Finance crumb/cookie management ────────────────────────────────────
// v7/finance/quote requires a crumb+cookie pair to return full data.
// We fetch both once and refresh on 401/unauthorised responses.

let yfinCrumb: string | null = null;
let yfinCookies: string = "";

async function refreshYfinCredentials(): Promise<boolean> {
  try {
    const fcRes = await fetch("https://fc.yahoo.com/", {
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    const raw = fcRes.headers.get("set-cookie") ?? "";
    // Keep only the A3 / B session cookie that the quote API needs
    yfinCookies = raw.split(",").map(s => s.split(";")[0].trim()).join("; ");

    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...FETCH_HEADERS, Cookie: yfinCookies },
    });
    if (!crumbRes.ok) return false;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes("<")) return false; // got HTML — blocked
    yfinCrumb = crumb;
    logger.info({ crumb: crumb.slice(0, 6) + "…" }, "Yahoo Finance crumb refreshed");
    return true;
  } catch (err) {
    logger.warn({ err }, "Yahoo Finance crumb refresh failed");
    return false;
  }
}

/**
 * Enrich live-cache entries with marketCap + peRatio from Yahoo Finance v7/quote.
 * Works for ALL exchanges (US and Indian) — no Finnhub key required.
 * Batches 20 symbols per request; retries once on 401 after refreshing the crumb.
 * Sorted by volume so the most-visible stocks get data first.
 */
async function enrichWithYahooQuotes(symbols: string[], suffix: string): Promise<void> {
  if (suffix !== "") return; // Market cap not shown for NSE/BSE — skip enrichment
  const pricedSyms = symbols
    .filter(s => (cache.get(s)?.price ?? 0) > 0)
    .sort((a, b) => (cache.get(b)?.volume ?? 0) - (cache.get(a)?.volume ?? 0));

  if (pricedSyms.length === 0) return;

  if (!yfinCrumb) {
    const ok = await refreshYfinCredentials();
    if (!ok) {
      // Fall back to Finnhub for US stocks if crumb unavailable
      await enrichCacheWithFinnhub(symbols, suffix);
      return;
    }
  }

  const BATCH = 20;
  const batches = chunk(pricedSyms, BATCH);

  for (const batch of batches) {
    const yahooSyms = batch.map(s => {
      if (YAHOO_OVERRIDES[s]) return YAHOO_OVERRIDES[s];
      const base = s.replace(/_/g, "-");
      return suffix && !base.endsWith(suffix) ? base + suffix : base;
    });

    const tryFetch = async (): Promise<boolean> => {
      try {
        const url = `${QUOTE_URL}?symbols=${encodeURIComponent(yahooSyms.join(","))}&crumb=${encodeURIComponent(yfinCrumb!)}`;
        const res = await fetch(url, {
          headers: { ...FETCH_HEADERS, Cookie: yfinCookies },
        });

        if (res.status === 401 || res.status === 403) {
          yfinCrumb = null;
          return false; // signal retry
        }
        if (!res.ok) return true; // non-auth error, skip batch

        const data = await res.json() as any;
        const results: any[] = data?.quoteResponse?.result ?? [];

        for (const q of results) {
          let sym: string = q.symbol ?? "";
          if (YAHOO_REVERSE[sym]) sym = YAHOO_REVERSE[sym];
          else if (suffix && sym.endsWith(suffix)) sym = sym.slice(0, -suffix.length);
          sym = sym.replace(/-/g, "_");

          const entry = cache.get(sym);
          if (!entry) continue;
          if ((q.marketCap ?? 0) > 0)   entry.marketCap = q.marketCap;
          if ((q.trailingPE ?? 0) > 0)  entry.peRatio   = q.trailingPE;
          if ((q.fiftyTwoWeekHigh ?? 0) > 0) entry.week52High = q.fiftyTwoWeekHigh;
          if ((q.fiftyTwoWeekLow  ?? 0) > 0) entry.week52Low  = q.fiftyTwoWeekLow;
        }
        return true;
      } catch {
        return true; // network error, move on
      }
    };

    const ok = await tryFetch();
    if (!ok) {
      // Crumb expired — refresh once and retry
      const renewed = await refreshYfinCredentials();
      if (renewed) await tryFetch();
    }

    await sleep(250); // ~80 req/min — well within Yahoo's tolerance
  }
}

/**
 * Finnhub fallback for US stocks when the Yahoo crumb flow is unavailable.
 * Rate: 1 call per ~1.1 s ≈ 54 calls/min (under the 60/min free-tier limit).
 */
async function enrichCacheWithFinnhub(symbols: string[], suffix: string): Promise<void> {
  if (suffix !== "") return; // Finnhub free tier is US-only
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  if (!apiKey) return;

  const pricedSyms = symbols
    .filter(s => (cache.get(s)?.price ?? 0) > 0 && (cache.get(s)?.marketCap ?? 0) === 0)
    .sort((a, b) => (cache.get(b)?.volume ?? 0) - (cache.get(a)?.volume ?? 0));

  for (const sym of pricedSyms) {
    try {
      const fSym = YAHOO_OVERRIDES[sym] ?? sym.replace(/_/g, "-");
      const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(fSym)}&token=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const data = await res.json() as any;
      const mktCapMillions = data.marketCapitalization ?? 0;
      if (mktCapMillions <= 0) continue;
      const entry = cache.get(sym);
      if (!entry) continue;
      entry.marketCap = mktCapMillions * 1_000_000;
      if ((data.name ?? "").trim()) entry.name = data.name.trim();
    } catch { /* skip symbol */ }
    await sleep(1100);
  }
}

/** Replace initLiveQuotes/switchLiveSymbols: fetch all 4 exchanges at startup, refresh every 2 min. */
export function initAllExchanges(exchanges: ExchangeDef[]) {
  if (refreshInterval) clearInterval(refreshInterval);

  const doFetchAll = async () => {
    for (const ex of exchanges) {
      try {
        const loaded = await fetchAllExchange(ex.symbols, ex.suffix, ex.name);
        logger.info({ exchange: ex.name, loaded, cacheSize: cache.size }, "Exchange quotes refreshed");
        // Background-enrich with marketCap + PE via Yahoo v7/quote (crumb auth).
        // Works for all 4 exchanges. Falls back to Finnhub for US if crumb unavailable.
        enrichWithYahooQuotes(ex.symbols, ex.suffix).catch(err =>
          logger.warn({ err, exchange: ex.name }, "Yahoo quote enrichment failed"),
        );
      } catch (err) {
        logger.warn({ err, exchange: ex.name }, "Exchange fetch failed");
      }
    }
    liveMode = true;
    lastRefresh = new Date().toISOString();
    logger.info({ cacheSize: cache.size }, "All-exchange refresh complete");
  };

  // Initial fetch in background; don't block server startup
  doFetchAll().catch(err => logger.error({ err }, "Initial all-exchange fetch failed"));

  // Refresh every 2 minutes (staggered naturally because they run sequentially)
  refreshInterval = setInterval(() => {
    doFetchAll().catch(err => logger.warn({ err }, "All-exchange refresh failed"));
  }, 120_000);
}
