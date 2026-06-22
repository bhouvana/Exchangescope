import type { TimeframeOption, ToolDef, SMAConfig, EMAConfig, BBConfig, RSIInfo, MACDInfo, IndicatorState, ChartTypeOption } from "./types";

export const C = {
  green: "#00FF88",
  red: "#FF4444",
  greenDim: "rgba(0,255,136,0.25)",
  redDim: "rgba(255,68,68,0.25)",
  bg: "#0A0A0A",
  card: "#111111",
  border: "#1a1a1a",
  textPrimary: "#ffffff",
  textSecondary: "#888888",
  textMuted: "#555555",
  grid: "#1a1a1a",
  crosshair: "#777777",
  selection: "#00FF88",
};

export const TIMEFRAMES: TimeframeOption[] = [
  { label: "1m",  value: "1m" },
  { label: "5m",  value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1H",  value: "1h" },
  { label: "1D",  value: "1d" },
  { label: "1W",  value: "1w" },
  { label: "1M",  value: "1M" },
  { label: "3M",  value: "3M" },
  { label: "6M",  value: "6M" },
  { label: "1Y",  value: "1Y" },
  { label: "5Y",  value: "5Y" },
  { label: "MAX", value: "max" },
];

export const CHART_TYPES: ChartTypeOption[] = [
  { id: "candlestick", label: "Candle" },
  { id: "hollow", label: "Hollow" },
  { id: "ohlc", label: "OHLC" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "heikin-ashi", label: "HA" },
];

export const DRAW_TOOLS: ToolDef[] = [
  { id: "cursor", label: "Cursor", icon: "↖", shortcut: "Esc" },
  { id: "trend", label: "Trend Line", icon: "╱", shortcut: "T" },
  { id: "horizontal", label: "Horizontal", icon: "━", shortcut: "H" },
  { id: "vertical", label: "Vertical", icon: "┃", shortcut: "V" },
  { id: "rectangle", label: "Rectangle", icon: "▭", shortcut: "R" },
  { id: "ray", label: "Ray", icon: "➡", shortcut: "Y" },
  { id: "arrow", label: "Arrow", icon: "↑", shortcut: "A" },
  { id: "fib", label: "Fibonacci", icon: "~", shortcut: "F" },
  { id: "free", label: "Free Draw", icon: "✎", shortcut: "D" },
];

export const DEFAULT_INDICATORS: IndicatorState = {
  smas: [
    { period: 20, color: "#FFaa00", visible: true },
    { period: 50, color: "#aa66FF", visible: true },
    { period: 200, color: "#66CCFF", visible: false },
  ],
  emas: [
    { period: 12, color: "#FF88CC", visible: false },
    { period: 26, color: "#88FFCC", visible: false },
  ],
  bb: { period: 20, stdDev: 2, visible: false },
  rsi: { visible: false },
  macd: { visible: false },
  trend: false,
};

export const DRAW_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

export const CHART_PADDING = { top: 4, bottom: 24, left: 4, right: 55 };

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
