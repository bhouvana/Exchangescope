import { useMemo } from "react";
import type { EnrichedBar, ChartViewport } from "./types";
import { C, CHART_PADDING } from "./constants";
import { barIdxToX, getPlotWidth } from "./utils";

interface Props {
  bars: EnrichedBar[];
  viewport: ChartViewport;
  height: number;
}

export function VolumePane({ bars, viewport, height }: Props) {
  const { startIdx, endIdx, width } = viewport;
  const totalBars = endIdx - startIdx;
  const plotW = getPlotWidth(viewport);

  const volData = useMemo(() => {
    if (!totalBars || !plotW || !bars.length) return { volumes: [], maxVol: 0, barW: 0 };
    const visible = bars.slice(startIdx, endIdx);
    const maxVol = Math.max(...visible.map(b => b.volume), 1);
    const barW = plotW / totalBars;
    return { volumes: visible, maxVol, barW };
  }, [bars, startIdx, endIdx, totalBars, plotW]);

  if (!totalBars || !plotW || !height) return null;

  const { volumes, maxVol, barW } = volData;
  const paddedBarW = Math.max(1, barW - 1);

  return (
    <div style={{ position: "relative", height, borderTop: `1px solid ${C.border}` }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <line x1={0} y1={0} x2={width} y2={0} stroke={C.border} strokeWidth={1} opacity={0.5} />
        {volumes.map((bar, i) => {
          const idx = startIdx + i;
          const cx = barIdxToX(idx, viewport);
          const h = (bar.volume / maxVol) * (height - 2);
          const color = bar.isUp ? C.greenDim : C.redDim;
          return <rect key={idx} x={cx - paddedBarW / 2} y={height - 2 - h} width={paddedBarW} height={h} fill={color} />;
        })}
      </svg>
    </div>
  );
}
