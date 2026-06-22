import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { EnrichedBar, ToolId, TimeframeId, ChartViewport, IndicatorState, ChartType, Drawing } from "./types";
import { C, TIMEFRAMES, CHART_TYPES, DEFAULT_INDICATORS } from "./constants";
import { fmtPrice, fmtDate, getVisibleDomain, xToBarIdx, drawingPointToScreen, screenToDrawingPoint, barIdxToX, getPlotWidth } from "./utils";
import { useChartData } from "./useChartData";
import { useZoomPan } from "./useZoomPan";
import { useCrosshair } from "./useCrosshair";
import { useDrawings } from "./useDrawings";
import { useIndicators } from "./useIndicators";
import { Toolbar } from "./Toolbar";
import { ChartCanvas } from "./ChartCanvas";
import { DrawingOverlay } from "./DrawingOverlay";
import { CrosshairOverlay } from "./CrosshairOverlay";
import { VolumePane } from "./VolumePane";
import { TimelineNav } from "./TimelineNav";
import { IndicatorPanel } from "./IndicatorPanel";
import { ChartHeader, SymbolInfo } from "./ChartHeader";
import { useRegion } from "@/context/RegionContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { loadChartState, saveChartState } from "./chartPersistence";

interface ChartEngineProps {
  symbol: string;
  livePrice?: number;
  compactHeight?: number;
  compact?: boolean;
}

