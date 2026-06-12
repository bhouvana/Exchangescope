import { Router, type IRouter } from "express";
import { getAllQuotes, getQuote, getHistory } from "../lib/marketData";

const router: IRouter = Router();

router.get("/stocks", async (_req, res): Promise<void> => {
  res.json(getAllQuotes());
});

router.get("/stocks/:symbol", async (req, res): Promise<void> => {
  const sym = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const quote = getQuote(sym.toUpperCase());
  if (!quote) { res.status(404).json({ error: "Symbol not found" }); return; }
  res.json(quote);
});

router.get("/stocks/:symbol/history/:period", async (req, res): Promise<void> => {
  const sym    = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const period = Array.isArray(req.params.period) ? req.params.period[0] : req.params.period;
  const quote  = getQuote(sym.toUpperCase());
  if (!quote) { res.status(404).json({ error: "Symbol not found" }); return; }
  res.json(getHistory(sym.toUpperCase(), period));
});

export default router;
