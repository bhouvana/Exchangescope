import { logger } from "./logger";

const BASE = "https://finnhub.io/api/v1";

function apiKey(): string {
  return process.env.FINNHUB_API_KEY ?? "";
}

async function fetchJson(path: string): Promise<any> {
  const key = apiKey();
  if (!key) {
    logger.warn("FINNHUB_API_KEY not set, returning empty data");
    return [];
  }
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}token=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.error({ status: res.status, path }, "Finnhub API error");
      return [];
    }
    return await res.json();
  } catch (err: any) {
    logger.error({ err: err.message, path }, "Finnhub request failed");
    return [];
  }
}

// BSE symbols need Finnhub prefix mapping
function finnhubSymbol(symbol: string, region: string): string {
  // Finnhub doesn't have BSE directly; for BSE we use the symbol as-is
  // and filter results by region after fetching
  return symbol;
}

export async function getCompanyNews(symbol: string, from: string, to: string, region = "nasdaq") {
  const fsym = region === "bse" ? symbol : symbol;
  const data = await fetchJson(`/company-news?symbol=${fsym}&from=${from}&to=${to}`);
  return (data as any[]).slice(0, 50).map((item: any) => ({
    id: item.id ?? `${symbol}-${item.datetime}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    headline: item.headline ?? "",
    summary: item.summary ?? "",
    source: item.source ?? "Finnhub",
    url: item.url ?? "",
    category: item.category ?? "general",
    relatedSymbols: item.related ?? "",
    publishedAt: new Date((item.datetime ?? Date.now()) * 1000).toISOString(),
    sentiment: 0,
  }));
}

// BSE-related keywords for filtering news
const BSE_KEYWORDS = ["bse", "sensex", "nifty", "india stock", "rupee", "bombay stock", "nse",
  "reliance", "tcs", "hdfc", "infosys", "icici", "sbi", "bharti", "bajaj", "asian paints",
  "maruti", "tatamotors", "wipro", "itc", "hindunilvr", "sun pharma"];

function isBseRelated(item: any): boolean {
  const text = `${item.headline ?? ""} ${item.summary ?? ""} ${item.related ?? ""}`.toLowerCase();
  return BSE_KEYWORDS.some(kw => text.includes(kw));
}

export async function getMarketNews(category: string = "general", region = "nasdaq") {
  const data = await fetchJson(`/news?category=${category}`);
  let items = (data as any[]).slice(0, 50).map((item: any) => ({
    id: item.id ?? `news-${item.datetime}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: item.related ?? "",
    headline: item.headline ?? "",
    summary: item.summary ?? "",
    source: item.source ?? "Finnhub",
    url: item.url ?? "",
    category: item.category ?? category,
    relatedSymbols: item.related ?? "",
    publishedAt: new Date((item.datetime ?? Date.now()) * 1000).toISOString(),
    sentiment: 0,
  }));

  if (region === "bse") {
    items = items.filter(isBseRelated);
    // If BSE-specific news is empty, return a placeholder
    if (items.length === 0) {
      items = [{
        id: `bse-placeholder-${Date.now()}`,
        symbol: "BSE",
        headline: "Indian markets data — Finnhub provides limited BSE coverage. Showing general market news.",
        summary: "For comprehensive BSE/NSE news, consider integrating a dedicated Indian market data provider.",
        source: "ExchangeScope",
        url: "",
        category: "general",
        relatedSymbols: "",
        publishedAt: new Date().toISOString(),
        sentiment: 0,
      }];
    }
  }

  return items;
}

export async function getEarnings(symbol: string) {
  const data = await fetchJson(`/stock/earnings?symbol=${symbol}`);
  return (data as any[]).slice(0, 12).map((item: any) => ({
    id: `${symbol}-${item.quarter}-${item.year}`,
    symbol,
    quarter: `Q${item.quarter} ${item.year}`,
    fiscalYear: item.year,
    reportedEps: item.actual ?? null,
    estimatedEps: item.estimate ?? null,
    surprise: item.surprise ?? null,
    surprisePct: item.surprisePercent ?? null,
    revenue: item.revenue ?? null,
    estimatedRevenue: item.estimatedRevenue ?? null,
    reportDate: new Date(item.period?.start ?? Date.now()).toISOString(),
  }));
}

export async function getEarningsCalendar(from: string, to: string) {
  const data = await fetchJson(`/calendar/earnings?from=${from}&to=${to}`);
  const earningsCalendar = (data as any).earningsCalendar ?? [];
  return earningsCalendar.slice(0, 100).map((item: any) => ({
    id: `${item.symbol}-${item.date}-${Math.random().toString(36).slice(2, 6)}`,
    symbol: item.symbol,
    quarter: item.quarter ?? "",
    fiscalYear: item.year ?? null,
    reportedEps: item.epsActual ?? null,
    estimatedEps: item.epsEstimate ?? null,
    surprise: item.surprise ?? null,
    surprisePct: item.surprisePercent ?? null,
    revenue: item.revenue ?? null,
    estimatedRevenue: item.revenueEstimate ?? null,
    reportDate: new Date(item.date ?? Date.now()).toISOString(),
  }));
}

export async function getAnalystRatings(symbol: string) {
  const data = (await fetchJson(`/stock/recommendations?symbol=${symbol}`)) as any[];
  return data.slice(0, 20).map((item: any) => ({
    id: `${symbol}-${item.period}-${item.buy}-${Math.random().toString(36).slice(2, 6)}`,
    symbol,
    firm: item.firm ?? item.analyst ?? "Unknown",
    action: item.action ?? "reiterate",
    targetFrom: item.targetFrom ?? item.oldTarget ?? null,
    targetTo: item.targetTo ?? item.newTarget ?? null,
    ratingFrom: item.ratingFrom ?? null,
    ratingTo: item.ratingTo ?? null,
    publishedAt: new Date((item.lastUpdated ?? item.period ?? Date.now()) * 1000).toISOString(),
  }));
}

export async function getPriceTarget(symbol: string) {
  return fetchJson(`/stock/price-target?symbol=${symbol}`);
}

export async function getInsiderTransactions(symbol: string) {
  const data = await fetchJson(`/stock/insider-transactions?symbol=${symbol}`);
  return (data as any).data ?? [];
}

export async function getRecommendationTrends(symbol: string) {
  const data = await fetchJson(`/stock/recommendation?symbol=${symbol}`);
  return (data as any[]).slice(0, 12).map((item: any) => ({
    period: item.period,
    buy: item.buy ?? 0,
    hold: item.hold ?? 0,
    sell: item.sell ?? 0,
    strongBuy: item.strongBuy ?? 0,
    strongSell: item.strongSell ?? 0,
  }));
}

export async function searchSymbol(query: string) {
  return fetchJson(`/search?q=${query}`);
}
