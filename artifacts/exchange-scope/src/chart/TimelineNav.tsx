import { useRef, useCallback, useMemo } from "react";
import type { EnrichedBar } from "./types";
import { C } from "./constants";
import { fmtDate } from "./utils";

interface Props {
  bars: EnrichedBar[];
  slice: [number, number];
  onSliceChange: (s: [number, number]) => void;
  range: string;
}

export function TimelineNav({ bars, slice, onSliceChange, range }: Props) {
  const navRef = useRef<HTMLDivElement>(null);
  const [s, e] = slice;
  const totalBars = bars.length;

  const miniBarData = useMemo(() => {
    if (!totalBars) return [];
    const max = Math.max(...bars.map(b => b.close), 1);
    const min = Math.min(...bars.map(b => b.close));
    const range = max - min || 1;
    return bars.map(b => ({
      color: b.isUp ? C.greenDim : C.redDim,
      h: ((b.close - min) / range) * 28 + 2,
    }));
  }, [bars, totalBars]);

  const handleNavClick = useCallback((ev: React.MouseEvent) => {
    if (!navRef.current || !totalBars) return;
    const rect = navRef.current.getBoundingClientRect();
    const pct = (ev.clientX - rect.left) / rect.width;
    const range = e - s;
    const center = Math.round(pct * totalBars);
    const ns = Math.max(0, Math.min(center - range / 2, totalBars - range));
    onSliceChange([Math.round(ns), Math.round(ns + range)]);
  }, [s, e, totalBars, onSliceChange]);

  if (!totalBars) return null;

  return (
    <div
      ref={navRef}
      style={{ height: 32, position: "relative", borderTop: `1px solid ${C.border}`, cursor: "pointer", flexShrink: 0 }}
      onClick={handleNavClick}
    >
      <svg width="100%" height={32} style={{ display: "block" }}>
        {miniBarData.map((d, i) => (
          <rect key={i} x={(i / totalBars) * 100 + "%"} y={32 - d.h} width={Math.max(1 / totalBars * 100, 0.05) + "%"} height={d.h}
            fill={d.color} opacity={0.4} />
        ))}
        <rect x={(s / totalBars) * 100 + "%"} y={0} width={((e - s) / totalBars) * 100 + "%"} height={32}
          fill="none" stroke={C.selection} strokeWidth={2} strokeOpacity={0.6} rx={2} />
        <rect x={(s / totalBars) * 100 + "%"} y={0} width={3} height={32} fill={C.selection} opacity={0.8} rx={1} />
        <rect x={(e / totalBars) * 100 + "%"} y={0} width={3} height={32} fill={C.selection} opacity={0.8} rx={1} />
      </svg>
      <div style={{ position: "absolute", left: 6, top: 8, fontSize: 8, color: C.textMuted }}>
        {totalBars} bars
      </div>
    </div>
  );
}
