import { useState, useCallback, useRef, useEffect } from "react";

const MIN_BARS = 5;
const DEFAULT_VISIBLE = 120; // bars shown on initial load / after range change

export function useZoomPan(totalBars: number, initialSlice?: [number, number]) {
  const [slice, setSlice] = useState<[number, number]>(
    initialSlice ?? [0, 0]
  );
  const sliceRef = useRef(slice);
  sliceRef.current = slice;

  // Inertia
  const velocityRef = useRef(0); // bars/ms
  const lastVelTimeRef = useRef(0);
  const inertiaRAFRef = useRef<number | null>(null);

  useEffect(() => {
    if (totalBars <= 0) return;
    const [s, e] = sliceRef.current;
    if (s === 0 && e === 0) {
      // Initial load or after a range reset — show last DEFAULT_VISIBLE bars
      const end = totalBars;
      const start = Math.max(0, end - DEFAULT_VISIBLE);
      const next: [number, number] = [start, end];
      sliceRef.current = next;
      setSlice(next);
    } else if (e > totalBars) {
      // Dataset was shortened (e.g. symbol/range change to fewer bars) — reset
      const end = totalBars;
      const start = Math.max(0, end - DEFAULT_VISIBLE);
      const next: [number, number] = [start, end];
      sliceRef.current = next;
      setSlice(next);
    } else if (e >= totalBars - 1) {
      // User is at the live end and new bars arrived — extend the window to stay live
      const windowSize = Math.max(MIN_BARS, e - s);
      const next: [number, number] = [Math.max(0, totalBars - windowSize), totalBars];
      sliceRef.current = next;
      setSlice(next);
    }
  }, [totalBars]);

  const clamp = useCallback((s: number, e: number): [number, number] => {
    const range = Math.max(MIN_BARS, Math.min(totalBars, e - s));
    const ns = Math.max(0, Math.min(s, totalBars - range));
    return [ns, ns + range];
  }, [totalBars]);

  // Low-level pan: float precision, immediate ref update for RAF continuity
  const applyPan = useCallback((deltaBars: number) => {
    const [s, e] = sliceRef.current;
    const range = e - s;
    const ns = Math.max(0, Math.min(s + deltaBars, totalBars - range));
    const next: [number, number] = [ns, ns + range];
    sliceRef.current = next;
    setSlice(next);
  }, [totalBars]);

  // Zoom: cursor-anchored, smooth 10% per wheel tick
  const zoom = useCallback((wheelDelta: number, cursorBarIdx: number) => {
    if (inertiaRAFRef.current) {
      cancelAnimationFrame(inertiaRAFRef.current);
      inertiaRAFRef.current = null;
    }
    velocityRef.current = 0;

    const [s, e] = sliceRef.current;
    const curRange = e - s;
    const factor = wheelDelta > 0 ? 1.1 : 1 / 1.1;
    const newRange = Math.max(MIN_BARS, Math.min(totalBars, curRange * factor));
    const centerRatio = (cursorBarIdx - s) / Math.max(curRange, 1);
    const newStart = cursorBarIdx - centerRatio * newRange;
    const [ns, ne] = clamp(newStart, newStart + newRange);
    sliceRef.current = [ns, ne];
    setSlice([ns, ne]);
  }, [totalBars, clamp]);

  // Pan by pixel delta — no rounding, full float precision
  const panPixels = useCallback((dx: number, pxPerBar: number) => {
    if (pxPerBar <= 0 || Math.abs(dx) < 0.1) return;
    applyPan(-dx / pxPerBar);
  }, [applyPan]);

  // Record velocity for inertia (exponentially smoothed)
  const trackVelocity = useCallback((dx: number, pxPerBar: number) => {
    const now = performance.now();
    const dt = now - lastVelTimeRef.current;
    if (dt > 0 && dt < 150 && pxPerBar > 0) {
      const v = (-dx / pxPerBar) / dt; // bars/ms
      velocityRef.current = velocityRef.current * 0.4 + v * 0.6;
    }
    lastVelTimeRef.current = now;
  }, []);

  // Momentum scroll after drag release
  const startInertia = useCallback(() => {
    if (Math.abs(velocityRef.current) < 0.01) return;
    if (inertiaRAFRef.current) cancelAnimationFrame(inertiaRAFRef.current);

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      // ~92% velocity retained per 16ms frame
      velocityRef.current *= Math.pow(0.92, dt / 16);

      if (Math.abs(velocityRef.current) < 0.003) {
        velocityRef.current = 0;
        inertiaRAFRef.current = null;
        return;
      }

      applyPan(velocityRef.current * dt);
      inertiaRAFRef.current = requestAnimationFrame(tick);
    };

    inertiaRAFRef.current = requestAnimationFrame(tick);
  }, [applyPan]);

  const stopInertia = useCallback(() => {
    if (inertiaRAFRef.current) {
      cancelAnimationFrame(inertiaRAFRef.current);
      inertiaRAFRef.current = null;
    }
    velocityRef.current = 0;
  }, []);

  // Public pan (from timeline nav / keyboard): kills inertia first
  const pan = useCallback((deltaBars: number) => {
    stopInertia();
    applyPan(deltaBars);
  }, [applyPan, stopInertia]);

  const setViewRange = useCallback((start: number, end: number) => {
    stopInertia();
    setSlice(clamp(start, end));
  }, [clamp, stopInertia]);

  const reset = useCallback(() => {
    stopInertia();
    // Use [0,0] as sentinel so the totalBars effect re-initializes to the last
    // DEFAULT_VISIBLE bars once the new dataset arrives, regardless of whether
    // the new dataset is larger or smaller than the current one.
    const next: [number, number] = [0, 0];
    sliceRef.current = next;
    setSlice(next);
  }, [stopInertia]);

  useEffect(() => {
    return () => {
      if (inertiaRAFRef.current) cancelAnimationFrame(inertiaRAFRef.current);
    };
  }, []);

  return {
    slice, setSlice,
    zoom, pan, panPixels,
    trackVelocity, startInertia, stopInertia,
    setViewRange, reset,
  };
}
