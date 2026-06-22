import { useState, useCallback, useRef, useMemo } from "react";
import type { EnrichedBar, ChartViewport, CrosshairState } from "./types";

export function useCrosshair() {
  const [state, setState] = useState<CrosshairState>({ x: null, y: null, bar: null, barIdx: null });
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((x: number | null, y: number | null, barIdx: number | null, bars: EnrichedBar[], viewport: ChartViewport) => {
    if (x == null || barIdx == null || barIdx < 0 || barIdx >= bars.length) {
      setState({ x: null, y: null, bar: null, barIdx: null });
      return;
    }
    setState({ x, y, bar: bars[barIdx], barIdx });
  }, []);

  const clear = useCallback(() => {
    setState({ x: null, y: null, bar: null, barIdx: null });
  }, []);

  const getNearestBar = useCallback((px: number, bars: EnrichedBar[], viewport: ChartViewport) => {
    const totalBars = viewport.endIdx - viewport.startIdx;
    if (totalBars <= 0 || !bars.length) return null;
    const barW = viewport.width / totalBars;
    const idx = Math.round(px / barW) + viewport.startIdx;
    return Math.max(0, Math.min(idx, bars.length - 1));
  }, []);

  return { crosshair: state, setCrosshair: update, clearCrosshair: clear, getNearestBar };
}
