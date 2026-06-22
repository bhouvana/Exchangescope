import { useState } from "react";
import type { IndicatorState, SMAConfig, EMAConfig, BBConfig } from "./types";
import { C } from "./constants";

interface Props {
  indicators: IndicatorState;
  onToggleSMA: (period: number) => void;
  onUpdateSMA: (period: number, config: Partial<SMAConfig>) => void;
  onAddSMA: (config: SMAConfig) => void;
  onRemoveSMA: (period: number) => void;
  onToggleEMA: (period: number) => void;
  onUpdateEMA: (period: number, config: Partial<EMAConfig>) => void;
  onAddEMA: (config: EMAConfig) => void;
  onRemoveEMA: (period: number) => void;
  onToggleBB: () => void;
  onUpdateBB: (config: Partial<BBConfig>) => void;
  onToggleRSI: () => void;
  onToggleMACD: () => void;
  onToggleTrend: () => void;
}

export function IndicatorPanel({ indicators, onToggleSMA, onUpdateSMA, onAddSMA, onRemoveSMA,
  onToggleEMA, onUpdateEMA, onAddEMA, onRemoveEMA,
  onToggleBB, onUpdateBB, onToggleRSI, onToggleMACD, onToggleTrend }: Props) {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>IND</span>
        <button type="button" onClick={() => setShowConfig(!showConfig)}
          style={{ fontSize: 8, padding: "2px 5px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, color: C.textMuted, cursor: "pointer" }}>
          {showConfig ? "OK" : "CFG"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {indicators.smas.filter(s => s.visible).map(sma => (
          <button key={sma.period} type="button" onClick={() => onToggleSMA(sma.period)}
            style={{ padding: "2px 5px", fontSize: 8, background: `${sma.color}18`, border: `1px solid ${sma.color}`, borderRadius: 3, color: sma.color, cursor: "pointer" }}>
            SMA{sma.period}
          </button>
        ))}
        {indicators.emas.filter(e => e.visible).map(ema => (
          <button key={ema.period} type="button" onClick={() => onToggleEMA(ema.period)}
            style={{ padding: "2px 5px", fontSize: 8, background: `${ema.color}18`, border: `1px solid ${ema.color}`, borderRadius: 3, color: ema.color, cursor: "pointer" }}>
            EMA{ema.period}
          </button>
        ))}
        {indicators.bb.visible && (
          <button type="button" onClick={onToggleBB}
            style={{ padding: "2px 5px", fontSize: 8, background: "#4488FF18", border: "1px solid #4488FF", borderRadius: 3, color: "#4488FF", cursor: "pointer" }}>
            BB
          </button>
        )}
        {indicators.rsi.visible && (
          <button type="button" onClick={onToggleRSI}
            style={{ padding: "2px 5px", fontSize: 8, background: "#FF880018", border: "1px solid #FF8800", borderRadius: 3, color: "#FF8800", cursor: "pointer" }}>
            RSI
          </button>
        )}
        {indicators.macd.visible && (
          <button type="button" onClick={onToggleMACD}
            style={{ padding: "2px 5px", fontSize: 8, background: "#FF44FF18", border: "1px solid #FF44FF", borderRadius: 3, color: "#FF44FF", cursor: "pointer" }}>
            MACD
          </button>
        )}
        {indicators.trend && (
          <button type="button" onClick={onToggleTrend}
            style={{ padding: "2px 5px", fontSize: 8, background: "#FFD70018", border: "1px solid #FFD700", borderRadius: 3, color: "#FFD700", cursor: "pointer" }}>
            TREND
          </button>
        )}
      </div>

      {showConfig && (
        <div style={{ marginTop: 8, padding: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 9 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {indicators.smas.map(sma => (
              <button key={sma.period} onClick={() => onToggleSMA(sma.period)}
                style={{ padding: "2px 5px", background: sma.visible ? `${sma.color}30` : "transparent", border: `1px solid ${sma.visible ? sma.color : C.border}`, borderRadius: 2, color: sma.visible ? sma.color : C.textMuted, cursor: "pointer" }}>
                SMA{sma.period} {sma.visible ? "✓" : ""}
              </button>
            ))}
            {[10, 30, 100].filter(p => !indicators.smas.find(s => s.period === p)).map(p => (
              <button key={p} onClick={() => onAddSMA({ period: p, color: "#FF88CC", visible: true })}
                style={{ padding: "2px 5px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 2, color: C.textMuted, cursor: "pointer" }}>
                +SMA{p}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {indicators.emas.map(ema => (
              <button key={ema.period} onClick={() => onToggleEMA(ema.period)}
                style={{ padding: "2px 5px", background: ema.visible ? `${ema.color}30` : "transparent", border: `1px solid ${ema.visible ? ema.color : C.border}`, borderRadius: 2, color: ema.visible ? ema.color : C.textMuted, cursor: "pointer" }}>
                EMA{ema.period} {ema.visible ? "✓" : ""}
              </button>
            ))}
            <button onClick={() => onToggleBB()}
              style={{ padding: "2px 5px", background: indicators.bb.visible ? "#4488FF30" : "transparent", border: `1px solid ${indicators.bb.visible ? "#4488FF" : C.border}`, borderRadius: 2, color: indicators.bb.visible ? "#4488FF" : C.textMuted, cursor: "pointer" }}>
              BB {indicators.bb.visible ? "✓" : ""}
            </button>
            <button onClick={onToggleRSI}
              style={{ padding: "2px 5px", background: indicators.rsi.visible ? "#FF880030" : "transparent", border: `1px solid ${indicators.rsi.visible ? "#FF8800" : C.border}`, borderRadius: 2, color: indicators.rsi.visible ? "#FF8800" : C.textMuted, cursor: "pointer" }}>
              RSI {indicators.rsi.visible ? "✓" : ""}
            </button>
            <button onClick={onToggleMACD}
              style={{ padding: "2px 5px", background: indicators.macd.visible ? "#FF44FF30" : "transparent", border: `1px solid ${indicators.macd.visible ? "#FF44FF" : C.border}`, borderRadius: 2, color: indicators.macd.visible ? "#FF44FF" : C.textMuted, cursor: "pointer" }}>
              MACD {indicators.macd.visible ? "✓" : ""}
            </button>
            <button onClick={onToggleTrend}
              style={{ padding: "2px 5px", background: indicators.trend ? "#FFD70030" : "transparent", border: `1px solid ${indicators.trend ? "#FFD700" : C.border}`, borderRadius: 2, color: indicators.trend ? "#FFD700" : C.textMuted, cursor: "pointer" }}>
              TREND {indicators.trend ? "✓" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
