import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useRegion } from "@/context/RegionContext";
import { useSimulatedTraders } from "@/context/SimulatedTradersContext";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f", blue: "#00BFFF", orange: "#FFB800", purple: "#A855F7" };

const TRADER_COLORS: Record<string, string> = {
  retail: "#6B7280",
  market_maker: "#00FF88",
  momentum: "#FFB800",
  panic: "#FF4444",
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtBig(n: number, cs = "$") {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e6) return `${s}${cs}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}${cs}${(a / 1e3).toFixed(1)}K`;
  return `${s}${cs}${a.toFixed(0)}`;
}

/* ─── Detail Modal ─── */
function TraderModal({ trader, onClose }: { trader: any; onClose: () => void }) {
  const { regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol;
  const color = TRADER_COLORS[trader.type] ?? "#888";
  const pnlPos = (trader.pnl ?? 0) >= 0;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "#0D0D0D", border: `1px solid ${color}40`, borderRadius: 12, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${color}20`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: trader.isActive ? color : "#333", boxShadow: trader.isActive ? `0 0 10px ${color}` : "none", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{trader.id}</div>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>{trader.type.replace("_", " ")} · {trader.isActive ? "ACTIVE" : "PAUSED"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {/* Key metrics */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "P&L", value: `${pnlPos ? "+" : ""}${cs}${fmt(Math.abs(trader.pnl ?? 0))}`, color: pnlPos ? C.green : C.red },
              { label: "POSITION", value: fmt(trader.position ?? 0), color: "#fff" },
              { label: "ORDERS", value: fmt(trader.ordersPlaced ?? 0), color: C.blue },
              { label: "FILLS", value: fmt(trader.fills ?? 0), color: C.green },
              { label: "WIN RATE", value: `${Math.round((trader.winRate ?? 0.5) * 100)}%`, color: C.orange },
              { label: "AVG TRADE", value: fmt(trader.avgTradeSize ?? 0), color: C.purple },
            ].map(m => (
              <div key={m.label} style={{ flex: "1 1 80px", background: "#111", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.08em", marginBottom: 2 }}>{m.label}</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Current holding */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 6 }}>CURRENT HOLDING</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#111", borderRadius: 6 }}>
              <Link href={`/orderbook?symbol=${trader.symbol}`}>
                <span style={{ fontSize: 20, fontWeight: 800, color: color, cursor: "pointer" }}>{trader.symbol}</span>
              </Link>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 10 }}>
                <div><span style={{ color: "#555" }}>Entry: </span><span style={{ color: "#aaa" }} className="num">{cs}{fmt(trader.avgEntryPrice ?? 0, 2)}</span></div>
                <div><span style={{ color: "#555" }}>Qty: </span><span style={{ color: "#fff", fontWeight: 700 }} className="num">{fmt(trader.position ?? 0)}</span></div>
                <div><span style={{ color: "#555" }}>Value: </span><span style={{ color: "#fff", fontWeight: 700 }} className="num">{fmtBig(trader.totalValue ?? 0, cs)}</span></div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 6 }}>RECENT ACTIVITY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {(trader.history ?? []).slice(-12).reverse().map((h: any, i: number) => {
                const isBuy = h.action === "BOUGHT" || h.action === "ADDED";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 70px 60px 50px 50px 1fr", gap: 6, padding: "4px 8px", background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent", borderRadius: 3, fontSize: 9, alignItems: "center" }}>
                    <span style={{ color: "#444" }}>{h.time}</span>
                    <span style={{ color: isBuy ? C.green : C.red, fontWeight: 600, fontSize: 8 }}>{h.action}</span>
                    <span style={{ color: "#aaa", fontWeight: 600 }}>{h.symbol}</span>
                    <span className="num" style={{ color: "#888" }}>{fmt(h.qty)}</span>
                    <span className="num" style={{ color: "#888" }}>{cs}{fmt(h.price, 2)}</span>
                    <span className="num" style={{ color: "#666", textAlign: "right" }}>{cs}{fmt(h.qty * h.price, 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AiTraders() {
  const { regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol;
  const { allTraders } = useSimulatedTraders();
  const [selectedTrader, setSelectedTrader] = useState<any | null>(null);

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>AI TRADERS</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
            AUTOMATED MARKET PARTICIPANTS · {allTraders.length} ACTIVE · {allTraders.filter((t: any) => t.isActive).length} TRADING
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 9, color: "#555", letterSpacing: "0.06em" }}>
          {(["retail", "market_maker", "momentum", "panic"] as const).map(type => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: TRADER_COLORS[type] }} />
              <span>{type.replace("_", " ")}: {allTraders.filter(t => t.type === type).length}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {allTraders.map((t, idx) => {
          const color = TRADER_COLORS[t.type] ?? "#888";
          const pnlPos = (t.pnl ?? 0) >= 0;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.003 }}
              onClick={() => setSelectedTrader(t)}
              style={{ cursor: "pointer", background: C.card, border: `1px solid ${color}25`, borderRadius: 8, padding: 14 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.id}</div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginTop: 2, textTransform: "uppercase" }}>{t.type.replace("_", " ")}</div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                  background: t.isActive ? color : "#333",
                  boxShadow: t.isActive ? `0 0 8px ${color}` : "none",
                }} />
              </div>

              <Link href={`/orderbook?symbol=${t.symbol}`} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8, cursor: "pointer" }}>
                  {t.symbol}
                </div>
              </Link>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                <div>
                  <div style={{ fontSize: 8, color: "#444" }}>ORDERS</div>
                  <div className="num" style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{fmt(t.ordersPlaced ?? 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: "#444" }}>FILLS</div>
                  <div className="num" style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{fmt(t.fills ?? 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: "#444" }}>P&L</div>
                  <div className="num" style={{ color: pnlPos ? C.green : C.red, fontWeight: 700, fontSize: 12 }}>
                    {pnlPos ? "+" : ""}{fmtBig(t.pnl ?? 0, cs)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: "#444" }}>POSITION</div>
                  <div className="num" style={{ color: "#aaa", fontSize: 12 }}>{fmt(t.position ?? 0)}</div>
                </div>
              </div>

              {t.lastAction && (
                <div style={{ marginTop: 8, padding: "4px 8px", background: "#0a0a0a", borderRadius: 4, fontSize: 8, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.lastAction}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedTrader && (
          <TraderModal trader={selectedTrader} onClose={() => setSelectedTrader(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
