import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getCompanyFundamentals, getSectorPerformance } from "../lib/financeService";
import { getCompanyNews, getAnalystRatings, getPriceTarget, getRecommendationTrends } from "../lib/finnhubService";
import { analyzeCompanyResearch, generateThesis, explainConcept, analyzeSentiment, generateHistoricalExplanation } from "../lib/aiService";
import { db } from "@workspace/db";
import { researchReportsTable, cachedFundamentalsTable } from "@workspace/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";

const router: IRouter = Router();

function getRegion(req: any): string {
  return (req.query.region as string) ?? "nasdaq";
}

// GET /research/company/:symbol — comprehensive company research
router.get("/research/company/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const region = getRegion(req);
    const refresh = req.query.refresh === "true";

    // Check cache
    if (!refresh) {
      const cached = await db.select().from(researchReportsTable)
        .where(and(
          eq(researchReportsTable.type, "company_research"),
          eq(researchReportsTable.symbol, symbol),
          gte(researchReportsTable.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        ))
        .orderBy(desc(researchReportsTable.createdAt))
        .limit(1);
      if (cached.length > 0) {
        res.json(cached[0].content);
        return;
      }
    }

    const [fundamentals, news, analystData] = await Promise.all([
      getCompanyFundamentals(symbol, region),
      getCompanyNews(symbol, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), new Date().toISOString().slice(0, 10), region),
      getAnalystRatings(symbol).then(async (ratings) => {
        const [priceTarget, trends] = await Promise.all([
          getPriceTarget(symbol),
          getRecommendationTrends(symbol),
        ]);
        return { ratings, priceTarget, trends };
      }),
    ]);

    if (!fundamentals) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    // Cache fundamentals
    try {
      await db.insert(cachedFundamentalsTable).values(fundamentals).onConflictDoUpdate({
        target: cachedFundamentalsTable.symbol,
        set: fundamentals,
      });
    } catch (_) {}

    const newsHeadlines = (news as any[]).filter(n => n.headline).map(n => n.headline);
    const analysis = await analyzeCompanyResearch({ ...fundamentals, region }, newsHeadlines, analystData);

    const result = {
      fundamentals,
      news: (news as any[]).slice(0, 20),
      analystData,
      aiAnalysis: analysis,
    };

    try {
      await db.insert(researchReportsTable).values({
        id: `research-${symbol}-${Date.now()}`,
        type: "company_research",
        title: `${fundamentals.companyName} (${symbol}) - Research Report`,
        symbol,
        content: result as any,
        summary: (analysis as any).analysis?.slice(0, 200) ?? "",
        modelUsed: "llama-3.3-70b-versatile",
      });
    } catch (_) {}

    res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "Company research failed");
    res.status(500).json({ error: "Failed to generate research" });
  }
});

// GET /research/sectors — sector research with AI analysis
router.get("/research/sectors", async (req, res) => {
  try {
    const region = getRegion(req);
    const sectors = await getSectorPerformance(region);
    const sectorData = sectors.map((s: any) => `${s.sector}: ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`).join("\n");

    const result = sectors.map((s: any) => ({
      ...s,
      topStocks: [],
      peRatio: 0,
      dividendYield: 0,
    }));

    res.json({ sectors: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "Sector research failed");
    res.status(500).json({ error: "Failed to fetch sectors" });
  }
});

// POST /research/thesis — generate investment thesis
router.post("/research/thesis", async (req, res) => {
  try {
    const { symbol, thesisType, data } = req.body;
    const region = getRegion(req);
    if (!symbol || !thesisType) {
      res.status(400).json({ error: "symbol and thesisType required" });
      return;
    }

    const fundamentals = await getCompanyFundamentals(symbol, region);
    const thesis = await generateThesis(symbol, thesisType, {
      ...data,
      fundamentals,
      region,
    });

    const result = { symbol, thesisType, thesis, fundamentals };

    try {
      await db.insert(researchReportsTable).values({
        id: `thesis-${symbol}-${Date.now()}`,
        type: "thesis_builder",
        title: `${symbol} ${thesisType} Thesis`,
        symbol,
        content: result as any,
        summary: typeof thesis.thesis === "object" ? thesis.thesis.thesis?.slice(0, 200) ?? "" : "",
        modelUsed: "llama-3.3-70b-versatile",
      });
    } catch (_) {}

    res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "Thesis generation failed");
    res.status(500).json({ error: "Failed to generate thesis" });
  }
});

