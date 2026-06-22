import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMarketStats,
  useControlMarket,
  useExplainEvent,
} from "@workspace/api-client-react";
import { useRegion } from "@/context/RegionContext";
import { useSimulatedTraders } from "@/context/SimulatedTradersContext";
const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

function fmt(n: number | null | undefined, dec = 1) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function Gauge({ label, value, max, color = C.green, unit = "" }: {
  label: string; value: number; max: number; color?: string; unit?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }} className="num">{value.toLocaleString()}{unit}</span>
      </div>
      <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: color, borderRadius: 2 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

const SCENARIOS = [
  { action: "start",       label: "START",       desc: "Resume normal trading",           color: C.green },
  { action: "pause",       label: "PAUSE",       desc: "Halt all order processing",       color: "#FFB800" },
  { action: "reset",       label: "RESET",       desc: "Clear books and reset stats",     color: "#888" },
  { action: "flash_crash", label: "FLASH CRASH", desc: "Trigger cascading panic sell",    color: C.red },
  { action: "bull",        label: "BULL MARKET", desc: "Inject upward price pressure",    color: C.green },
  { action: "bear",        label: "BEAR MARKET", desc: "Inject downward price pressure",  color: C.red },
  { action: "volatile",    label: "VOLATILE",    desc: "High-frequency price swings",     color: "#FFB800" },
];

const TRADER_COLORS: Record<string, string> = {
  retail:       "#6B7280",
  market_maker: "#00FF88",
  momentum:     "#FFB800",
  panic:        "#FF4444",
};

