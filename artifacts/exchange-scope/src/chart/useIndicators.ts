import { useState, useCallback } from "react";
import type { IndicatorState, SMAConfig, EMAConfig, BBConfig } from "./types";
import { DEFAULT_INDICATORS } from "./constants";

export function useIndicators(initial?: Partial<IndicatorState>) {
  const [state, setState] = useState<IndicatorState>({
    smas: initial?.smas ?? DEFAULT_INDICATORS.smas.map(s => ({ ...s })),
    emas: initial?.emas ?? DEFAULT_INDICATORS.emas.map(s => ({ ...s })),
    bb: initial?.bb ?? { ...DEFAULT_INDICATORS.bb },
    rsi: initial?.rsi ?? { ...DEFAULT_INDICATORS.rsi },
    macd: initial?.macd ?? { ...DEFAULT_INDICATORS.macd },
    trend: initial?.trend ?? DEFAULT_INDICATORS.trend,
  });

  const toggleSMA = useCallback((period: number) => {
    setState(prev => ({ ...prev, smas: prev.smas.map(s => s.period === period ? { ...s, visible: !s.visible } : s) }));
  }, []);
  const updateSMA = useCallback((period: number, config: Partial<SMAConfig>) => {
    setState(prev => ({ ...prev, smas: prev.smas.map(s => s.period === period ? { ...s, ...config } : s) }));
  }, []);
  const addSMA = useCallback((config: SMAConfig) => {
    setState(prev => ({ ...prev, smas: [...prev.smas, config] }));
  }, []);
  const removeSMA = useCallback((period: number) => {
    setState(prev => ({ ...prev, smas: prev.smas.filter(s => s.period !== period) }));
  }, []);

  const toggleEMA = useCallback((period: number) => {
    setState(prev => ({ ...prev, emas: prev.emas.map(e => e.period === period ? { ...e, visible: !e.visible } : e) }));
  }, []);
  const updateEMA = useCallback((period: number, config: Partial<EMAConfig>) => {
    setState(prev => ({ ...prev, emas: prev.emas.map(e => e.period === period ? { ...e, ...config } : e) }));
  }, []);
  const addEMA = useCallback((config: EMAConfig) => {
    setState(prev => ({ ...prev, emas: [...prev.emas, config] }));
  }, []);
  const removeEMA = useCallback((period: number) => {
    setState(prev => ({ ...prev, emas: prev.emas.filter(e => e.period !== period) }));
  }, []);

  const toggleBB = useCallback(() => {
    setState(prev => ({ ...prev, bb: { ...prev.bb, visible: !prev.bb.visible } }));
  }, []);
  const updateBB = useCallback((config: Partial<BBConfig>) => {
    setState(prev => ({ ...prev, bb: { ...prev.bb, ...config } }));
  }, []);
  const toggleRSI = useCallback(() => {
    setState(prev => ({ ...prev, rsi: { visible: !prev.rsi.visible } }));
  }, []);
  const toggleMACD = useCallback(() => {
    setState(prev => ({ ...prev, macd: { visible: !prev.macd.visible } }));
  }, []);
  const toggleTrend = useCallback(() => {
    setState(prev => ({ ...prev, trend: !prev.trend }));
  }, []);

  return {
    indicators: state,
    toggleSMA, updateSMA, addSMA, removeSMA,
    toggleEMA, updateEMA, addEMA, removeEMA,
    toggleBB, updateBB, toggleRSI, toggleMACD, toggleTrend,
  };
}
