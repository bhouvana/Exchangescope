import { useMemo } from "react";
import type { EnrichedBar, ChartViewport } from "./types";
import { C, CHART_PADDING } from "./constants";
import { priceToY, barIdxToX, fmtPrice, formatTimeAxis, getPlotWidth } from "./utils";
import { useRegion } from "@/context/RegionContext";

interface Props {
  x: number | null;
  y: number | null;
  bar: EnrichedBar | null;
  barIdx: number | null;
  viewport: ChartViewport;
  domainMin: number;
  domainMax: number;
  bars: EnrichedBar[];
  range: string;
}

export function CrosshairOverlay({ x, y, bar, barIdx, viewport, domainMin, domainMax, bars, range }: Props) {
  const { regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol;

  const labels = useMemo(() => {
    if (x == null || barIdx == null || !bar) return null;
    const chartH = viewport.height;
    const plotW = getPlotWidth(viewport);
    const totalBars = viewport.endIdx - viewport.startIdx;
    if (totalBars <= 0 || plotW <= 0) return null;
    const barW = plotW / totalBars;
    const xPos = CHART_PADDING.left + (barIdx - viewport.startIdx) * barW + barW / 2;
    const priceY = priceToY(bar.close, domainMin, domainMax, chartH);
    const isUp = bar.isUp;
    const color = isUp ? C.green : C.red;

    const timeStr = formatTimeAxis(bar.timestamp, range as any);
    const volumeStr = bar.volume >= 1e9
      ? `${(bar.volume / 1e9).toFixed(2)}B`
      : bar.volume >= 1e6
        ? `${(bar.volume / 1e6).toFixed(1)}M`
        : bar.volume >= 1e3
          ? `${(bar.volume / 1e3).toFixed(0)}K`
          : `${bar.volume}`;

    return { xPos, priceY, color, timeStr, volumeStr };
  }, [x, barIdx, bar, viewport, domainMin, domainMax, range]);

  if (!labels || viewport.width === 0 || viewport.height === 0) return null;
  const { xPos, priceY, color, timeStr, volumeStr } = labels;

  const yAxisX = viewport.width - CHART_PADDING.right;

  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }} width={viewport.width} height={viewport.height}>
      {/* Vertical line */}
      <line x1={xPos} y1={0} x2={xPos} y2={viewport.height} stroke={C.crosshair} strokeWidth={1} />
      {/* Horizontal line */}
      <line x1={0} y1={priceY} x2={viewport.width} y2={priceY} stroke={C.crosshair} strokeWidth={1} />

      {/* Price label (right side, inline with Y-axis) */}
      <rect x={yAxisX} y={priceY - 9} width={CHART_PADDING.right} height={18} fill={C.bg} stroke={color} />
      <text x={viewport.width - 4} y={priceY + 4} textAnchor="end" fill={color} fontSize={10} fontWeight={600}>
        {cs}{fmtPrice(bar?.close ?? 0)}
      </text>

      {/* Time label (bottom, under X-axis) */}
      <rect x={xPos - 35} y={viewport.height - CHART_PADDING.bottom} width={70} height={18} fill={C.bg} stroke="#2a2a2a" rx={2} />
      <text x={xPos} y={viewport.height - CHART_PADDING.bottom + 13} textAnchor="middle" fill={C.textMuted} fontSize={9}>
        {timeStr}
      </text>

      {/* OHLCV Tooltip (top-right) */}
      <g>
        <rect x={viewport.width - 180} y={CHART_PADDING.top + 4} width={172} height={80} rx={4} fill={C.bg} stroke="#2a2a2a" opacity={0.92} />
        <text x={viewport.width - 172} y={CHART_PADDING.top + 20} fill={C.textSecondary} fontSize={10} fontWeight={600}>
          O: <tspan fill={C.textPrimary}>{cs}{fmtPrice(bar?.open ?? 0)}</tspan>
        </text>
        <text x={viewport.width - 172} y={CHART_PADDING.top + 34} fill={C.textSecondary} fontSize={10} fontWeight={600}>
          H: <tspan fill={C.green}>{cs}{fmtPrice(bar?.high ?? 0)}</tspan>
        </text>
        <text x={viewport.width - 172} y={CHART_PADDING.top + 48} fill={C.textSecondary} fontSize={10} fontWeight={600}>
          L: <tspan fill={C.red}>{cs}{fmtPrice(bar?.low ?? 0)}</tspan>
        </text>
        <text x={viewport.width - 172} y={CHART_PADDING.top + 62} fill={C.textSecondary} fontSize={10} fontWeight={600}>
          C: <tspan fill={color}>{cs}{fmtPrice(bar?.close ?? 0)}</tspan>
        </text>
        <text x={viewport.width - 172} y={CHART_PADDING.top + 76} fill={C.textSecondary} fontSize={10} fontWeight={600}>
          V: <tspan fill={C.textPrimary}>{volumeStr}</tspan>
        </text>
      </g>

      {/* Bar highlight on time axis */}
      <line x1={xPos} y1={viewport.height - CHART_PADDING.bottom} x2={xPos} y2={viewport.height} stroke={color} strokeWidth={2} />
    </svg>
  );
}
