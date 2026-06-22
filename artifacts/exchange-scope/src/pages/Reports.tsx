import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f", orange: "#FFB800", blue: "#00BFFF", purple: "#A855F7" };

interface Order {
  id: string; symbol: string; type: string; side: string;
  quantity: number; price: number | null; status: string;
  filledQuantity: number; avgFillPrice: number | null;
  createdAt: string;
}

interface Trade {
  id: string; symbol: string; price: number; quantity: number;
  side: string; timestamp: string;
}

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const SectionIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

export default function Reports() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      fetch("/api/auth/orders", { credentials: "include" }).then(r => r.json()),
      fetch("/api/auth/trades", { credentials: "include" }).then(r => r.json()),
    ]).then(([o, t]) => {
      setOrders(Array.isArray(o) ? o : []);
      setTrades(Array.isArray(t) ? t : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const filteredOrders = filter
    ? orders.filter(o => o.symbol.includes(filter.toUpperCase()))
    : orders;

  const filteredTrades = filter
    ? trades.filter(t => t.symbol.includes(filter.toUpperCase()))
    : trades;

  const totalFilled = filteredOrders.reduce((s, o) => s + (o.filledQuantity ?? 0), 0);
  const totalOrders = filteredOrders.length;
  const totalTrades = filteredTrades.length;
  const totalNotional = filteredTrades.reduce((s, t) => s + t.price * t.quantity, 0);

  if (!user) {
    return (
      <div style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 380 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 8, lineHeight: 1.6 }}>
            Sign in to view your personal matching engine reports
          </div>
          <div style={{ fontSize: 10, color: "#333", marginBottom: 24, lineHeight: 1.5 }}>
            Every order and trade you submit is saved to your account. Log in to track your full history.
          </div>
          <Link href="/">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ padding: "12px 28px", background: "rgba(0,255,136,0.12)", border: "1px solid #00FF88", borderRadius: 6, color: "#00FF88", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "monospace" }}>
              SIGN IN WITH GOOGLE
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 3, height: 20, background: "linear-gradient(to bottom, #00FF88, #00BFFF)", borderRadius: 2 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>
            MATCHING ENGINE REPORTS
          </h1>
        </div>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.06em", marginLeft: 13 }}>
          Your personal trade activity — every order and execution is saved to your account
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Orders", value: totalOrders, color: C.blue, sub: "All submissions" },
          { label: "Total Trades", value: totalTrades, color: C.green, sub: "Executed fills" },
          { label: "Shares Filled", value: totalFilled.toLocaleString(), color: C.orange, sub: "Total volume" },
          { label: "Notional", value: `$${fmt(totalNotional)}`, color: C.purple, sub: "Aggregate value" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.04 }}
            style={{
              flex: 1, background: "linear-gradient(135deg, #151515 0%, #111 100%)",
              border: `1px solid ${card.color}20`, borderRadius: 10,
              padding: "16px 20px", position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${card.color}08 0%, transparent 70%)`, borderRadius: "50%", transform: "translate(20px, -20px)" }} />
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.08em", marginBottom: 2, position: "relative" }}>{card.label}</div>
            <div style={{ fontSize: 10, color: "#333", marginBottom: 8, position: "relative" }}>{card.sub}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.color, fontFamily: "monospace", position: "relative" }} className="num">
              {card.value}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filter bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", width: 260 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value.toUpperCase())}
            placeholder="Filter by symbol..."
            style={{
              width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6,
              color: "#fff", padding: "8px 12px 8px 30px", fontSize: 12, fontFamily: "monospace",
              outline: "none",
            }}
          />
          {filter && (
            <button onClick={() => setFilter("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>✕</button>
          )}
        </div>
        <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em" }}>
          {filter ? `${filteredOrders.length + filteredTrades.length} results` : `${totalOrders} orders · ${totalTrades} trades`}
        </div>
      </motion.div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} style={{ width: 14, height: 14, border: "2px solid #2a2a2a", borderTop: "2px solid #00FF88", borderRadius: "50%" }} />
          <span style={{ color: "#555", fontSize: 12 }}>Loading your reports...</span>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Orders table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, background: C.blue, borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em" }}>ORDERS</span>
              <span style={{ fontSize: 9, color: "#444", marginLeft: "auto" }}>{filteredOrders.length} total</span>
            </div>
            {filteredOrders.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#333", marginBottom: 4 }}>No orders yet</div>
                <Link href="/pipeline">
                  <span style={{ fontSize: 10, color: C.green, cursor: "pointer", textDecoration: "underline" }}>Submit one from the Matching Engine Pipeline →</span>
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                      {["Symbol", "Side", "Type", "Qty", "Price", "Status", "Filled", "Avg Fill", "Time"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 600, letterSpacing: "0.05em", fontSize: 9, borderBottom: "1px solid #181818" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o, i) => (
                      <motion.tr
                        key={o.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.015 }}
                        style={{ borderBottom: "1px solid #121212", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,255,136,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")}
                      >
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: C.blue }}>{o.symbol}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: o.side === "buy" ? C.green : C.red, fontWeight: 700, fontSize: 9, background: o.side === "buy" ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)", padding: "2px 8px", borderRadius: 3 }}>{o.side.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#777" }}>{o.type.toUpperCase()}</td>
                        <td style={{ padding: "8px 12px", color: "#aaa" }} className="num">{o.quantity}</td>
                        <td style={{ padding: "8px 12px", color: "#888" }} className="num">{o.price ? `$${o.price.toFixed(2)}` : "MKT"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: o.status === "filled" ? C.green : o.status === "partial" ? C.orange : "#666", fontSize: 9, fontWeight: 600 }}>{o.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#999" }} className="num">{o.filledQuantity ?? 0}</td>
                        <td style={{ padding: "8px 12px", color: "#999" }} className="num">{o.avgFillPrice ? `$${o.avgFillPrice.toFixed(2)}` : "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#555", fontSize: 10, whiteSpace: "nowrap" }}>{new Date(o.createdAt).toLocaleString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trades table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, background: C.green, borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em" }}>EXECUTED TRADES</span>
              <span style={{ fontSize: 9, color: "#444", marginLeft: "auto" }}>{filteredTrades.length} total · ${fmt(totalNotional)} notional</span>
            </div>
            {filteredTrades.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 10, color: "#333" }}>
                No trades executed yet
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                      {["Symbol", "Side", "Price", "Quantity", "Total", "Time"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 600, letterSpacing: "0.05em", fontSize: 9, borderBottom: "1px solid #181818" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t, i) => (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.015 }}
                        style={{ borderBottom: "1px solid #121212", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,255,136,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")}
                      >
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: C.blue }}>{t.symbol}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: t.side === "buy" ? C.green : C.red, fontWeight: 700, fontSize: 9, background: t.side === "buy" ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)", padding: "2px 8px", borderRadius: 3 }}>{t.side.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#aaa" }} className="num">${t.price.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", color: "#aaa" }} className="num">{t.quantity}</td>
                        <td style={{ padding: "8px 12px", color: "#fff", fontWeight: 600 }} className="num">${(t.price * t.quantity).toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", color: "#555", fontSize: 10, whiteSpace: "nowrap" }}>{new Date(t.timestamp).toLocaleString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