export function ChartEngine({ symbol, livePrice, compactHeight = 200, compact = false }: ChartEngineProps) {
  const { regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol;

  // Load persisted chart state for this symbol
  const persisted = useMemo(() => !compact ? loadChartState(symbol) : null, [symbol, compact]);

  const [range, setRange] = useState<TimeframeId>(persisted?.range ?? "5m");
  const [chartType, setChartType] = useState<ChartType>(persisted?.chartType ?? "candlestick");
  const [toolbarCollapsed, setToolbarCollapsed] = useState(persisted?.toolbarCollapsed ?? false);
  const [showVolume, setShowVolume] = useState(persisted?.showVolume ?? true);

  const { bars, enriched, isLoading } = useChartData(symbol, range);
  const { slice, setSlice, zoom, panPixels, trackVelocity, startInertia, stopInertia, reset } = useZoomPan(enriched.length);
  const { crosshair, setCrosshair, clearCrosshair } = useCrosshair();
  const { activeTool, setActiveTool, drawings, setDrawings, selectedId, selectDrawing, addPoint, addFreePoint, updateDrawing, deleteSelected, clearAll } = useDrawings(persisted?.drawings ?? []);
  const { indicators, toggleSMA, updateSMA, addSMA, removeSMA, toggleEMA, updateEMA, addEMA, removeEMA, toggleBB, updateBB, toggleRSI, toggleMACD, toggleTrend } = useIndicators(persisted?.indicators);

  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ startX: number; pxPerBar: number } | null>(null);
  const freeDrawingRef = useRef(false);

  const viewport: ChartViewport = useMemo(() => ({
    startIdx: slice[0],
    endIdx: slice[1],
    width: chartSize.width,
    height: chartSize.height,
  }), [slice, chartSize]);

  const visibleBars = useMemo(() => enriched.slice(slice[0], slice[1]), [enriched, slice]);
  const domain = useMemo(() => getVisibleDomain(visibleBars), [visibleBars]);

  useEffect(() => {
    if (!chartAreaRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setChartSize(prev => {
          if (prev.width !== Math.round(width) || prev.height !== Math.round(height)) {
            return { width: Math.round(width), height: Math.round(height) };
          }
          return prev;
        });
      }
    });
    ro.observe(chartAreaRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-save chart state to localStorage (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (compact) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveChartState(symbol, { range, chartType, toolbarCollapsed, showVolume, indicators, drawings });
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [symbol, range, chartType, toolbarCollapsed, showVolume, indicators, drawings, compact]);

  const getMousePos = useCallback((e: React.MouseEvent) => {
    if (!chartAreaRef.current) return null;
    const rect = chartAreaRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    if (!pos || !enriched.length) return;
    const barIdx = xToBarIdx(pos.x, viewport);
    if (barIdx < 0 || barIdx >= enriched.length) { clearCrosshair(); return; }
    const bar = enriched[barIdx];
    const x = barIdxToX(barIdx, viewport);
    setCrosshair(x, pos.y, barIdx, enriched, viewport);
    if (freeDrawingRef.current && activeTool === "free") {
      addFreePoint(screenToDrawingPoint(pos.x, pos.y, viewport, domain.min, domain.max));
    }
  }, [enriched, viewport, getMousePos, setCrosshair, clearCrosshair, activeTool, addFreePoint, domain]);

  const handleMouseLeave = useCallback(() => { clearCrosshair(); freeDrawingRef.current = false; }, [clearCrosshair]);

  // Native non-passive wheel handler — React's onWheel is passive in modern browsers,
  // which makes preventDefault() silently fail and the page scrolls instead of zooming.
  const handleWheelNative = useCallback((e: WheelEvent) => {
    if (!chartAreaRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    if (!enriched.length) return;
    const rect = chartAreaRef.current.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const cursorBarIdx = xToBarIdx(pos.x, viewport);
    zoom(e.deltaY, cursorBarIdx);
  }, [enriched, viewport, zoom]);

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", handleWheelNative);
  }, [handleWheelNative]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    if (!pos) return;
    if (activeTool === "cursor") {
      stopInertia();
      const [s, eIdx] = slice;
      const plotW = Math.max(chartAreaRef.current?.getBoundingClientRect().width ?? chartSize.width, 1);
      const pxPerBar = plotW / Math.max(eIdx - s, 1);
      dragRef.current = { startX: e.clientX, pxPerBar };
      let found: string | null = null;
      for (const d of drawings) {
        if (d.points.length === 0) continue;
        const screenPts = d.points.map(dp => drawingPointToScreen(dp, viewport, domain.min, domain.max));
        for (const sp of screenPts) {
          if (Math.abs(sp.x - pos.x) < 8 && Math.abs(sp.y - pos.y) < 8) { found = d.id; break; }
        }
        if (found) break;
      }
      selectDrawing(found);
      return;
    }
    if (activeTool === "free") {
      freeDrawingRef.current = true;
      addPoint(screenToDrawingPoint(pos.x, pos.y, viewport, domain.min, domain.max));
      return;
    }
    addPoint(screenToDrawingPoint(pos.x, pos.y, viewport, domain.min, domain.max));
  }, [activeTool, getMousePos, slice, chartSize, drawings, viewport, domain, selectDrawing, addPoint, stopInertia]);

  const handleMouseUp = useCallback(() => { freeDrawingRef.current = false; }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) < 0.3) return;
    dragRef.current.startX = e.clientX;
    const { pxPerBar } = dragRef.current;
    trackVelocity(dx, pxPerBar);
    panPixels(dx, pxPerBar);
  }, [panPixels, trackVelocity]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleGlobalMouseMove(e);
    const onUp = () => {
      if (dragRef.current) startInertia();
      dragRef.current = null;
      freeDrawingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [handleGlobalMouseMove, startInertia]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setActiveTool("cursor");
    if (e.key === "t" || e.key === "T") setActiveTool("trend");
    if (e.key === "h" || e.key === "H") setActiveTool("horizontal");
    if (e.key === "v" || e.key === "V") setActiveTool("vertical");
    if (e.key === "r" || e.key === "R") setActiveTool("rectangle");
    if (e.key === "y" || e.key === "Y") setActiveTool("ray");
    if (e.key === "a" || e.key === "A") setActiveTool("arrow");
    if (e.key === "f" || e.key === "F") setActiveTool("fib");
    if (e.key === "d" || e.key === "D") setActiveTool("free");
    if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
  }, [setActiveTool, deleteSelected]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRangeChange = useCallback((newRange: TimeframeId) => {
    setRange(newRange);
    reset();
    clearCrosshair();
  }, [setRange, reset, clearCrosshair]);

  const goToLive = useCallback(() => {
    setSlice([Math.max(0, enriched.length - Math.max(20, (slice[1] - slice[0]))), enriched.length]);
  }, [enriched.length, slice]);

  const timeframeButtons = (
    <div style={{ display: "flex", gap: 2 }}>
      {TIMEFRAMES.map(tf => (
        <button key={tf.value} type="button" onClick={() => handleRangeChange(tf.value)}
          style={{
            padding: "4px 8px", fontSize: 10, fontWeight: 600,
            background: range === tf.value ? "rgba(0,255,136,0.12)" : "transparent",
            border: `1px solid ${range === tf.value ? C.selection : C.border}`,
            borderRadius: 3, color: range === tf.value ? C.selection : C.textMuted, cursor: "pointer",
          }}>
          {tf.label}
        </button>
      ))}
    </div>
  );

  const chartTypeButtons = (
    <div style={{ display: "flex", gap: 2 }}>
      {CHART_TYPES.map(ct => (
        <button key={ct.id} type="button" onClick={() => setChartType(ct.id)}
          style={{
            padding: "3px 6px", fontSize: 9,
            background: chartType === ct.id ? "rgba(0,255,136,0.12)" : "transparent",
            border: `1px solid ${chartType === ct.id ? C.selection : C.border}`,
            borderRadius: 3, color: chartType === ct.id ? C.selection : C.textMuted, cursor: "pointer",
          }}>
          {ct.label}
        </button>
      ))}
    </div>
  );

  const indicatorToggles = (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <IndicatorPanel
        indicators={indicators}
        onToggleSMA={toggleSMA} onUpdateSMA={updateSMA} onAddSMA={addSMA} onRemoveSMA={removeSMA}
        onToggleEMA={toggleEMA} onUpdateEMA={updateEMA} onAddEMA={addEMA} onRemoveEMA={removeEMA}
        onToggleBB={toggleBB} onUpdateBB={updateBB}
        onToggleRSI={toggleRSI} onToggleMACD={toggleMACD} onToggleTrend={toggleTrend}
      />
      <span style={{ color: C.border, margin: "0 4px" }}>|</span>
      <button type="button" onClick={() => setShowVolume(!showVolume)}
        style={{
          padding: "3px 7px", fontSize: 9, fontWeight: 700,
          background: showVolume ? `${C.selection}18` : "transparent",
          border: `1px solid ${showVolume ? C.selection : C.border}`,
          borderRadius: 3, color: showVolume ? C.selection : C.textMuted, cursor: "pointer",
        }}>
        VOL
      </button>
    </div>
  );

  const chartArea = (
    <div
      ref={chartAreaRef}
      style={{ flex: 1, minHeight: 0, position: "relative", cursor: activeTool === "cursor" ? "default" : "crosshair" }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
    >
      <ChartCanvas
        viewport={viewport}
        domainMin={domain.min}
        domainMax={domain.max}
        bars={enriched}
        indicators={indicators}
        chartType={chartType}
        range={range}
      />
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }} width={chartSize.width} height={chartSize.height}>
        <DrawingOverlay
          drawings={drawings}
          selectedId={selectedId}
          viewport={viewport}
          domainMin={domain.min}
          domainMax={domain.max}
        />
      </svg>
      <CrosshairOverlay
        x={crosshair.x} y={crosshair.y} bar={crosshair.bar} barIdx={crosshair.barIdx}
        viewport={viewport} domainMin={domain.min} domainMax={domain.max}
        bars={enriched} range={range}
      />
    </div>
  );

  if (compact) {
    return (
      <div style={{ position: "relative", borderRadius: 4, overflow: "hidden" }}>
        <div ref={chartAreaRef} style={{ height: compactHeight, position: "relative" }}>
          {isLoading ? (
            <div style={{
              height: compactHeight, display: "flex", alignItems: "center", justifyContent: "center",
              color: C.textMuted, fontSize: 9, letterSpacing: "0.1em",
            }}>
              LOADING CHART…
            </div>
          ) : enriched.length === 0 ? (
            <div style={{
              height: compactHeight, display: "flex", alignItems: "center", justifyContent: "center",
              color: C.textMuted, fontSize: 9, letterSpacing: "0.1em",
            }}>
              NO DATA
            </div>
          ) : (
            <ChartCanvas
              viewport={{ startIdx: 0, endIdx: enriched.length, width: chartSize.width || 400, height: compactHeight }}
              domainMin={domain.min} domainMax={domain.max}
              bars={enriched}
              indicators={{ smas: [], emas: [], bb: { period: 20, stdDev: 2, visible: false }, rsi: { visible: false }, macd: { visible: false }, trend: false }}
              chartType="candlestick"
              range={range}
            />
          )}
        </div>
        <div style={{
          position: "absolute", bottom: 6, right: 8, fontSize: 9, color: C.textMuted,
          letterSpacing: "0.08em", background: "rgba(10,10,10,0.8)", padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.border}`,
        }}>
          CLICK TO EXPAND
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "monospace" }}>
      <ChartHeader symbol={symbol} bars={enriched} viewport={viewport} domainMin={domain.min} domainMax={domain.max}
        loading={isLoading} activeTool={activeTool} onCanvasClick={() => {}}>
        <SymbolInfo symbol={symbol} bars={enriched} />
        {timeframeButtons}
        {chartTypeButtons}
        {indicatorToggles}
        <button type="button" onClick={goToLive}
          style={{ padding: "3px 7px", fontSize: 9, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, color: C.textMuted, cursor: "pointer" }}>
          LIVE
        </button>
      </ChartHeader>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} onClearAll={clearAll}
          collapsed={toolbarCollapsed} onToggleCollapse={() => setToolbarCollapsed(!toolbarCollapsed)} />
        <ResizablePanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>
          <ResizablePanel defaultSize={78} minSize={40}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {chartArea}
              {showVolume && enriched.length > 0 && (
                <VolumePane bars={enriched} viewport={viewport} height={40} />
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle style={{ background: C.border }} />
          <ResizablePanel defaultSize={22} minSize={12}>
            <div style={{ height: "100%", padding: "8px 14px", overflow: "auto" }}>
              <OhlcDetailsPanel symbol={symbol} bars={enriched} range={range} cs={cs} indicators={indicators} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <TimelineNav bars={enriched} slice={slice} onSliceChange={setSlice} range={range} />
    </div>
  );
}

function OhlcDetailsPanel({ symbol, bars, range, cs, indicators }: {
  symbol: string; bars: EnrichedBar[]; range: TimeframeId; cs: string;
  indicators: IndicatorState;
}) {
  const rows = useMemo(() => {
    if (!bars.length) return [];
    return bars.slice(-12).reverse();
  }, [bars]);
  if (!rows.length) return <div style={{ color: C.textMuted, fontSize: 11 }}>No data</div>;
  const extCols: string[] = [];
  indicators.smas.filter(s => s.visible).forEach(s => extCols.push(`SMA${s.period}`));
  indicators.emas.filter(e => e.visible).forEach(e => extCols.push(`EMA${e.period}`));
  if (indicators.bb.visible) extCols.push("BB UP", "BB DN");
  if (indicators.rsi.visible) extCols.push("RSI");
  if (indicators.macd.visible) extCols.push("MACD", "SIGNAL");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>OHLC DETAILS</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `90px repeat(4, 1fr) ${extCols.map(() => "70px").join(" ")}`, gap: 4, fontSize: 10 }}>
        {["TIME", "OPEN", "HIGH", "LOW", "CLOSE", ...extCols].map(h => (
          <div key={h} style={{ color: C.textMuted, fontWeight: 700, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>{h}</div>
        ))}
        {rows.map((bar, i) => {
          const isUp = bar.close >= bar.open;
          return (
            <div key={i} style={{ display: "contents" }}>
              <div style={{ color: C.textMuted, padding: "3px 0" }}>{fmtDate(bar.timestamp, range)}</div>
              <div className="num" style={{ color: C.textSecondary }}>{cs}{fmtPrice(bar.open)}</div>
              <div className="num" style={{ color: C.green }}>{cs}{fmtPrice(bar.high)}</div>
              <div className="num" style={{ color: C.red }}>{cs}{fmtPrice(bar.low)}</div>
              <div className="num" style={{ color: isUp ? C.green : C.red, fontWeight: 600 }}>{cs}{fmtPrice(bar.close)}</div>
              {indicators.smas.filter(s => s.visible).map(s => {
                const val = bar[`sma${s.period}` as keyof EnrichedBar] as number | null;
                return <div key={s.period} className="num" style={{ color: s.color }}>{val != null ? fmtPrice(val) : "—"}</div>;
              })}
              {indicators.emas.filter(e => e.visible).map(e => {
                const val = bar[`ema${e.period}` as keyof EnrichedBar] as number | null;
                return <div key={e.period} className="num" style={{ color: e.color }}>{val != null ? fmtPrice(val) : "—"}</div>;
              })}
              {indicators.bb.visible && (
                <><div className="num" style={{ color: "#4488FF" }}>{bar.bbUpper != null ? fmtPrice(bar.bbUpper) : "—"}</div>
                  <div className="num" style={{ color: "#4488FF" }}>{bar.bbLower != null ? fmtPrice(bar.bbLower) : "—"}</div></>
              )}
              {indicators.rsi.visible && <div className="num" style={{ color: "#FF8800" }}>{bar.rsi != null ? bar.rsi.toFixed(1) : "—"}</div>}
              {indicators.macd.visible && (
                <><div className="num" style={{ color: "#FF44FF" }}>{bar.macd != null ? bar.macd.toFixed(2) : "—"}</div>
                  <div className="num" style={{ color: "#44FFFF" }}>{bar.macdSignal != null ? bar.macdSignal.toFixed(2) : "—"}</div></>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
