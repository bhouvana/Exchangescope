import type { OHLCBar, EnrichedBar, TimeframeId, DrawingPoint, Point2D, ChartViewport, AxisTick, TimeTick, HeikinAshiBar } from "./types";
import { CHART_PADDING, FIB_LEVELS } from "./constants";

export function fmtPrice(n: number, dec = 2): string {
  if (Math.abs(n) >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (Math.abs(n) >= 100) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function isIntraday(range: TimeframeId) {
  return range === "1m" || range === "5m" || range === "15m" || range === "30m" || range === "1h";
}

export function fmtDate(ts: string, range: TimeframeId): string {
  const d = new Date(ts);
  if (range === "1m" || range === "5m" || range === "15m" || range === "30m")
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (range === "1h")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
           d.toLocaleTimeString("en-US", { hour: "2-digit" });
  if (range === "1d")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export function fmtTooltip(ts: string, range: TimeframeId): string {
  const d = new Date(ts);
  if (isIntraday(range))
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatTimeAxis(ts: string, range: TimeframeId): string {
  const d = new Date(ts);
  if (range === "1m" || range === "5m" || range === "15m" || range === "30m")
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (range === "1h" || range === "1d")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (range === "1w" || range === "1M")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  // 3M, 6M, 1Y, 5Y, max — show full year so adjacent years are distinguishable
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── SMA ──
export function calcSMA(data: { close: number }[], n: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < n - 1) return null;
    let sum = 0;
    for (let j = i - n + 1; j <= i; j++) sum += data[j].close;
    return sum / n;
  });
}

// ── EMA ──
export function calcEMA(data: { close: number }[], n: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (n + 1);
  let ema: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { result.push(null); continue; }
    if (ema == null) {
      let sum = 0;
      for (let j = i - n + 1; j <= i; j++) sum += data[j].close;
      ema = sum / n;
    } else {
      ema = (data[i].close - ema) * k + ema;
    }
    result.push(ema);
  }
  return result;
}

// ── BB ──
export function calcBB(data: { close: number }[], period = 20, mult = 2) {
  const mid = calcSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (mid[i] == null) { upper.push(null); lower.push(null); continue; }
    const mean = mid[i]!;
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (data[j].close - mean) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
  }
  return { upper, lower, mid };
}

// ── RSI ──
export function calcRSI(data: { close: number }[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (i === period) {
      let gainSum = 0, lossSum = 0;
      for (let j = 1; j <= period; j++) {
        const d = data[j].close - data[j - 1].close;
        if (d > 0) gainSum += d; else lossSum -= d;
      }
      avgGain = gainSum / period;
      avgLoss = lossSum / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else if (i > period) {
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      result.push(null);
    }
  }
  return result;
}

// ── MACD ──
export function calcMACD(data: { close: number }[]) {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macd: (number | null)[] = [];
  const signal: (number | null)[] = [];
  const hist: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (ema12[i] == null || ema26[i] == null) {
      macd.push(null);
      signal.push(null);
      hist.push(null);
      continue;
    }
    macd.push(ema12[i]! - ema26[i]!);
  }
  const sigLine = calcEMA(macd.map(v => ({ close: v ?? 0 })), 9);
  for (let i = 0; i < data.length; i++) {
    signal.push(macd[i] != null ? sigLine[i] : null);
    hist.push(macd[i] != null && signal[i] != null ? macd[i]! - signal[i]! : null);
  }
  return { macd, signal, hist };
}

// ── Trend ──
export function calcTrend(data: { close: number }[]): number[] {
  const dirs: number[] = [];
  let streak = 0;
  for (let i = 1; i < data.length; i++) {
    const chg = data[i].close - data[i - 1].close;
    if (chg > 0) streak = Math.min(streak + 1, 3);
    else if (chg < 0) streak = Math.max(streak - 1, -3);
    else streak = 0;
    dirs.push(streak);
  }
  return [0, ...dirs];
}

// ── Heikin Ashi ──
export function calcHeikinAshi(bars: OHLCBar[]): HeikinAshiBar[] {
  const ha: HeikinAshiBar[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen = i === 0 ? b.open : (ha[i - 1].open + ha[i - 1].close) / 2;
    const haHigh = Math.max(b.high, haOpen, haClose);
    const haLow = Math.min(b.low, haOpen, haClose);
    ha.push({ timestamp: b.timestamp, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: b.volume, isUp: haClose >= haOpen });
  }
  return ha;
}

// ── Enrich ──
export function enrichBars(bars: OHLCBar[]): EnrichedBar[] {
  const sma20 = calcSMA(bars, 20);
  const sma50 = calcSMA(bars, 50);
  const sma200 = calcSMA(bars, 200);
  const ema12 = calcEMA(bars, 12);
  const ema26 = calcEMA(bars, 26);
  const bb = calcBB(bars, 20, 2);
  const rsi = calcRSI(bars);
  const macd = calcMACD(bars);
  const trend = calcTrend(bars);
  return bars.map((bar, i) => {
    const domainMin = Math.min(bar.low, bb.lower[i] ?? bar.low);
    const domainMax = Math.max(bar.high, bb.upper[i] ?? bar.high);
    return {
      ...bar,
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i],
      ema12: ema12[i], ema26: ema26[i],
      bbUpper: bb.upper[i], bbLower: bb.lower[i], bbMid: bb.mid[i],
      rsi: rsi[i],
      macd: macd.macd[i], macdSignal: macd.signal[i], macdHist: macd.hist[i],
      trendDir: trend[i],
      yMin: domainMin * 0.998, yMax: domainMax * 1.002,
      volColor: bar.isUp ? "rgba(0,255,136,0.25)" : "rgba(255,68,68,0.25)",
    };
  });
}

