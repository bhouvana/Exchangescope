import type { TimeframeId, ChartType, IndicatorState, Drawing } from "./types";

export interface PersistedChartState {
  range: TimeframeId;
  chartType: ChartType;
  toolbarCollapsed: boolean;
  showVolume: boolean;
  indicators: IndicatorState;
  drawings: Drawing[];
}

function key(symbol: string) {
  return `exchangescope-chart-${symbol}`;
}

export function loadChartState(symbol: string): PersistedChartState | null {
  try {
    const raw = localStorage.getItem(key(symbol));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedChartState;
  } catch {
    return null;
  }
}

export function saveChartState(symbol: string, state: PersistedChartState): void {
  try {
    localStorage.setItem(key(symbol), JSON.stringify(state));
  } catch {}
}