// POST /research/learn — AI learning assistant
router.post("/research/learn", async (req, res) => {
  try {
    const { question, level = "simple" } = req.body;
    if (!question) {
      res.status(400).json({ error: "question is required" });
      return;
    }
    const result = await explainConcept(question, level as any);
    res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "Learning assistant failed");
    res.status(500).json({ error: "Failed to get explanation" });
  }
});

// POST /research/sentiment — sentiment analysis
router.post("/research/sentiment", async (req, res) => {
  try {
    const { symbol, articles, priceData } = req.body;
    if (!articles || !Array.isArray(articles)) {
      res.status(400).json({ error: "articles array is required" });
      return;
    }
    const result = await analyzeSentiment(articles, priceData);
    res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "Sentiment analysis failed");
    res.status(500).json({ error: "Failed to analyze sentiment" });
  }
});

// GET /research/historical/:event — historical market event explanation
router.get("/research/historical/:event", async (req, res) => {
  try {
    const { event } = req.params;
    const eventNames: Record<string, { label: string; context: Record<string, any> }> = {
      "dot-com": { label: "Dot-Com Bubble (2000-2002)", context: { year: "2000-2002", type: "bubble", impact: "NASDAQ fell 78% from peak" } },
      "2008": { label: "Global Financial Crisis (2008)", context: { year: "2008", type: "crisis", impact: "S&P 500 fell 57%, global recession" } },
      "covid": { label: "COVID-19 Crash (2020)", context: { year: "2020", type: "crash", impact: "Fastest bear market, 34% drop in 33 days" } },
      "ai-boom": { label: "AI Boom (2023-2024)", context: { year: "2023-2024", type: "boom", impact: "NVDA +240%, AI market cap surge" } },
      "rate-cycles": { label: "Interest Rate Cycles (2022-2024)", context: { year: "2022-2024", type: "cycle", impact: "Fastest rate hikes since 1980s" } },
    };

    const eventInfo = eventNames[event];
    if (!eventInfo) {
      res.status(404).json({ error: `Event "${event}" not found. Available: ${Object.keys(eventNames).join(", ")}` });
      return;
    }

    const cached = await db.select().from(researchReportsTable)
      .where(and(
        eq(researchReportsTable.type, "historical_event"),
        eq(researchReportsTable.title, eventInfo.label),
      ))
      .limit(1);

    if (cached.length > 0) {
      res.json(cached[0].content);
      return;
    }

    const result = await generateHistoricalExplanation(eventInfo.label, eventInfo.context);

    try {
      await db.insert(researchReportsTable).values({
        id: `history-${event}-${Date.now()}`,
        type: "historical_event",
        title: eventInfo.label,
        content: result as any,
        summary: (result as any).explanation?.slice(0, 200) ?? "",
        modelUsed: "llama-3.3-70b-versatile",
      });
    } catch (_) {}

    res.json(result);
  } catch (err: any) {
    logger.error({ err: err.message }, "Historical event failed");
    res.status(500).json({ error: "Failed to get historical explanation" });
  }
});

// GET /research/historical — list all available events
router.get("/research/historical", async (_req, res) => {
  const events = [
    { id: "dot-com", label: "Dot-Com Bubble (2000-2002)", description: "The rise and crash of internet stocks", year: "2000-2002" },
    { id: "2008", label: "Global Financial Crisis (2008)", description: "Housing bubble, subprime mortgages, systemic collapse", year: "2008" },
    { id: "covid", label: "COVID-19 Crash (2020)", description: "Pandemic-induced fastest bear market in history", year: "2020" },
    { id: "ai-boom", label: "AI Boom (2023-2024)", description: "Generative AI revolution and market surge", year: "2023-2024" },
    { id: "rate-cycles", label: "Interest Rate Cycles (2022-2024)", description: "Federal Reserve tightening cycle and market impact", year: "2022-2024" },
  ];
  res.json(events);
});

export default router;
