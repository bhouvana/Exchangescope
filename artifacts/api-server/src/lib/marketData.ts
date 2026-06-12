// Realistic market data simulation — no Python dependency

export interface Quote {
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
  updatedAt: string;
}

export interface OhlcBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SymbolMeta {
  name: string;
  basePrice: number;
  marketCap: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  baseVolume: number;
}

const SYMBOLS: Record<string, SymbolMeta> = {
  AAPL: { name: "Apple Inc.", basePrice: 212.5, marketCap: 3.25e12, peRatio: 33.4, week52High: 237.23, week52Low: 164.08, baseVolume: 62_000_000 },
  MSFT: { name: "Microsoft Corp.", basePrice: 424.8, marketCap: 3.16e12, peRatio: 36.7, week52High: 468.35, week52Low: 344.79, baseVolume: 22_000_000 },
  NVDA: { name: "NVIDIA Corp.", basePrice: 138.9, marketCap: 3.41e12, peRatio: 52.1, week52High: 153.13, week52Low: 76.21, baseVolume: 280_000_000 },
  GOOG: { name: "Alphabet Inc.", basePrice: 177.4, marketCap: 2.16e12, peRatio: 22.9, week52High: 207.05, week52Low: 140.53, baseVolume: 26_000_000 },
  AMZN: { name: "Amazon.com Inc.", basePrice: 198.6, marketCap: 2.11e12, peRatio: 42.3, week52High: 230.00, week52Low: 151.61, baseVolume: 36_000_000 },
  META: { name: "Meta Platforms Inc.", basePrice: 572.3, marketCap: 1.44e12, peRatio: 27.8, week52High: 638.40, week52Low: 414.50, baseVolume: 18_000_000 },
  TSLA: { name: "Tesla Inc.", basePrice: 248.7, marketCap: 7.97e11, peRatio: 95.6, week52High: 488.54, week52Low: 138.80, baseVolume: 82_000_000 },
};

// Live prices — drift throughout the session
const prices: Record<string, number> = {};
const openPrices: Record<string, number> = {};
const sessionVolumes: Record<string, number> = {};
const histories: Record<string, OhlcBar[]> = {};

// Market scenario modifier
type MarketState = "running" | "paused" | "flash_crash" | "bull" | "bear" | "volatile";
let marketState: MarketState = "running";
let isPaused = false;
let marketStartTime = Date.now();

// Statistics
let ordersReceivedTotal = 0;
let ordersFilledTotal = 0;
let ordersRejectedTotal = 0;
let partialFillsTotal = 0;
let ordersPerSecond = 0;
let tradesPerSecond = 0;
let queueDepth = 0;

