import { v4 as uuidv4 } from "uuid";
import { engine } from "./matchingEngine";
import { getCurrentPrice, getTradingIntensity } from "./marketData";
import { logger } from "./logger";

const seeded = new Set<string>();
const seeding = new Set<string>();

export async function ensureOrderBookLiquidity(symbol: string): Promise<void> {
  const sym = symbol.toUpperCase();
  if (seeded.has(sym) || seeding.has(sym)) return;

  seeding.add(sym);
  try {
    const ob = await engine.getOrderBook(sym);
    if ((ob.bids?.length ?? 0) >= 3 && (ob.asks?.length ?? 0) >= 3) {
      seeded.add(sym);
      return;
    }

    const mid = getCurrentPrice(sym);
    if (!mid || mid <= 0) return;

    const intensity = getTradingIntensity(sym);
    const tick = mid >= 100 ? 0.05 : mid >= 10 ? 0.01 : 0.005;
    // More levels and tighter spacing for liquid (high-intensity) stocks
    const levels = Math.round(6 + intensity * 3); // 7 – 15 levels

    for (let i = 1; i <= levels; i++) {
      // Scale qty with intensity: liquid stocks get 2x-3x more shares per level
      const baseQty = 40 + i * 25 + Math.round(Math.random() * 30);
      const qty = Math.round(baseQty * intensity);
      const bidPrice = +(mid - i * tick).toFixed(2);
      const askPrice = +(mid + i * tick).toFixed(2);
      await engine.addOrder({ id: uuidv4(), symbol: sym, type: "limit", side: "buy", qty, price: bidPrice });
      await engine.addOrder({ id: uuidv4(), symbol: sym, type: "limit", side: "sell", qty, price: askPrice });
    }

    seeded.add(sym);
    logger.debug({ symbol: sym }, "Seeded order book liquidity");
  } catch (err) {
    logger.debug({ err, symbol: sym }, "Order book seed failed");
  } finally {
    seeding.delete(sym);
  }
}
