import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListStocks, useGetStockHistory } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

function fmt(n: number | undefined | null, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBig(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function PriceChart({ symbol }: { symbol: string }) {
  const { data, isLoading } = useGetStockHistory(symbol, "1d", { query: { refetchInterval: 5000 } });
  if (isLoading) return (
    <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 12 }}>
      Loading chart...
    </div>
  );
  if (!data?.length) return null;

  const first = data[0]?.close ?? 0;
  const isUp = (data[data.length - 1]?.close ?? 0) >= first;

  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? C.green : C.red} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={isUp ? C.green : C.red} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, fontSize: 11 }}
            formatter={(v: number) => [`$${fmt(v)}`, "Price"]}
            labelFormatter={(l) => new Date(l).toLocaleTimeString()}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={isUp ? C.green : C.red}
            strokeWidth={1.5}
            fill="url(#chartGrad)"
            dot={false}
            animationDuration={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MarketOverview() {
  const { data: stocks, isLoading } = useListStocks({ query: { refetchInterval: 2000 } });
  const [selected, setSelected] = useState<string>("AAPL");

  const sorted = stocks ? [...stocks] : [];
  const topGainer = sorted.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0];
  const topLoser  = sorted.sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))[0];
  const topVolume = stocks ? [...stocks].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0] : null;

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>
          MARKET OVERVIEW
        </h1>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
          LIVE · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Market movers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "TOP GAINER", stock: topGainer, color: C.green },
          { label: "TOP LOSER",  stock: topLoser,  color: C.red },
          { label: "HIGH VOLUME",stock: topVolume, color: "#FFB800" },
        ].map(({ label, stock, color }) => (
          <motion.div
            key={label}
            whileHover={{ scale: 1.02 }}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "14px 16px",
              cursor: "pointer",
            }}
            onClick={() => stock && setSelected(stock.symbol)}
          >
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
            {stock ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>
                  {stock.symbol}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{stock.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }} className="num">
                    ${fmt(stock.price)}
                  </span>
                  <span style={{ fontSize: 12, color, fontWeight: 600 }} className="num">
                    {(stock.changePercent ?? 0) >= 0 ? "+" : ""}{fmt(stock.changePercent)}%
                  </span>
                </div>
              </>
            ) : (
              <div style={{ height: 48, background: "#1a1a1a", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main grid: watchlist + chart */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        {/* Watchlist */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
            WATCHLIST · {stocks?.length ?? 0} SYMBOLS
          </div>
          {isLoading ? (
            <div style={{ padding: 24, color: "#555", fontSize: 12, textAlign: "center" }}>Loading...</div>
          ) : (
            <AnimatePresence>
              {stocks?.map((stock, i) => {
                const isUp = (stock.changePercent ?? 0) >= 0;
                const isSelected = stock.symbol === selected;
                return (
                  <motion.div
                    key={stock.symbol}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(stock.symbol)}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(0,255,136,0.06)" : "transparent",
                      borderLeft: isSelected ? "2px solid #00FF88" : "2px solid transparent",
                      borderBottom: `1px solid ${C.border}`,
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? C.green : "#fff" }}>
                          {stock.symbol}
                        </div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{stock.name?.split(" ")[0]}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }} className="num">
                          ${fmt(stock.price)}
                        </div>
                        <div style={{ fontSize: 11, color: isUp ? C.green : C.red, fontWeight: 600 }} className="num">
                          {isUp ? "+" : ""}{fmt(stock.changePercent)}%
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 4, height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
                      <motion.div
                        style={{
                          height: "100%",
                          background: isUp ? C.green : C.red,
                          borderRadius: 1,
                          width: `${Math.min(Math.abs(stock.changePercent ?? 0) * 15, 100)}%`,
                        }}
                        layoutId={`bar-${stock.symbol}`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Chart panel */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>PRICE CHART · {selected}</div>
            <div style={{ fontSize: 11, color: "#00FF88" }}>1D · 5m BARS</div>
          </div>
          <div style={{ padding: "0 0 8px" }}>
            <PriceChart symbol={selected} />
          </div>

          {/* Selected stock detail */}
          {stocks && (() => {
            const s = stocks.find(x => x.symbol === selected);
            if (!s) return null;
            const isUp = (s.changePercent ?? 0) >= 0;
            return (
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {[
                  { label: "PRICE",    value: `$${fmt(s.price)}`,              color: "#fff" },
                  { label: "CHANGE",   value: `${isUp?"+":""}${fmt(s.change)}`, color: isUp ? C.green : C.red },
                  { label: "VOLUME",   value: (s.volume ?? 0).toLocaleString(), color: "#fff" },
                  { label: "MKT CAP",  value: fmtBig(s.marketCap ?? 0),        color: "#fff" },
                  { label: "52W HIGH", value: `$${fmt(s.week52High)}`,          color: "#fff" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }} className="num">{value}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Full stock grid */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 10 }}>ALL SYMBOLS</div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 100px 100px 120px 120px 80px",
            padding: "8px 16px",
            fontSize: 9,
            color: "#555",
            letterSpacing: "0.1em",
            borderBottom: `1px solid ${C.border}`,
          }}>
            {["SYMBOL", "NAME", "PRICE", "CHANGE", "VOLUME", "MKT CAP", "P/E"].map(h => <div key={h}>{h}</div>)}
          </div>
          {stocks?.map((s, i) => {
            const isUp = (s.changePercent ?? 0) >= 0;
            return (
              <motion.div
                key={s.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(s.symbol)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 100px 100px 120px 120px 80px",
                  padding: "10px 16px",
                  fontSize: 12,
                  borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer",
                  background: selected === s.symbol ? "rgba(0,255,136,0.04)" : "transparent",
                  transition: "background 0.1s",
                }}
              >
                <div style={{ fontWeight: 700, color: selected === s.symbol ? C.green : "#fff" }}>{s.symbol}</div>
                <div style={{ color: "#777", fontSize: 11 }}>{s.name}</div>
                <div className="num" style={{ color: "#fff", fontWeight: 600 }}>${fmt(s.price)}</div>
                <div className="num" style={{ color: isUp ? C.green : C.red, fontWeight: 600 }}>
                  {isUp ? "+" : ""}{fmt(s.changePercent)}%
                </div>
                <div className="num" style={{ color: "#888", fontSize: 11 }}>{(s.volume ?? 0).toLocaleString()}</div>
                <div className="num" style={{ color: "#888", fontSize: 11 }}>{fmtBig(s.marketCap ?? 0)}</div>
                <div className="num" style={{ color: "#888", fontSize: 11 }}>{fmt(s.peRatio, 1)}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
