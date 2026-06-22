import OpenAI from "openai";
import { logger } from "./logger";

let _groq: OpenAI | null = null;
function getGroq(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY ?? "no-key",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

type AiRole = "market-analyst" | "research-analyst" | "educator" | "sentiment-analyst";

const SYSTEM_PROMPTS: Record<AiRole, string> = {
  "market-analyst": `You are a professional financial market analyst. Provide concise, data-driven analysis of market movements, news, and trends. Focus on actionable insights. Use real financial terminology. Keep responses under 300 words unless asked for detail.`,
  "research-analyst": `You are a senior equity research analyst at a top investment bank. Provide thorough fundamental and technical analysis of companies and sectors. Include key metrics, competitive positioning, risks, and outlook. Use real financial terminology. Keep responses under 500 words.`,
  "educator": `You are a patient financial educator. Explain complex financial concepts in simple terms. Provide clear examples and analogies. Adapt your explanation depth to the user's apparent knowledge level. Keep responses clear and educational.`,
  "sentiment-analyst": `You are a market sentiment specialist. Analyze news articles, price action, and market data to determine bullish/bearish sentiment. Provide a sentiment score (-1 to 1) and supporting reasoning. Be objective and data-driven.`,
};

async function groqChat(messages: { role: "system" | "user" | "assistant"; content: string }[], maxTokens = 1024, temperature = 0.7) {
  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content ?? "";
  } catch (err: any) {
    logger.error({ err: err.message }, "Groq AI request failed");
    return "AI service unavailable. Please check your GROQ_API_KEY and try again.";
  }
}

function extractJson(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  return null;
}

export async function analyzeNews(headlines: string[], context?: string) {
  const prompt = `Analyze the following market news headlines and provide a brief summary of market sentiment and key themes:\n\n${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}${context ? `\n\nContext: ${context}` : ""}\n\nProvide:\n1. Overall sentiment (bullish/bearish/neutral)\n2. Key themes (2-3 bullet points)\n3. Potential market impact`;
  const content = await groqChat([
    { role: "system", content: SYSTEM_PROMPTS["market-analyst"] },
    { role: "user", content: prompt },
  ]);
  return { analysis: content, model: "llama-3.3-70b-versatile" };
}

export async function generateDailyBriefing(marketData: Record<string, any>) {
  const exchange = marketData.exchange ?? "NASDAQ";
  const prompt = `Generate today's market briefing for ${exchange} in "10 Things to Know" format based on:\n\n${JSON.stringify(marketData, null, 2)}\n\nFormat as plain text with numbered items (1-10). Each item should start with a SHORT HEADLINE IN CAPS — then the explanation. Do NOT use markdown, asterisks, or emojis. Make it ${exchange}-specific.`;
  const content = await groqChat([
    { role: "system", content: `You are a market briefing editor for ${exchange}. Generate clear, comprehensive daily market briefings.` },
    { role: "user", content: prompt },
  ], 2048);
  return { briefing: content, model: "llama-3.3-70b-versatile", generatedAt: new Date().toISOString() };
}

export async function analyzeCompanyResearch(company: Record<string, any>, news: string[], analystData: any) {
  const exchange = company.region === "bse" ? "BSE/NSE India" : "NASDAQ";
  const prompt = `Provide a comprehensive investment research analysis for the following company (listed on ${exchange}):\n\nFundamentals:\n${JSON.stringify(company, null, 2)}\n\nRecent News:\n${news.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nAnalyst Data:\n${JSON.stringify(analystData, null, 2)}\n\nProvide:\n1. Company Overview & Business Model\n2. Financial Health Assessment\n3. Competitive Position & Moat\n4. Recent Developments & Catalysts\n5. Analyst Consensus & Price Targets\n6. Key Risks\n7. Investment Thesis (Bull/Bear case)\n\nDo NOT use markdown, asterisks, or emojis. Use plain text only. Use CAPS for section headers.`;
  const content = await groqChat([
    { role: "system", content: SYSTEM_PROMPTS["research-analyst"] },
    { role: "user", content: prompt },
  ], 2048);
  return { analysis: content, model: "llama-3.3-70b-versatile" };
}

export async function generateThesis(symbol: string, thesisType: string, data: Record<string, any>) {
  const prompt = `Create a structured investment thesis for ${symbol} (${thesisType} thesis) based on:\n\n${JSON.stringify(data, null, 2)}\n\nIMPORTANT: Return ONLY a valid JSON object (no markdown, no code fences) with these keys: thesis (paragraph explaining the thesis), rationale (array of 3-5 supporting arguments), catalysts (array of 2-4 potential catalysts), risks (array of 2-4 key risks), timeframe (string like "6-12 months"), conviction (one of: low/medium/high).`;
  const content = await groqChat([
    { role: "system", content: SYSTEM_PROMPTS["research-analyst"] },
    { role: "user", content: prompt },
  ], 2048, 0.3);

  // Try to parse the response as JSON
  const parsed = extractJson(content);
  if (parsed && parsed.thesis) {
    return { thesis: parsed, model: "llama-3.3-70b-versatile" };
  }

  // Fallback: wrap the raw content as a structured object
  return {
    thesis: {
      thesis: content,
      rationale: ["Based on fundamentals and market position"],
      catalysts: ["Earnings reports", "Sector trends"],
      risks: ["Market volatility", "Competition"],
      timeframe: "12 months",
      conviction: "medium",
    },
    model: "llama-3.3-70b-versatile",
    _raw: content,
  };
}

export async function explainConcept(question: string, level: "simple" | "intermediate" | "expert" = "simple") {
  const levelInstructions = {
    simple: "Explain like I'm 15. Use simple analogies. Avoid jargon. Keep it under 200 words.",
    intermediate: "Explain with some financial terminology. Use examples. Keep it under 300 words.",
    expert: "Explain with full financial terminology, formulas where relevant, and nuanced context. Include edge cases.",
  };
  const prompt = `${question}\n\n${levelInstructions[level]}`;
  const content = await groqChat([
    { role: "system", content: SYSTEM_PROMPTS["educator"] },
    { role: "user", content: prompt },
  ]);
  return { explanation: content, level, model: "llama-3.3-70b-versatile" };
}

export async function analyzeSentiment(news: string[], priceData?: any) {
  const articlesText = news.map((h, i) => `${i + 1}. ${h}`).join("\n");
  const prompt = `Analyze the sentiment of the following market news articles:\n\n${articlesText}${priceData ? `\n\nPrice context: ${JSON.stringify(priceData)}` : ""}\n\nProvide a JSON response with keys: sentiment (bullish/bearish/neutral), score (-1 to 1), confidence (0-1), keyDrivers (array of strings), reasoning (string).`;
  const content = await groqChat([
    { role: "system", content: SYSTEM_PROMPTS["sentiment-analyst"] },
    { role: "user", content: prompt },
  ], 1024, 0.3);
  return { sentiment: content, model: "llama-3.3-70b-versatile" };
}

export async function generateHistoricalExplanation(event: string, context: Record<string, any>) {
  const prompt = `Explain the historical market event "${event}" in an educational format.\n\nContext: ${JSON.stringify(context, null, 2)}\n\nProvide:\n1. What happened (brief timeline)\n2. Causes & triggers\n3. Market impact & key statistics\n4. Lessons learned\n5. How it relates to modern markets\n6. Key takeaways for investors`;
  const content = await groqChat([
    { role: "system", content: "You are a financial historian and educator. Provide accurate, well-structured explanations of historical market events." },
    { role: "user", content: prompt },
  ], 2048);
  return { explanation: content, model: "llama-3.3-70b-versatile" };
}
