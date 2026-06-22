import { useState, useCallback, useEffect, useRef } from "react";
import type { EnrichedBar, ChartViewport, IndicatorState, ToolId, Drawing } from "./types";
import { C, TIMEFRAMES } from "./constants";
import { barIdxToX, xToBarIdx } from "./utils";
import { useRegion } from "@/context/RegionContext";
import { fmtPrice } from "./utils";

interface Props {
  symbol: string;
  bars: EnrichedBar[];
  viewport: ChartViewport;
  domainMin: number;
  domainMax: number;
  loading: boolean;
  activeTool: ToolId;
  onCanvasClick: (x: number, y: number) => void;
  children: React.ReactNode;
}

export function ChartHeader({ symbol, bars, viewport, domainMin, domainMax, loading, activeTool, onCanvasClick, children }: Props) {
  return (
    <div style={{
      padding: "8px 14px", borderBottom: `1px solid ${C.border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      gap: 12,
    }}>
      {children}
    </div>
  );
}

export function SymbolInfo({ symbol, bars }: { symbol: string; bars: EnrichedBar[] }) {
  const { regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol;
  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : null;
  const price = last?.close;
  const change = price != null && prev ? price - prev.close : 0;
  const pct = prev && prev.close > 0 ? (change / prev.close) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{symbol}</span>
      {price != null && (
        <>
          <span style={{ fontSize: 13, fontWeight: 600, color: isUp ? C.green : C.red }}>
            {cs}{fmtPrice(price)}
          </span>
          <span style={{ fontSize: 11, color: isUp ? C.green : C.red }}>
            {change >= 0 ? "+" : ""}{cs}{fmtPrice(Math.abs(change))} ({change >= 0 ? "+" : ""}{pct.toFixed(2)}%)
          </span>
        </>
      )}
    </div>
  );
}
