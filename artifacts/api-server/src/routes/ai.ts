import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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

router.post("/ai/explain", async (req, res): Promise<void> => {
  const { question, context } = req.body;
  if (!question) {
    res.status(400).json({ error: "question is required" }); return;
  }

  const mode = context?.mode === "expanded" ? "expanded" : "concise";
  const systemPrompt = mode === "expanded"
    ? `You are an expert in financial market microstructure, order matching engines, and high-frequency trading systems.
You explain how stock exchanges work internally — order books, matching algorithms, latency, market impact, and trade execution.
Provide a thorough, detailed explanation (at least 250 words). Use real market terminology. Include specific examples, edge cases, and historical context where relevant. End with a note recommending further reading on Wikipedia.`
    : `You are an expert in financial market microstructure, order matching engines, and high-frequency trading systems.
You explain how stock exchanges work internally — order books, matching algorithms, latency, market impact, and trade execution.
Be precise, educational, and use real market terminology. Provide a clear explanation of at least 80 words.`;

  const contextStr = context ? `\n\nMarket context:\n${JSON.stringify(context, null, 2)}` : "";

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question + contextStr },
      ],
      temperature: 0.7,
      max_tokens: mode === "expanded" ? 2048 : 512,
    });

    const explanation = completion.choices[0]?.message?.content ?? "No explanation available.";

    // Generate a brief reasoning
    const reasoning = `Analyzed ${context ? Object.keys(context).length : 0} data points. ` +
      `Response generated using market microstructure knowledge.`;

    res.json({ explanation, reasoning });
  } catch (err: any) {
    logger.error({ err: err.message }, "Groq AI request failed");
    res.status(500).json({ error: "AI service unavailable", explanation: "", reasoning: "" });
  }
});

export default router;
