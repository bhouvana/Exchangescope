import { v4 as uuidv4 } from "uuid";
import { engine } from "./matchingEngine";
import { getCurrentPrice, getSymbols } from "./marketData";
import { db } from "@workspace/db";
import { ordersTable, tradesTable } from "@workspace/db";
import { logger } from "./logger";

export interface TraderState {
  id: string;
  type: "retail" | "market_maker" | "momentum" | "panic";
  symbol: string;
  ordersPlaced: number;
  fills: number;
  pnl: number;
  isActive: boolean;
  lastAction: string | null;
  position: number; // net shares
  avgCost: number;
}

const traders: TraderState[] = [];
let timers: ReturnType<typeof setInterval>[] = [];
let running = false;

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.round(rand(min, max)); }

async function placeOrder(trader: TraderState, side: "buy" | "sell", type: "market" | "limit", qty: number, price?: number) {
  const id = uuidv4();
  const curPrice = getCurrentPrice(trader.symbol);
  const limitPrice = price ?? (side === "buy" ? curPrice * 0.999 : curPrice * 1.001);

  try {
    const result = await engine.addOrder({
      id,
      symbol: trader.symbol,
      type,
      side,
      qty,
      price: type === "limit" ? +limitPrice.toFixed(2) : 0,
    });

    trader.ordersPlaced++;
    trader.lastAction = `${side.toUpperCase()} ${qty} ${trader.symbol} @ ${type === "market" ? "MKT" : limitPrice.toFixed(2)}`;

    if (result.status === "filled" || result.status === "partial") {
      trader.fills++;
      const fillQty = result.filledQty ?? 0;
      const fillPrice = result.avgPrice ?? curPrice;
      const pnlDelta = side === "sell" ? fillQty * fillPrice : -fillQty * fillPrice;
      trader.pnl += pnlDelta;
      trader.position += (side === "buy" ? fillQty : -fillQty);
    }

    // Persist to DB
    await db.insert(ordersTable).values({
      id,
      symbol: trader.symbol,
      type,
      side,
      quantity: qty,
      price: type === "limit" ? +limitPrice.toFixed(2) : null,
      status: result.status ?? "queued",
      filledQuantity: result.filledQty ?? 0,
      avgFillPrice: result.avgPrice ?? null,
      traderId: trader.id,
    }).onConflictDoNothing();

    if (result.trades && result.trades.length > 0) {
      for (const t of result.trades) {
        await db.insert(tradesTable).values({
          id: t.id,
          symbol: t.symbol,
          price: t.price,
          quantity: t.qty,
          side: side === "buy" ? "buy" : "sell",
          buyOrderId: t.buyOrderId,
          sellOrderId: t.sellOrderId,
          buyTraderId: t.buyOrderId === id ? trader.id : null,
          sellTraderId: t.sellOrderId === id ? trader.id : null,
        }).onConflictDoNothing();
      }
    }
  } catch (err) {
    logger.debug({ err }, "AI trader order failed");
  }
}

// Retail: small random orders every 3-8s
function startRetailTrader(trader: TraderState) {
  const tick = async () => {
    if (!running || !trader.isActive) return;
    const side: "buy" | "sell" = Math.random() > 0.5 ? "buy" : "sell";
    const qty = randInt(10, 150);
    const price = getCurrentPrice(trader.symbol);
    const limitOffset = rand(-0.005, 0.005);
    await placeOrder(trader, side, "limit", qty, price * (1 + limitOffset));
  };
  return setInterval(tick, rand(3000, 8000));
}

// Market maker: maintains spread on both sides
function startMarketMaker(trader: TraderState) {
  const tick = async () => {
    if (!running || !trader.isActive) return;
    const mid = getCurrentPrice(trader.symbol);
    const spread = mid * 0.002; // 0.2% spread
    const qty = randInt(50, 300);
    await placeOrder(trader, "buy",  "limit", qty, mid - spread / 2);
    await placeOrder(trader, "sell", "limit", qty, mid + spread / 2);
  };
  return setInterval(tick, rand(2000, 5000));
}

// Momentum: follows price direction
let prevPrices: Record<string, number> = {};
function startMomentumTrader(trader: TraderState) {
  const tick = async () => {
    if (!running || !trader.isActive) return;
    const cur = getCurrentPrice(trader.symbol);
    const prev = prevPrices[trader.symbol] ?? cur;
    prevPrices[trader.symbol] = cur;
    const pctChange = (cur - prev) / prev;
    if (Math.abs(pctChange) > 0.001) {
      const side: "buy" | "sell" = pctChange > 0 ? "buy" : "sell";
      const qty = Math.round(Math.abs(pctChange) * 100000);
      await placeOrder(trader, side, "market", Math.max(qty, 50));
    }
  };
  return setInterval(tick, 2500);
}

// Panic: sells aggressively during drops
function startPanicTrader(trader: TraderState) {
  const tick = async () => {
    if (!running || !trader.isActive) return;
    const cur = getCurrentPrice(trader.symbol);
    const prev = prevPrices[trader.symbol] ?? cur;
    const drop = (prev - cur) / prev;
    if (drop > 0.005) {
      // Panic sell
      const qty = randInt(200, 1000);
      await placeOrder(trader, "sell", "market", qty);
      trader.lastAction = `PANIC SELL ${qty} ${trader.symbol}`;
    } else if (Math.random() < 0.1) {
      // Occasionally buy the dip
      const qty = randInt(100, 400);
      await placeOrder(trader, "buy", "limit", qty, cur * 0.995);
    }
  };
  return setInterval(tick, 3000);
}

export function initAiTraders() {
  const symbols = getSymbols();
  const types: Array<"retail" | "market_maker" | "momentum" | "panic"> = ["retail", "market_maker", "momentum", "panic"];

  for (const type of types) {
    for (let i = 0; i < 2; i++) {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      traders.push({
        id: `${type}_${i + 1}`,
        type,
        symbol: sym,
        ordersPlaced: 0,
        fills: 0,
        pnl: 0,
        isActive: true,
        lastAction: null,
        position: 0,
        avgCost: 0,
      });
    }
  }

  startTrading();
}

function startTrading() {
  running = true;
  timers.forEach(clearInterval);
  timers = [];
  for (const trader of traders) {
    let timer: ReturnType<typeof setInterval>;
    switch (trader.type) {
      case "retail":       timer = startRetailTrader(trader);   break;
      case "market_maker": timer = startMarketMaker(trader);    break;
      case "momentum":     timer = startMomentumTrader(trader); break;
      case "panic":        timer = startPanicTrader(trader);    break;
    }
    timers.push(timer!);
  }
}

export function stopTrading() {
  running = false;
  timers.forEach(clearInterval);
  timers = [];
}

export function resumeTrading() {
  if (!running) startTrading();
}

export function getTraders(): TraderState[] { return traders; }
