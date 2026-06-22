import { useMemo } from "react";
import type { ChartViewport, EnrichedBar, IndicatorState, ChartType, AxisTick, TimeTick } from "./types";
import { C, CHART_PADDING } from "./constants";
import { priceToY, barIdxToX, getPlotWidth, generateYTicks, generateXTicks, calcHeikinAshi, getBarWidth } from "./utils";

interface Props {
  viewport: ChartViewport;
  domainMin: number;
  domainMax: number;
  bars: EnrichedBar[];
  indicators: IndicatorState;
  chartType: ChartType;
  range: string;
}

export function ChartCanvas({ viewport, domainMin, domainMax, bars, indicators, chartType, range }: Props) {
  const plotW = getPlotWidth(viewport);
  const plotLeft = CHART_PADDING.left;
  const { width, height } = viewport;
  // Floor/ceil so float startIdx from smooth pan doesn't break array ops
  const startIdx = Math.floor(viewport.startIdx);
  const endIdx = Math.ceil(viewport.endIdx);

  const visibleBars = bars.slice(startIdx, endIdx);
  const totalBars = endIdx - startIdx;

  const haBars = useMemo(() => {
    if (chartType !== "heikin-ashi") return null;
    return calcHeikinAshi(visibleBars.map(b => ({ ...b })));
  }, [visibleBars, chartType]);

  const barW = useMemo(() => getBarWidth(viewport), [viewport]);
  const candlePadding = Math.max(0.5, barW * 0.2);
  const candleW = Math.max(1, barW - candlePadding * 2);

  const yTicks: AxisTick[] = useMemo(() => generateYTicks(domainMin, domainMax), [domainMin, domainMax]);
  const xTicks: TimeTick[] = useMemo(() => generateXTicks(bars, startIdx, endIdx, viewport, range as any), [bars, startIdx, endIdx, viewport, range]);

  function yVal(price: number) {
    return priceToY(price, domainMin, domainMax, height);
  }

  // Determine which bars to render (HA or regular)
  const renderBars = haBars ?? visibleBars;

  // ── Render helpers ──
  function renderCandle(bar: typeof renderBars[0], idx: number, i: number) {
    const cx = barIdxToX(idx, viewport);
    const color = bar.isUp ? C.green : C.red;
    const openY = yVal(bar.open);
    const closeY = yVal(bar.close);
    const highY = yVal(bar.high);
    const lowY = yVal(bar.low);
    const bodyTop = Math.min(openY, closeY);
    const bodyBot = Math.max(openY, closeY);
    const bodyH = Math.max(bodyBot - bodyTop, 1);
    const isFilled = bar.isUp;
    return (
      <g key={idx}>
        <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1} />
        <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
          fill={isFilled ? color : C.bg} stroke={color} strokeWidth={0.5} />
      </g>
    );
  }

  function renderHollow(bar: typeof renderBars[0], idx: number) {
    const cx = barIdxToX(idx, viewport);
    const color = bar.isUp ? C.green : C.red;
    const openY = yVal(bar.open);
    const closeY = yVal(bar.close);
    const highY = yVal(bar.high);
    const lowY = yVal(bar.low);
    const bodyTop = Math.min(openY, closeY);
    const bodyBot = Math.max(openY, closeY);
    const bodyH = Math.max(bodyBot - bodyTop, 1);
    return (
      <g key={idx}>
        <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1} />
        <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
          fill={bar.isUp ? "transparent" : color} stroke={color} strokeWidth={1} />
      </g>
    );
  }

  function renderOHLC(bar: typeof renderBars[0], idx: number) {
    const cx = barIdxToX(idx, viewport);
    const color = bar.isUp ? C.green : C.red;
    const highY = yVal(bar.high);
    const lowY = yVal(bar.low);
    const openY = yVal(bar.open);
    const closeY = yVal(bar.close);
    const tickW = Math.max(2, candleW);
    return (
      <g key={idx}>
        <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1} />
        <line x1={cx - tickW} y1={openY} x2={cx} y2={openY} stroke={color} strokeWidth={1} />
        <line x1={cx} y1={closeY} x2={cx + tickW} y2={closeY} stroke={color} strokeWidth={1} />
      </g>
    );
  }

  function renderLine(bar: typeof renderBars[0], idx: number) {
    return null; // rendered as polyline
  }

  const linePoints = useMemo(() => {
    if (chartType !== "line" && chartType !== "area") return "";
    return renderBars.map((bar, i) => {
      const idx = startIdx + i;
      const x = barIdxToX(idx, viewport);
      const y = yVal(bar.close);
      return `${x},${y}`;
    }).join(" ");
  }, [renderBars, startIdx, viewport, chartType, domainMin, domainMax]);

  const areaPath = useMemo(() => {
    if (chartType !== "area" || !linePoints) return "";
    const firstX = barIdxToX(startIdx, viewport);
    const lastX = barIdxToX(startIdx + renderBars.length - 1, viewport);
    const bottom = height - CHART_PADDING.bottom;
    return `${linePoints} L${lastX},${bottom} L${firstX},${bottom} Z`;
  }, [linePoints, chartType, startIdx, viewport, renderBars.length, height]);

  // ── Price markers on right side ──
  const plotHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  if (!totalBars || !width || !height) return null;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* ── Grid lines ── */}
      {yTicks.map((tick, i) => {
        const y = yVal(tick.value);
        if (y < CHART_PADDING.top || y > height - CHART_PADDING.bottom) return null;
        return (
          <line key={`grid_${i}`} x1={0} y1={y} x2={width} y2={y}
            stroke={C.grid} strokeWidth={1} />
        );
      })}

      {/* ── Area fill ── */}
      {chartType === "area" && areaPath && (
        <path d={areaPath} fill={C.green} opacity={0.1} />
      )}

      {/* ── Line ── */}
      {(chartType === "line" || chartType === "area") && linePoints && (
        <polyline points={linePoints} fill="none" stroke={C.green} strokeWidth={1.5} />
      )}

      {/* ── Candles / OHLC ── */}
      {chartType !== "line" && chartType !== "area" && renderBars.map((bar, i) => {
        const idx = startIdx + i;
        switch (chartType) {
          case "hollow": return renderHollow(bar, idx);
          case "ohlc": return renderOHLC(bar, idx);
          case "heikin-ashi": return renderCandle(bar, idx, i);
          default: return renderCandle(bar, idx, i);
        }
      })}

      {/* ── SMA lines ── */}
      {indicators.smas.filter(s => s.visible).map(sma => {
        const pts = visibleBars.map((bar, i) => {
          const val = bar[`sma${sma.period}` as keyof EnrichedBar] as number | null;
          if (val == null) return null;
          const x = barIdxToX(startIdx + i, viewport);
          const y = yVal(val);
          return `${x},${y}`;
        }).filter(Boolean).join(" ");
        if (!pts) return null;
        return <polyline key={`sma${sma.period}`} points={pts} fill="none" stroke={sma.color} strokeWidth={1} opacity={0.7} />;
      })}

      {/* ── EMA lines ── */}
      {indicators.emas.filter(e => e.visible).map(ema => {
        const pts = visibleBars.map((bar, i) => {
          const val = bar[`ema${ema.period}` as keyof EnrichedBar] as number | null;
          if (val == null) return null;
          const x = barIdxToX(startIdx + i, viewport);
          const y = yVal(val);
          return `${x},${y}`;
        }).filter(Boolean).join(" ");
        if (!pts) return null;
        return <polyline key={`ema${ema.period}`} points={pts} fill="none" stroke={ema.color} strokeWidth={1} opacity={0.6} strokeDasharray="4 3" />;
      })}

      {/* ── Bollinger Bands ── */}
      {indicators.bb.visible && (() => {
        const upperPts = visibleBars.map((bar, i) => {
          if (bar.bbUpper == null) return null;
          return `${barIdxToX(startIdx + i, viewport)},${yVal(bar.bbUpper)}`;
        }).filter(Boolean).join(" ");
        const lowerPts = visibleBars.map((bar, i) => {
          if (bar.bbLower == null) return null;
          return `${barIdxToX(startIdx + i, viewport)},${yVal(bar.bbLower)}`;
        }).filter(Boolean).join(" ");
        const midPts = visibleBars.map((bar, i) => {
          if (bar.bbMid == null) return null;
          return `${barIdxToX(startIdx + i, viewport)},${yVal(bar.bbMid)}`;
        }).filter(Boolean).join(" ");
        return (
          <>
            {upperPts && <polyline points={upperPts} fill="none" stroke="#4488FF" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />}
            {lowerPts && <polyline points={lowerPts} fill="none" stroke="#4488FF" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />}
            {midPts && <polyline points={midPts} fill="none" stroke="#4488FF" strokeWidth={0.8} opacity={0.4} />}
          </>
        );
      })()}

      {/* ── Trend detection ── */}
      {indicators.trend && (() => {
        const lines: React.ReactNode[] = [];
        let swingStart = 0;
        for (let i = 2; i < visibleBars.length; i++) {
          const prev2 = visibleBars[i - 2]?.close ?? 0;
          const prev1 = visibleBars[i - 1]?.close ?? 0;
          const curr = visibleBars[i]?.close ?? 0;
          if (curr < prev1 && prev1 > prev2 && i - swingStart >= 3) {
            const y0 = yVal(visibleBars[swingStart].close);
            const y1 = yVal(prev1);
            const x0 = barIdxToX(startIdx + swingStart, viewport);
            const x1 = barIdxToX(startIdx + i - 1, viewport);
            lines.push(<line key={`trend_${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#FFD700" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />);
            swingStart = i - 1;
          }
        }
        return lines.length ? <>{lines}</> : null;
      })()}

      {/* ── Y-axis labels (right side) ── */}
      {yTicks.map((tick, i) => {
        const y = yVal(tick.value);
        if (y < CHART_PADDING.top + 4 || y > height - CHART_PADDING.bottom - 4) return null;
        return (
          <g key={`ytick_${i}`}>
            <text x={width - 4} y={y + 3} textAnchor="end" fill={C.textMuted} fontSize={10}>
              {tick.label}
            </text>
          </g>
        );
      })}

      {/* ── X-axis labels ── */}
      {xTicks.map((tick, i) => (
        <g key={`xtick_${i}`}>
          <text x={tick.x} y={height - 4} textAnchor="middle" fill={C.textMuted} fontSize={9}>
            {tick.label}
          </text>
        </g>
      ))}

      {/* ── Border lines ── */}
      <line x1={0} y1={CHART_PADDING.top} x2={width} y2={CHART_PADDING.top} stroke={C.border} strokeWidth={1} />
      <line x1={0} y1={height - CHART_PADDING.bottom} x2={width} y2={height - CHART_PADDING.bottom} stroke={C.border} strokeWidth={1} />
      <line x1={width - CHART_PADDING.right} y1={CHART_PADDING.top} x2={width - CHART_PADDING.right} y2={height - CHART_PADDING.bottom} stroke={C.border} strokeWidth={1} />
    </svg>
  );
}
