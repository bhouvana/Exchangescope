import { logger } from "./logger";

// --- Yahoo Finance cookie/crumb management ---
let _cookie = "";
let _crumb = "";
let _crumbExpires = 0;

async function refreshCrumb(): Promise<boolean> {
  try {
    // Step 1: get a session cookie from Yahoo homepage (returns 404 but sets cookie)
    const fcRes = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const setCookie = fcRes.headers.get("set-cookie") || "";
    // Parse the first cookie (A1, A3, B, etc.)
    const cookieMatch = setCookie.match(/^([^=]+=[^;]+)/);
    _cookie = cookieMatch ? cookieMatch[1] : "";

    // Step 2: get crumb using the cookie
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...(_cookie ? { Cookie: _cookie } : {}),
      },
    });
    if (!crumbRes.ok) {
      _crumb = "";
      return false;
    }
    _crumb = (await crumbRes.text()).trim();
    _crumbExpires = Date.now() + 300_000; // cache crumb for 5 minutes
    return !!_crumb;
  } catch {
    _crumb = "";
    return false;
  }
}

async function yahooFetch(path: string, useCrumb = false): Promise<any> {
  const base = "https://query1.finance.yahoo.com";

  // If a crumb is needed and we don't have one (or it expired), refresh it
  if (useCrumb && (!_crumb || Date.now() > _crumbExpires)) {
    await refreshCrumb();
  }

  try {
    const url = useCrumb && _crumb
      ? `${base}${path}${path.includes("?") ? "&" : "?"}crumb=${_crumb}`
      : `${base}${path}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...(useCrumb && _cookie ? { Cookie: _cookie } : {}),
      },
    });
    if (!res.ok) {
      logger.error({ status: res.status, path }, "Yahoo Finance API error");
      return null;
    }
    return await res.json();
  } catch (err: any) {
    logger.error({ err: err.message, path }, "Yahoo Finance request failed");
    return null;
  }
}

function suffixFor(region: string): string {
  if (region === "bse") return ".BO";
  if (region === "nse") return ".NS";
  return "";
}

function bseTicker(symbol: string): string {
  if (symbol === "RELIANCE") return "RELIANCE.BO";
  return symbol + ".BO";
}

function exchangeTicker(symbol: string, region: string): string {
  if (region === "bse") return bseTicker(symbol);
  if (region === "nse") return symbol + ".NS";
  return symbol;
}

const NASDAQ_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V", "WMT",
  "JNJ", "PG", "MA", "UNH", "HD", "DIS", "PYPL", "ADBE", "NFLX", "CRM",
  "AMD", "INTC", "BA", "GE", "CAT", "XOM", "CVX", "KO", "PEP", "ABNB",
  "AVGO", "ORCL", "ADBE", "CRM", "QCOM", "TXN", "PANW", "AMAT", "CSCO", "IBM",
  "BKNG", "SBUX", "CMG", "NKE", "LOW", "TGT", "MCD", "LULU", "MAR", "ABNB"];

const NYSE_SYMBOLS = ["BRK_B", "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP",
  "UNH", "JNJ", "MRK", "ABBV", "PFE", "TMO", "ABT", "DHR", "AMGN", "MDT",
  "WMT", "KO", "PEP", "PG", "COST", "PM", "HD", "MCD", "NKE", "DIS",
  "XOM", "CVX", "COP", "SLB", "OXY", "CAT", "GE", "BA", "HON", "UPS",
  "LIN", "SHW", "NEM", "FCX", "DOW", "NEE", "DUK", "SO", "VZ", "T",
  "TMUS", "PLD", "AMT", "EQIX", "SPG", "MMM", "DE", "LMT", "RTX", "FDX"];

const BSE_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "WIPRO", "ITC", "SBIN",
  "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE", "MARUTI", "TITAN",
  "ASIANPAINT", "NTPC", "M&M", "POWERGRID", "HCLTECH", "SUNPHARMA", "ULTRACEMCO",
  "TATAMOTORS", "HINDUNILVR", "ONGC", "COALINDIA", "ADANIENT", "ADANIPORTS", "EICHERMOT", "JSWSTEEL",
  "TATASTEEL", "DRREDDY", "CIPLA", "GRASIM", "HINDALCO", "DLF", "SIEMENS", "ABB",
  "BEL", "GAIL", "BPCL", "IOC", "NESTLEIND", "BRITANNIA", "DABUR", "MARICO"];

const NSE_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HCLTECH", "WIPRO", "ITC", "SBIN",
  "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE", "MARUTI", "TITAN",
  "ASIANPAINT", "NTPC", "M&M", "POWERGRID", "SUNPHARMA", "ULTRACEMCO",
  "TATAMOTORS", "HINDUNILVR", "ONGC", "COALINDIA", "ADANIENT", "ADANIPORTS",
  "TATASTEEL", "JSWSTEEL", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP",
  "GRASIM", "HINDALCO", "DLF", "SIEMENS", "ABB", "BEL", "GAIL", "BPCL",
  "NESTLEIND", "BRITANNIA", "DABUR", "TRENT", "ZOMATO", "TATACONSUM"];

const SECTOR_ETFS_NASDAQ: Record<string, string> = {
  "Technology": "XLK", "Healthcare": "XLV", "Financials": "XLF",
  "Energy": "XLE", "Consumer Cyclical": "XLY", "Consumer Defensive": "XLP",
  "Industrials": "XLI", "Materials": "XLB", "Utilities": "XLU",
  "Real Estate": "XLRE", "Communication": "XLC",
};

const SECTOR_ETFS_NYSE: Record<string, string[]> = {
  "Financials": ["JPM", "BAC", "WFC", "GS", "MS", "C"],
  "Healthcare": ["JNJ", "UNH", "MRK", "PFE", "ABT"],
  "Energy": ["XOM", "CVX", "COP", "SLB", "OXY"],
  "Consumer Defensive": ["PG", "KO", "PEP", "WMT", "PM"],
  "Industrials": ["CAT", "GE", "BA", "HON", "UPS"],
  "Materials": ["LIN", "SHW", "NEM", "FCX", "DOW"],
  "Utilities": ["NEE", "DUK", "SO"],
  "Real Estate": ["PLD", "AMT", "SPG"],
  "Communication": ["VZ", "T", "DIS"],
  "Consumer Cyclical": ["NKE", "MCD", "HD", "LOW"],
  "Technology": ["IBM", "RTX", "HON", "FDX"],
};

const SECTOR_MAP_BSE: Record<string, string[]> = {
  "Technology": ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
  "Financials": ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "BAJFINANCE"],
  "Energy": ["RELIANCE", "ONGC", "COALINDIA", "POWERGRID"],
  "Consumer Defensive": ["ITC", "HINDUNILVR", "TITAN", "MARUTI", "EICHERMOT"],
  "Communication": ["BHARTIARTL", "ADANIENT"],
  "Industrials": ["LT", "M&M", "TATAMOTORS", "ADANIPORTS", "ULTRACEMCO"],
  "Materials": ["JSWSTEEL", "ASIANPAINT", "NTPC"],
  "Healthcare": ["SUNPHARMA", "CIPLA", "DRREDDY"],
};

const SECTOR_MAP_INDIAN = SECTOR_MAP_BSE;

export async function batchYahooQuotes(symbols: string[], region = "nasdaq"): Promise<Record<string, any>> {
  if (symbols.length === 0) return {};
  const symList = symbols.map(s => exchangeTicker(s, region)).join(",");
  const data = await yahooFetch(`/v7/finance/quote?symbols=${encodeURIComponent(symList)}`);
  const results = data?.quoteResponse?.result;
  if (!results) return {};
  const out: Record<string, any> = {};
  for (const r of results) {
    const sym = r.symbol?.replace(/\.(NS|BO)$/, "");
    if (sym && r.regularMarketPrice) {
      out[sym] = {
        price: r.regularMarketPrice,
        change: r.regularMarketChange ?? 0,
        changePercent: r.regularMarketChangePercent ?? 0,
        volume: r.regularMarketVolume ?? 0,
        marketCap: r.marketCap ?? 0,
        peRatio: r.trailingPE ?? 0,
        week52High: r.fiftyTwoWeekHigh ?? r.regularMarketPrice,
        week52Low: r.fiftyTwoWeekLow ?? r.regularMarketPrice,
      };
    }
  }
  return out;
}

export async function getYahooQuote(symbol: string, region = "nasdaq") {
  const sym = exchangeTicker(symbol, region);
  const data = await yahooFetch(`/v8/finance/chart/${sym}?interval=1d&range=1mo`);
  if (!data?.chart?.result?.[0]) return null;
  const meta = data.chart.result[0].meta;
  const quotes = data.chart.result[0].indicators?.quote?.[0];
  if (!quotes) return null;
  const lastIdx = quotes.close.length - 1;
  return {
    symbol,
    price: meta.regularMarketPrice ?? quotes.close[lastIdx] ?? 0,
    previousClose: meta.chartPreviousClose ?? quotes.close[lastIdx - 1] ?? 0,
    change: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0),
    changePercent: ((meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0)) / (meta.chartPreviousClose ?? 1) * 100,
    high: meta.regularMarketDayHigh ?? Math.max(...quotes.high.filter(Boolean)),
    low: meta.regularMarketDayLow ?? Math.min(...quotes.low.filter(Boolean)),
    volume: meta.regularMarketVolume ?? quotes.volume[lastIdx] ?? 0,
  };
}

const EXCHANGE_SYMBOL_MAP: Record<string, string[]> = {
  nasdaq: NASDAQ_SYMBOLS,
  nyse: NYSE_SYMBOLS,
  nse: NSE_SYMBOLS,
  bse: BSE_SYMBOLS,
};

export async function getYahooMovers(region = "nasdaq") {
  try {
    const symbols = EXCHANGE_SYMBOL_MAP[region] || NASDAQ_SYMBOLS;
    const results = await Promise.allSettled(symbols.map(s => getYahooQuote(s, region)));
    const quotes = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value);

    const gainers = [...quotes].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    const losers = [...quotes].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    const mostActive = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 10);

    return { gainers, losers, mostActive };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch market movers");
    return { gainers: [], losers: [], mostActive: [] };
  }
}

export async function getSectorPerformance(region = "nasdaq") {
  if (region === "bse" || region === "nse") {
    // Indian exchanges: build from constituent stock quotes
    const sectorMap = SECTOR_MAP_INDIAN;
    const exchangeRegion = region;
    const results = await Promise.allSettled(
      Object.entries(sectorMap).map(async ([name, symbols]) => {
        const quotes = await Promise.allSettled(symbols.map(s => getYahooQuote(s, exchangeRegion)));
        const valid = quotes
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
          .map(r => r.value);
        if (valid.length === 0) return { sector: name, etf: "", changePercent: 0, price: 0 };
        const avgChange = valid.reduce((sum, q) => sum + q.changePercent, 0) / valid.length;
        const avgPrice = valid.reduce((sum, q) => sum + q.price, 0) / valid.length;
        return { sector: name, etf: "", changePercent: avgChange, price: avgPrice };
      })
    );
    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value);
  }

  if (region === "nyse") {
    // NYSE: build from constituent stock quotes
    const results = await Promise.allSettled(
      Object.entries(SECTOR_ETFS_NYSE).map(async ([name, symbols]) => {
        const quotes = await Promise.allSettled(symbols.map(s => getYahooQuote(s, "nyse")));
        const valid = quotes
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
          .map(r => r.value);
        if (valid.length === 0) return { sector: name, etf: "", changePercent: 0, price: 0 };
        const avgChange = valid.reduce((sum, q) => sum + q.changePercent, 0) / valid.length;
        const avgPrice = valid.reduce((sum, q) => sum + q.price, 0) / valid.length;
        return { sector: name, etf: "", changePercent: avgChange, price: avgPrice };
      })
    );
    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value);
  }

  // NASDAQ: use sector ETFs
  const results = await Promise.allSettled(
    Object.entries(SECTOR_ETFS_NASDAQ).map(async ([name, etf]) => {
      const q = await getYahooQuote(etf, "nasdaq");
      return { sector: name, etf, changePercent: q?.changePercent ?? 0, price: q?.price ?? 0 };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map(r => r.value);
}

export async function getCompanyFundamentals(symbol: string, region = "nasdaq") {
  const sym = exchangeTicker(symbol, region);

  // Try v10/quoteSummary with crumb authentication
  const profile = await yahooFetch(`/v10/finance/quoteSummary/${sym}?modules=assetProfile,financialData,defaultKeyStatistics,summaryDetail`, true);
  const qs = profile?.quoteSummary?.result?.[0];

  if (qs) {
    const ap = qs.assetProfile ?? {};
    const fd = qs.financialData ?? {};
    const ks = qs.defaultKeyStatistics ?? {};
    const sd = qs.summaryDetail ?? {};
    return {
      symbol,
      companyName: ap.companyName ?? ap.longBusinessSummary?.slice(0, 100) ?? symbol,
      sector: ap.sector ?? "",
      industry: ap.industry ?? "",
      marketCap: sd.marketCap?.raw ?? fd.marketCap?.raw ?? null,
      peRatio: sd.trailingPE?.raw ?? null,
      forwardPe: sd.forwardPE?.raw ?? null,
      eps: fd.epsTrailingTwelveMonths?.raw ?? ks.trailingEps?.raw ?? null,
      dividendYield: sd.dividendYield?.raw ?? null,
      beta: ks.beta?.raw ?? null,
      high52Week: sd.fiftyTwoWeekHigh?.raw ?? null,
      low52Week: sd.fiftyTwoWeekLow?.raw ?? null,
      avgVolume: sd.averageVolume?.raw ?? null,
      revenue: fd.totalRevenue?.raw ?? null,
      revenueGrowth: fd.revenueGrowth?.raw ?? null,
      profitMargin: fd.profitMargins?.raw ?? null,
      debtToEquity: fd.debtToEquity?.raw ?? null,
      freeCashFlow: fd.freeCashflow?.raw ?? null,
      insiderOwnership: ks.heldPercentInsiders?.raw ?? null,
      institutionalOwnership: ks.heldPercentInstitutions?.raw ?? null,
      sharesOutstanding: sd.sharesOutstanding?.raw ?? null,
    };
  }

  // Fallback: use v8/finance/chart
  logger.warn({ symbol, region }, "quoteSummary unavailable, falling back to chart API");
  const chart = await yahooFetch(`/v8/finance/chart/${sym}?interval=1d&range=1mo`);
  const meta = chart?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  return {
    symbol,
    companyName: meta.longName ?? meta.shortName ?? symbol,
    sector: "",
    industry: "",
    marketCap: null,
    peRatio: null,
    forwardPe: null,
    eps: null,
    dividendYield: null,
    beta: null,
    high52Week: meta.fiftyTwoWeekHigh ?? null,
    low52Week: meta.fiftyTwoWeekLow ?? null,
    avgVolume: meta.regularMarketVolume ?? null,
    revenue: null,
    revenueGrowth: null,
    profitMargin: null,
    debtToEquity: null,
    freeCashFlow: null,
    insiderOwnership: null,
    institutionalOwnership: null,
    sharesOutstanding: null,
  };
}
