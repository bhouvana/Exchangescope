import { useMemo } from "react";
import type { Drawing, ChartViewport, EnrichedBar } from "./types";
import { priceToY, barIdxToX, drawingPointToScreen, calcFibLevels } from "./utils";
import { C, FIB_LEVELS } from "./constants";

interface Props {
  drawings: Drawing[];
  selectedId: string | null;
  viewport: ChartViewport;
  domainMin: number;
  domainMax: number;
}

export function DrawingOverlay({ drawings, selectedId, viewport, domainMin, domainMax }: Props) {
  const { width, height } = viewport;

  const rend = useMemo(() => {
    return drawings.map(d => {
      const pts = d.points.map(dp => drawingPointToScreen(dp, viewport, domainMin, domainMax));
      const isSelected = d.id === selectedId;
      const sw = isSelected ? 2 : 1.5;
      const opacity = isSelected ? 1 : 0.7;
      const color = d.color;

      if (d.tool === "horizontal" && pts.length > 0) {
        const y = pts[0].y;
        return (
          <g key={d.id}>
            <line x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={sw} opacity={opacity} />
            {isSelected && <circle cx={width} cy={y} r={4} fill={color} />}
          </g>
        );
      }

      if (d.tool === "vertical" && pts.length > 0) {
        const x = pts[0].x;
        return (
          <g key={d.id}>
            <line x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={sw} opacity={opacity} />
            {isSelected && <circle cx={x} cy={height} r={4} fill={color} />}
          </g>
        );
      }

      if ((d.tool === "trend" || d.tool === "ray" || d.tool === "arrow" || d.tool === "free") && pts.length >= 2) {
        if (d.tool === "free") {
          const pointStr = pts.map(p => `${p.x},${p.y}`).join(" ");
          return (
            <g key={d.id}>
              <polyline points={pointStr} fill="none" stroke={color} strokeWidth={sw} opacity={opacity} />
              {isSelected && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
            </g>
          );
        }
        const p1 = pts[0], p2 = pts[pts.length - 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx);
        if (d.tool === "ray") {
          const endX = dx > 0 ? width * 2 : -width;
          const endY = p1.y + (endX - p1.x) * dy / (dx || 0.001);
          return (
            <g key={d.id}>
              <line x1={p1.x} y1={p1.y} x2={endX} y2={endY} stroke={color} strokeWidth={sw} opacity={opacity} />
              {isSelected && <circle cx={p1.x} cy={p1.y} r={4} fill={color} />}
            </g>
          );
        }
        if (d.tool === "arrow") {
          const headLen = 10;
          const headAngle = Math.PI / 6;
          const endX = p2.x, endY = p2.y;
          return (
            <g key={d.id}>
              <line x1={p1.x} y1={p1.y} x2={endX} y2={endY} stroke={color} strokeWidth={sw} opacity={opacity} />
              <polygon points={`${endX},${endY} ${endX - headLen * Math.cos(angle - headAngle)},${endY - headLen * Math.sin(angle - headAngle)} ${endX - headLen * Math.cos(angle + headAngle)},${endY - headLen * Math.sin(angle + headAngle)}`}
                fill={color} opacity={opacity} />
              {isSelected && <circle cx={p1.x} cy={p1.y} r={4} fill={color} />}
            </g>
          );
        }
        return (
          <g key={d.id}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={sw} opacity={opacity} />
            {isSelected && (
              <>
                <circle cx={p1.x} cy={p1.y} r={4} fill={color} />
                <circle cx={p2.x} cy={p2.y} r={4} fill={color} />
              </>
            )}
          </g>
        );
      }

      if (d.tool === "rectangle" && pts.length === 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);
        return (
          <g key={d.id}>
            <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={sw} opacity={opacity} />
            {isSelected && (
              <>
                <rect x={x} y={y} width={6} height={6} fill={color} />
                <rect x={x + w - 6} y={y} width={6} height={6} fill={color} />
                <rect x={x} y={y + h - 6} width={6} height={6} fill={color} />
                <rect x={x + w - 6} y={y + h - 6} width={6} height={6} fill={color} />
              </>
            )}
          </g>
        );
      }

      if (d.tool === "fib" && pts.length >= 2) {
        const first = pts[0], last = pts[pts.length - 1];
        const startPrice = d.points[0].price;
        const endPrice = d.points[d.points.length - 1].price;
        const levels = calcFibLevels(startPrice, endPrice);
        const y0 = Math.min(first.y, last.y);
        const y1 = Math.max(first.y, last.y);
        return (
          <g key={d.id}>
            {levels.map((lv, i) => {
              const ly = priceToY(lv.price, domainMin, domainMax, viewport.height);
              return (
                <g key={i}>
                  <line x1={0} y1={ly} x2={width} y2={ly} stroke={color} strokeWidth={0.5} opacity={0.3} strokeDasharray="3 3" />
                  <rect x={4} y={ly - 8} width={70} height={14} rx={2} fill="#0D0D0D" stroke={color} strokeOpacity={0.5} />
                  <text x={8} y={ly + 3} fill={color} fontSize={8}>{lv.label} {lv.price.toFixed(2)}</text>
                </g>
              );
            })}
          </g>
        );
      }

      return null;
    });
  }, [drawings, selectedId, viewport, domainMin, domainMax]);

  return <>{rend}</>;
}
