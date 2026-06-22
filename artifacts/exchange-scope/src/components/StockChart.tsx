import { useState } from "react";
import { ChartEngine } from "@/chart/ChartEngine";

interface StockChartProps {
  symbol: string;
  livePrice?: number;
  compactHeight?: number;
}

export function StockChart({ symbol, livePrice, compactHeight = 200 }: StockChartProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div onClick={() => setExpanded(true)} style={{ cursor: "pointer" }}>
        <ChartEngine
          symbol={symbol}
          livePrice={livePrice}
          compactHeight={compactHeight}
          compact
        />
      </div>
      {expanded && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setExpanded(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1400px, 98vw)", height: "min(850px, 94vh)",
              background: "#0A0A0A", border: "1px solid rgba(0,255,136,0.19)", borderRadius: 8,
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.9)", fontFamily: "monospace",
            }}
          >
            <ChartEngine
              symbol={symbol}
              livePrice={livePrice}
              compactHeight={compactHeight}
            />
          </div>
        </div>
      )}
    </>
  );
}