// Engine latency trackers
export const latencyStats = {
  gatewayUs: 42,
  queueUs: 125,
  matchingUs: 89,
  totalUs: 256,
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Initialize
for (const [sym, meta] of Object.entries(SYMBOLS)) {
  const jitter = rand(0.97, 1.03);
  prices[sym] = meta.basePrice * jitter;
  openPrices[sym] = prices[sym];
  sessionVolumes[sym] = 0;
  histories[sym] = generateHistory(sym, "1d");
}

function generateHistory(symbol: string, period: string): OhlcBar[] {
  const meta = SYMBOLS[symbol];
  if (!meta) return [];

  const bars: OhlcBar[] = [];
  const periodsMap: Record<string, { count: number; intervalMs: number }> = {
    "1d":  { count: 78, intervalMs: 5 * 60 * 1000 },    // 5-min bars, ~6.5h
    "5d":  { count: 100, intervalMs: 30 * 60 * 1000 },
    "1mo": { count: 30, intervalMs: 24 * 60 * 60 * 1000 },
    "3mo": { count: 65, intervalMs: 24 * 60 * 60 * 1000 },
    "6mo": { count: 130, intervalMs: 24 * 60 * 60 * 1000 },
    "1y":  { count: 252, intervalMs: 24 * 60 * 60 * 1000 },
  };

  const cfg = periodsMap[period] ?? periodsMap["1d"];
  const now = Date.now();
  let price = meta.basePrice * rand(0.85, 0.95);

  for (let i = cfg.count; i >= 0; i--) {
    const ts = new Date(now - i * cfg.intervalMs);
    const drift = rand(-0.015, 0.018);
    const open = price;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * rand(1.001, 1.012);
    const low  = Math.min(open, close) * rand(0.988, 0.999);
    const vol  = meta.baseVolume * rand(0.5, 1.8) / cfg.count;
    bars.push({
      timestamp: ts.toISOString(),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low:  +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(vol),
    });
    price = close;
  }
  return bars;
}

// Tick prices every second
function tickPrices() {
  if (isPaused) return;

  const stateMultipliers: Record<MarketState, number> = {
    running: 0.001,
    paused: 0,
    flash_crash: 0.05,
    bull: 0.003,
    bear: -0.002,
    volatile: 0.008,
  };

  const drift = stateMultipliers[marketState];

  for (const sym of Object.keys(SYMBOLS)) {
    const vol = rand(0, drift || 0.001);
    const sign = marketState === "flash_crash" ? -1 :
                 marketState === "bull"        ?  1 :
                 marketState === "bear"        ? -1 :
                 (Math.random() > 0.5 ? 1 : -1);
    prices[sym] = Math.max(prices[sym] * (1 + sign * vol), 0.01);

    // Update today's last bar
    const bars = histories[sym];
    if (bars.length > 0) {
      const last = bars[bars.length - 1];
      last.close = +prices[sym].toFixed(2);
      last.high  = Math.max(last.high, last.close);
      last.low   = Math.min(last.low, last.close);
    }

    sessionVolumes[sym] += Math.round(rand(10_000, 500_000));
  }

  // Simulate OPS/TPS
  ordersPerSecond = Math.round(rand(180, 420));
  tradesPerSecond = Math.round(rand(60, 180));
  queueDepth = Math.round(rand(50, 800));

  // Update latencies
  latencyStats.gatewayUs = Math.round(rand(30, 80));
  latencyStats.queueUs = Math.round(rand(90, 200));
  latencyStats.matchingUs = Math.round(rand(50, 150));
  latencyStats.totalUs = latencyStats.gatewayUs + latencyStats.queueUs + latencyStats.matchingUs;
}

setInterval(tickPrices, 1000);

// ── Public API ────────────────────────────────────────────────────────────────

export function getSymbols() { return Object.keys(SYMBOLS); }

export function getQuote(symbol: string): Quote | null {
  const meta = SYMBOLS[symbol];
  if (!meta) return null;
  const price = prices[symbol];
  const open  = openPrices[symbol];
  const change = price - open;
  const changePercent = (change / open) * 100;
  return {
    symbol,
    name: meta.name,
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePercent: +changePercent.toFixed(2),
    volume: sessionVolumes[symbol] + meta.baseVolume,
    marketCap: meta.marketCap,
    peRatio: meta.peRatio,
    week52High: meta.week52High,
    week52Low: meta.week52Low,
    updatedAt: new Date().toISOString(),
  };
}

export function getAllQuotes(): Quote[] {
  return Object.keys(SYMBOLS).map(s => getQuote(s)!).filter(Boolean);
}

export function getHistory(symbol: string, period: string): OhlcBar[] {
  if (period === "1d") return histories[symbol] ?? [];
  return generateHistory(symbol, period);
}

export function getCurrentPrice(symbol: string): number {
  return prices[symbol] ?? 0;
}

export function setMarketState(state: MarketState) {
  marketState = state;
  isPaused = state === "paused";
  if (state === "flash_crash") {
    // Immediately drop prices 5-15%
    for (const sym of Object.keys(SYMBOLS)) {
      prices[sym] *= rand(0.85, 0.95);
    }
    // Auto-recover after 10s
    setTimeout(() => { if (marketState === "flash_crash") marketState = "running"; }, 10000);
  }
}

export function getMarketState() { return marketState; }
export function getMarketStartTime() { return marketStartTime; }

export function getStats() {
  const uptime = Math.round((Date.now() - marketStartTime) / 1000);
  return {
    ordersPerSecond,
    tradesPerSecond,
    queueDepth,
    ordersReceived: ordersReceivedTotal,
    ordersFilled: ordersFilledTotal,
    ordersRejected: ordersRejectedTotal,
    partialFills: partialFillsTotal,
    latency: { ...latencyStats },
    marketState,
    uptime,
  };
}

export function recordOrder(status: string) {
  ordersReceivedTotal++;
  if (status === "filled") ordersFilledTotal++;
  else if (status === "rejected") ordersRejectedTotal++;
  else if (status === "partial") partialFillsTotal++;
}

export function resetStats() {
  ordersReceivedTotal = 0;
  ordersFilledTotal = 0;
  ordersRejectedTotal = 0;
  partialFillsTotal = 0;
  marketStartTime = Date.now();
}
