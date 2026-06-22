export interface OHLCBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

export interface EnrichedBar extends OHLCBar {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbMid: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  trendDir: number;
  yMin: number;
  yMax: number;
  volColor: string;
}

export type TimeframeId = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1w" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "max";

export interface TimeframeOption {
  label: string;
  value: TimeframeId;
}

export type ChartType = "candlestick" | "hollow" | "ohlc" | "line" | "area" | "heikin-ashi";

export interface ChartTypeOption {
  id: ChartType;
  label: string;
}

export type ToolId = "cursor" | "trend" | "horizontal" | "vertical" | "rectangle" | "ray" | "arrow" | "fib" | "free";

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: string;
  shortcut: string;
}

export interface DrawingPoint {
  barIdx: number;
  price: number;
}

export interface Drawing {
  id: string;
  tool: ToolId;
  points: DrawingPoint[];
  color: string;
}

export interface SMAConfig {
  period: number;
  color: string;
  visible: boolean;
}

export interface EMAConfig {
  period: number;
  color: string;
  visible: boolean;
}

export interface BBConfig {
  period: number;
  stdDev: number;
  visible: boolean;
}

export interface RSIInfo {
  visible: boolean;
}

export interface MACDInfo {
  visible: boolean;
}

export interface IndicatorState {
  smas: SMAConfig[];
  emas: EMAConfig[];
  bb: BBConfig;
  rsi: RSIInfo;
  macd: MACDInfo;
  trend: boolean;
}

export interface ChartViewport {
  startIdx: number;
  endIdx: number;
  width: number;
  height: number;
}

export interface CrosshairState {
  x: number | null;
  y: number | null;
  bar: EnrichedBar | null;
  barIdx: number | null;
}

export interface AxisTick {
  value: number;
  label: string;
  y?: number;
}

export interface TimeTick {
  x: number;
  label: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface HeikinAshiBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}
