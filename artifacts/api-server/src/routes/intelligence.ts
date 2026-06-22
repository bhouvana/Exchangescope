import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getCompanyNews, getMarketNews, getEarningsCalendar, getAnalystRatings, getPriceTarget, getInsiderTransactions, getRecommendationTrends } from "../lib/finnhubService";
import { getYahooMovers, getSectorPerformance } from "../lib/financeService";
import { analyzeNews, generateDailyBriefing } from "../lib/aiService";
import { db } from "@workspace/db";
import { cachedNewsTable, cachedEarningsTable, cachedAnalystRatingsTable, cachedFundamentalsTable, researchReportsTable } from "@workspace/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";

const router: IRouter = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getRegion(req: any): string {
  return (req.query.region as string) ?? "nasdaq";
}

// GET /intelligence/movers — top gainers, losers, most active
router.get("/intelligence/movers", async (req, res) => {
  try {
    const region = getRegion(req);
    const data = await getYahooMovers(region);
    res.json(data);
  } catch (err: any) {
    logger.error({ err: err.message }, "Movers endpoint failed");
    res.status(500).json({ error: "Failed to fetch movers" });
  }
});

// GET /intelligence/sectors — sector performance
router.get("/intelligence/sectors", async (req, res) => {
  try {
    const region = getRegion(req);
    const data = await getSectorPerformance(region);
    res.json(data);
  } catch (err: any) {
    logger.error({ err: err.message }, "Sectors endpoint failed");
    res.status(500).json({ error: "Failed to fetch sectors" });
  }
});

// GET /intelligence/news — market news
router.get("/intelligence/news", async (req, res) => {
  try {
    const region = getRegion(req);
    const category = (req.query.category as string) ?? "general";
    const symbol = req.query.symbol as string;

    let news: any[];
    if (symbol) {
      news = await getCompanyNews(symbol, daysAgo(7), todayStr(), region);
    } else {
      news = await getMarketNews(category, region);
    }

    const cached: any[] = [];
    for (const item of news) {
      cached.push({
        id: item.id,
        symbol: item.symbol || "MARKET",
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        category: item.category,
        sentiment: item.sentiment ?? 0,
        relatedSymbols: item.relatedSymbols ? [item.relatedSymbols] : [],
        publishedAt: new Date(item.publishedAt),
        fetchedAt: new Date(),
      });
    }
    if (cached.length > 0) {
      try {
        await db.insert(cachedNewsTable).values(cached).onConflictDoNothing();
      } catch (dbErr: any) {
        logger.warn({ err: dbErr.message }, "Failed to cache news");
      }
    }

    res.json(news);
  } catch (err: any) {
    logger.error({ err: err.message }, "News endpoint failed");
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// GET /intelligence/news/analyze — AI analysis of news
router.get("/intelligence/news/analyze", async (req, res) => {
  try {
    const region = getRegion(req);
    const category = (req.query.category as string) ?? "general";
    const news = await getMarketNews(category, region);
    const headlines = (news as any[]).filter(n => n.headline).map(n => n.headline).slice(0, 20);
    const analysis = await analyzeNews(headlines, `Category: ${category}, Region: ${region}`);
    res.json(analysis);
  } catch (err: any) {
    logger.error({ err: err.message }, "News analysis failed");
    res.status(500).json({ error: "Failed to analyze news" });
  }
});

// GET /intelligence/earnings — earnings calendar
router.get("/intelligence/earnings", async (req, res) => {
  try {
    const from = (req.query.from as string) ?? daysAgo(30);
    const to = (req.query.to as string) ?? todayStr();
    const symbol = req.query.symbol as string;

    let earnings: any[];
    if (symbol) {
      const { getEarnings } = await import("../lib/finnhubService");
      earnings = await getEarnings(symbol);
    } else {
      earnings = await getEarningsCalendar(from, to);
    }

    try {
      for (const item of earnings) {
        await db.insert(cachedEarningsTable).values({
          id: item.id,
          symbol: item.symbol,
          quarter: item.quarter,
          fiscalYear: item.fiscalYear,
          reportedEps: item.reportedEps,
          estimatedEps: item.estimatedEps,
          surprise: item.surprise,
          surprisePct: item.surprisePct,
          revenue: item.revenue,
          estimatedRevenue: item.estimatedRevenue,
          reportDate: new Date(item.reportDate),
        }).onConflictDoNothing();
      }
    } catch (dbErr: any) {
      logger.warn({ err: dbErr.message }, "Failed to cache earnings");
    }

    res.json(earnings);
  } catch (err: any) {
    logger.error({ err: err.message }, "Earnings endpoint failed");
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

// GET /intelligence/analysts/:symbol — analyst ratings & price targets
router.get("/intelligence/analysts/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const [ratings, priceTarget, trends] = await Promise.all([
      getAnalystRatings(symbol),
      getPriceTarget(symbol),
      getRecommendationTrends(symbol),
    ]);

    for (const item of ratings) {
      try {
        await db.insert(cachedAnalystRatingsTable).values({
          id: item.id,
          symbol: item.symbol,
          firm: item.firm,
          action: item.action,
          targetFrom: item.targetFrom,
          targetTo: item.targetTo,
          ratingFrom: item.ratingFrom,
          ratingTo: item.ratingTo,
          publishedAt: new Date(item.publishedAt),
        }).onConflictDoNothing();
      } catch (_) {}
    }

    res.json({ ratings, priceTarget, trends });
  } catch (err: any) {
    logger.error({ err: err.message }, "Analysts endpoint failed");
    res.status(500).json({ error: "Failed to fetch analyst data" });
  }
});

// GET /intelligence/insiders/:symbol — insider transactions
router.get("/intelligence/insiders/:symbol", async (req, res) => {
  try {
    const data = await getInsiderTransactions(req.params.symbol);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch insider data" });
  }
});

// GET /intelligence/daily-briefing — AI-generated daily briefing
router.get("/intelligence/daily-briefing", async (req, res) => {
  try {
    const region = getRegion(req);
    const exchange = region === "bse" ? "BSE/NSE India" : "NASDAQ";

    // Check cache first
    const today = todayStr();
    const cached = await db.select().from(researchReportsTable)
      .where(and(
        eq(researchReportsTable.type, "daily_briefing"),
        eq(researchReportsTable.symbol, region), // key by region
        gte(researchReportsTable.createdAt, new Date(daysAgo(1)))
      ))
      .orderBy(desc(researchReportsTable.createdAt))
      .limit(1);

    if (cached.length > 0) {
      res.json(cached[0].content);
      return;
    }

    const [movers, sectors, news] = await Promise.all([
      getYahooMovers(region),
      getSectorPerformance(region),
      getMarketNews("general", region),
    ]);

    const briefing = await generateDailyBriefing({
      date: today,
      exchange,
      region,
      movers,
      sectors,
      topHeadlines: (news as any[]).slice(0, 10).map((n: any) => ({ headline: n.headline, source: n.source })),
    });

    try {
      await db.insert(researchReportsTable).values({
        id: `briefing-${region}-${today}-${Date.now()}`,
        type: "daily_briefing",
        title: `Daily Briefing ${today} - ${exchange}`,
        symbol: region,
        content: briefing as any,
        summary: (briefing as any).briefing?.slice(0, 200) ?? "",
        modelUsed: "llama-3.3-70b-versatile",
      });
    } catch (_) {}

    res.json(briefing);
  } catch (err: any) {
    logger.error({ err: err.message }, "Daily briefing failed");
    res.status(500).json({ error: "Failed to generate briefing" });
  }
});

export default router;
