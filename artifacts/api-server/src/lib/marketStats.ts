import { engine } from "./matchingEngine";
import { getStats } from "./marketData";

let rateTracker: { ordersReceived: number; tradesExecuted: number; at: number } | null = null;
let lastRates = { ordersPerSecond: 0, tradesPerSecond: 0 };
let lastRateCalcAt = 0;
let cached: ReturnType<typeof getStats> | null = null;

export function resetRateTracker() {
  rateTracker = null;
  lastRates = { ordersPerSecond: 0, tradesPerSecond: 0 };
  lastRateCalcAt = 0;
  cached = null;
}

export function getCachedMarketStats() {
  return cached ?? getStats();
}

export async function buildMarketStats() {
  const engineStats = await engine.getStats();
  const appStats = getStats();
  const now = Date.now();

  const ordersReceived = Math.max(appStats.ordersReceived, engineStats.ordersReceived ?? 0);
  const ordersFilled   = Math.max(appStats.ordersFilled,   engineStats.ordersFilled   ?? 0);
  const ordersRejected = Math.max(appStats.ordersRejected, engineStats.ordersRejected ?? 0);
  const partialFills   = Math.max(appStats.partialFills,   engineStats.partialFills   ?? 0);
  const tradesExecuted = engineStats.tradesExecuted ?? 0;

  if (now - lastRateCalcAt >= 800) {
    if (rateTracker) {
      const dtSec = Math.max((now - rateTracker.at) / 1000, 0.25);
      lastRates = {
        ordersPerSecond: Math.max(0, Math.round((ordersReceived - rateTracker.ordersReceived) / dtSec)),
        tradesPerSecond: Math.max(0, Math.round((tradesExecuted - rateTracker.tradesExecuted) / dtSec)),
      };
    }
    rateTracker = { ordersReceived, tradesExecuted, at: now };
    lastRateCalcAt = now;
  }

  const matchingUs = engineStats.avgLatUs ?? appStats.latency.matchingUs;
  const gatewayUs  = appStats.latency.gatewayUs;
  const queueUs    = appStats.latency.queueUs;
  const totalUs    = gatewayUs + queueUs + matchingUs;
  const queueDepth = Math.max(0, Math.round(lastRates.ordersPerSecond * (totalUs / 1000)));

  cached = {
    ...appStats,
    ordersPerSecond: lastRates.ordersPerSecond,
    tradesPerSecond: lastRates.tradesPerSecond,
    queueDepth,
    ordersReceived,
    ordersFilled,
    ordersRejected,
    partialFills,
    latency: { gatewayUs, queueUs, matchingUs, totalUs },
  };

  return cached;
}