// ── Domain ──
export function getVisibleDomain(bars: EnrichedBar[]): { min: number; max: number } {
  if (!bars.length) return { min: 0, max: 1 };
  let min = Infinity, max = -Infinity;
  for (const b of bars) {
    if (b.yMin < min) min = b.yMin;
    if (b.yMax > max) max = b.yMax;
  }
  const pad = (max - min) * 0.05;
  return { min: min - pad, max: max + pad };
}

// ── Coordinate transforms ──
export function priceToY(price: number, domainMin: number, domainMax: number, chartH: number): number {
  const plotH = chartH - CHART_PADDING.top - CHART_PADDING.bottom;
  const range = domainMax - domainMin;
  if (range === 0) return CHART_PADDING.top + plotH / 2;
  return CHART_PADDING.top + plotH * (1 - Math.max(0, Math.min(1, (price - domainMin) / range)));
}

export function yToPrice(y: number, domainMin: number, domainMax: number, chartH: number): number {
  const plotH = chartH - CHART_PADDING.top - CHART_PADDING.bottom;
  if (plotH === 0) return domainMin;
  const ratio = 1 - (y - CHART_PADDING.top) / plotH;
  return domainMin + Math.max(0, Math.min(1, ratio)) * (domainMax - domainMin);
}

export function barIdxToX(idx: number, viewport: ChartViewport): number {
  const totalBars = viewport.endIdx - viewport.startIdx;
  if (totalBars <= 0) return 0;
  const plotW = viewport.width - CHART_PADDING.left - CHART_PADDING.right;
  if (plotW <= 0) return 0;
  const barW = plotW / totalBars;
  return CHART_PADDING.left + (idx - viewport.startIdx) * barW + barW / 2;
}

export function getBarWidth(viewport: ChartViewport): number {
  const totalBars = viewport.endIdx - viewport.startIdx;
  if (totalBars <= 0) return 1;
  const plotW = viewport.width - CHART_PADDING.left - CHART_PADDING.right;
  return Math.max(1, plotW / totalBars);
}

export function xToBarIdx(x: number, viewport: ChartViewport): number {
  const totalBars = viewport.endIdx - viewport.startIdx;
  if (totalBars <= 0) return Math.floor(viewport.startIdx);
  const plotW = viewport.width - CHART_PADDING.left - CHART_PADDING.right;
  if (plotW <= 0) return Math.floor(viewport.startIdx);
  const barW = plotW / totalBars;
  // Round the full result so float startIdx doesn't produce float indices
  return Math.round((x - CHART_PADDING.left) / barW + viewport.startIdx);
}

export function getPlotWidth(viewport: ChartViewport): number {
  return Math.max(1, viewport.width - CHART_PADDING.left - CHART_PADDING.right);
}

export function drawingPointToScreen(dp: DrawingPoint, viewport: ChartViewport, domainMin: number, domainMax: number): Point2D {
  return {
    x: barIdxToX(dp.barIdx, viewport),
    y: priceToY(dp.price, domainMin, domainMax, viewport.height),
  };
}

export function screenToDrawingPoint(x: number, y: number, viewport: ChartViewport, domainMin: number, domainMax: number): DrawingPoint {
  return {
    barIdx: xToBarIdx(x, viewport),
    price: yToPrice(y, domainMin, domainMax, viewport.height),
  };
}

// ── Fib levels ──
export function calcFibLevels(startPrice: number, endPrice: number) {
  const diff = endPrice - startPrice;
  return FIB_LEVELS.map(level => ({
    level,
    price: endPrice - diff * level,
    label: `${(level * 100).toFixed(1)}%`,
  }));
}

export function dist2D(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Y-axis ticks ──
function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / 10 ** exp;
  let nice: number;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * 10 ** exp;
}

export function generateYTicks(min: number, max: number, maxTicks = 6): AxisTick[] {
  const range = niceNum(max - min, false);
  const tickSpacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
  const ticks: AxisTick[] = [];
  for (let v = niceMin; v <= niceMax + tickSpacing * 0.5; v += tickSpacing) {
    if (v >= min && v <= max) {
      ticks.push({ value: v, label: fmtPrice(v) });
    }
  }
  return ticks;
}

// ── X-axis ticks ──
export function generateXTicks(bars: { timestamp: string }[], startIdx: number, endIdx: number, viewport: ChartViewport, range: TimeframeId): TimeTick[] {
  const totalBars = endIdx - startIdx;
  if (totalBars <= 0 || !bars.length) return [];
  const plotW = getPlotWidth(viewport);
  const minPxBetweenLabels = 70;
  const maxTicks = Math.max(2, Math.floor(plotW / minPxBetweenLabels));
  const step = Math.max(1, Math.floor(totalBars / maxTicks));
  const ticks: TimeTick[] = [];
  for (let i = startIdx; i < endIdx; i += step) {
    const bar = bars[i];
    if (!bar) continue;
    const x = barIdxToX(i, viewport);
    ticks.push({ x, label: formatTimeAxis(bar.timestamp, range) });
  }
  return ticks;
}