export default function Control() {
  const { regionMeta } = useRegion();
  const { data: stats } = useGetMarketStats({ query: { refetchInterval: 800 } } as any);
  const { allTraders: traders } = useSimulatedTraders();
  const { mutate: controlMarket, isPending: controlPending } = useControlMarket();
  const { mutate: explain, isPending: explainPending } = useExplainEvent();

  const [lastAction, setLastAction] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{ explanation: string; reasoning: string } | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());

  const handleScenario = (action: string) => {
    controlMarket({ data: { action } as any }, {
      onSuccess: () => setLastAction(action),
    });
  };

  const handleExplain = (mode?: string) => {
    if (!question.trim()) return;
    explain(
      {
        data: {
          question,
          context: {
            marketState: stats?.marketState,
            ordersPerSecond: stats?.ordersPerSecond,
            tradesPerSecond: stats?.tradesPerSecond,
            queueDepth: stats?.queueDepth,
            latency: stats?.latency,
            mode: mode ?? "concise",
          },
        } as any,
      },
      {
        onSuccess: (data: any) => setAiAnswer(data),
      }
    );
  };

  const handleQuickQuestion = (q: string) => {
    setQuestion(q);
    const isExpanded = askedQuestions.has(q);
    const mode = isExpanded ? "expanded" : "concise";
    explain(
      {
        data: {
          question: q,
          context: {
            marketState: stats?.marketState,
            ordersPerSecond: stats?.ordersPerSecond,
            tradesPerSecond: stats?.tradesPerSecond,
            queueDepth: stats?.queueDepth,
            latency: stats?.latency,
            mode,
          },
        } as any,
      },
      {
        onSuccess: (data: any) => {
          setAiAnswer(data);
          if (!isExpanded) {
            setAskedQuestions(prev => new Set([...prev, q]));
          }
        },
      }
    );
  };

  const stateColor: Record<string, string> = {
    running: C.green, paused: "#FFB800", flash_crash: C.red, bull: C.green, bear: C.red, volatile: "#FFB800",
  };
  const currentStateColor = stateColor[stats?.marketState ?? "running"] ?? C.green;

  const totalOrdersPlaced = traders.reduce((s: number, t: any) => s + t.ordersPlaced, 0);
  const totalFills = traders.reduce((s: number, t: any) => s + t.fills, 0);
  const totalPnl = traders.reduce((s: number, t: any) => s + t.pnl, 0);
  const activeTraders = traders.filter((t: any) => t.isActive).length;
  const avgWinRate = traders.length ? traders.reduce((s: number, t: any) => s + t.winRate, 0) / traders.length : 0;
  const longTraders = traders.filter((t: any) => t.position > 0).length;
  const shortTraders = traders.filter((t: any) => t.position < 0).length;
  const prevRef = useRef({ orders: totalOrdersPlaced, fills: totalFills });
  const orderRate = Math.max(0, totalOrdersPlaced - prevRef.current.orders);
  const fillRate = Math.max(0, totalFills - prevRef.current.fills);
  prevRef.current = { orders: totalOrdersPlaced, fills: totalFills };

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>CONTROL CENTER</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>{regionMeta.exchange} · MARKET SCENARIOS · AI TRADERS · LIVE STATS</div>
        </div>
        {/* Market state badge */}
        <div style={{
          padding: "6px 14px",
          background: `${currentStateColor}15`,
          border: `1px solid ${currentStateColor}`,
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          color: currentStateColor,
          letterSpacing: "0.12em",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: currentStateColor }} />
          {(stats?.marketState ?? "running").toUpperCase().replace("_", " ")}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Scenarios */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 14 }}>MARKET SCENARIOS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {SCENARIOS.map(({ action, label, desc, color }) => (
              <motion.button
                key={action}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleScenario(action)}
                disabled={controlPending}
                style={{
                  padding: "10px 12px",
                  background: lastAction === action ? `${color}15` : "#111",
                  border: `1px solid ${lastAction === action ? color : "#2a2a2a"}`,
                  borderRadius: 5,
                  color: lastAction === action ? color : "#888",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  opacity: controlPending ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 9, color: "#555", lineHeight: 1.4 }}>{desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Live stats */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 14 }}>LIVE STATISTICS</div>
          <>
            <Gauge label="ORDERS / TICK" value={orderRate} max={50} color={C.green} />
            <Gauge label="FILLS / TICK"  value={fillRate}  max={40} color={C.green} />
            <Gauge label="ACTIVE TRADERS" value={activeTraders} max={traders.length} color="#FFB800" />
            <Gauge label="AVG WIN RATE"  value={Math.round(avgWinRate * 100)} max={100} color="#00BFFF" unit="%" />

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
              marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a1a1a"
            }}>
              <div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>TOTAL ORDERS</div>
                <motion.div key={totalOrdersPlaced} animate={{ scale: [1.05, 1] }} style={{ fontSize: 16, fontWeight: 700, color: "#fff" }} className="num">
                  {totalOrdersPlaced.toLocaleString()}
                </motion.div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>TOTAL FILLS</div>
                <motion.div key={totalFills} animate={{ scale: [1.05, 1] }} style={{ fontSize: 16, fontWeight: 700, color: C.green }} className="num">
                  {totalFills.toLocaleString()}
                </motion.div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>LONG / SHORT</div>
                <motion.div key={`${longTraders}-${shortTraders}`} animate={{ scale: [1.05, 1] }} style={{ fontSize: 16, fontWeight: 700, color: "#fff" }} className="num">
                  {longTraders} <span style={{ color: C.green, fontSize: 11 }}>▲</span> / {shortTraders} <span style={{ color: C.red, fontSize: 11 }}>▼</span>
                </motion.div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>TOTAL P&L</div>
                <motion.div key={totalPnl} animate={{ scale: [1.05, 1] }} style={{ fontSize: 16, fontWeight: 700, color: totalPnl >= 0 ? C.green : C.red }} className="num">
                  {totalPnl >= 0 ? "+" : ""}${(Math.abs(totalPnl) / 1000).toFixed(1)}K
                </motion.div>
              </div>
            </div>
          </>
        </div>
      </div>

      {/* AI Traders */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 14 }}>AI TRADERS · {traders.length ?? 0} ACTIVE</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["TRADER ID","TYPE","SYMBOL","ORDERS","FILLS","P&L","STATUS","LAST ACTION"].map(h => (
                  <th key={h} style={{ padding: "4px 10px", textAlign: "left", fontSize: 9, color: "#444", letterSpacing: "0.1em", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {traders.map((t: any, i: number) => {
                  const typeColor = TRADER_COLORS[t.type] ?? "#888";
                  const pnlColor = t.pnl >= 0 ? C.green : C.red;
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ borderBottom: "1px solid #111" }}
                    >
                      <td style={{ padding: "8px 10px", color: "#777", fontFamily: "monospace", fontSize: 10 }}>{t.id}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ padding: "2px 7px", background: `${typeColor}15`, border: `1px solid ${typeColor}40`, borderRadius: 3, color: typeColor, fontSize: 9, letterSpacing: "0.08em" }}>
                          {t.type?.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 700 }}>{t.symbol}</td>
                      <td style={{ padding: "8px 10px", color: "#ccc" }} className="num">{t.ordersPlaced.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", color: "#ccc" }} className="num">{t.fills.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", color: pnlColor, fontWeight: 600 }} className="num">
                        {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div className={t.isActive ? "pulse-dot" : ""} style={{ width: 5, height: 5, borderRadius: "50%", background: t.isActive ? C.green : "#333" }} />
                          <span style={{ fontSize: 9, color: t.isActive ? C.green : "#555" }}>{t.isActive ? "ACTIVE" : "IDLE"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#555", fontSize: 10, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.lastAction ?? "—"}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {!traders.length && (
            <div style={{ padding: 20, color: "#555", fontSize: 11, textAlign: "center" }}>AI traders initializing...</div>
          )}
        </div>
      </div>

      {/* AI Explain */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 12 }}>AI MARKET EXPLAINER · POWERED BY GROQ</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleExplain()}
            placeholder="Ask about market microstructure, order matching, latency..."
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              color: "#fff",
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button
            onClick={() => handleExplain()}
            disabled={explainPending || !question.trim()}
            style={{
              padding: "8px 16px",
              background: "rgba(0,255,136,0.1)",
              border: `1px solid ${explainPending ? "#333" : "#00FF88"}`,
              borderRadius: 4,
              color: explainPending ? "#555" : "#00FF88",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "0.08em",
            }}
          >
            {explainPending ? "THINKING..." : "EXPLAIN"}
          </button>
        </div>

        <AnimatePresence>
          {aiAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "#0f1a14",
                border: "1px solid rgba(0,255,136,0.2)",
                borderRadius: 4,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 9, color: "#00FF88", letterSpacing: "0.1em", marginBottom: 8 }}>LLAMA 3.3 · GROQ</div>
              <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.7 }}>{aiAnswer.explanation}</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 8 }}>{aiAnswer.reasoning}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick question suggestions */}
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            "Why do market makers keep the spread tight?",
            "How does price-time priority prevent gaming?",
            "What causes a flash crash?",
            "Why is queue depth important for latency?",
          ].map(q => {
            const asked = askedQuestions.has(q);
            return (
              <button
                key={q}
                onClick={() => handleQuickQuestion(q)}
                style={{
                  padding: "3px 8px",
                  background: asked ? "rgba(0,255,136,0.08)" : "#111",
                  border: `1px solid ${asked ? "#00FF88" : "#2a2a2a"}`,
                  borderRadius: 3,
                  color: asked ? "#00FF88" : "#555",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >{q}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
