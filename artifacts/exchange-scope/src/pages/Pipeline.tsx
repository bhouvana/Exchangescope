import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubmitOrder, useListOrders } from "@workspace/api-client-react";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };
const SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "TSLA"];

const STAGE_ICONS: Record<string, string> = {
  "Trader":               "👤",
  "Gateway":              "🔌",
  "Risk Check":           "🛡",
  "Validation":           "✓",
  "Order Queue":          "▦",
  "Matching Engine":      "⚙",
  "Trade Execution":      "⚡",
  "Market Data Broadcast":"📡",
  "Dashboard Update":     "◉",
};

interface PipelineStage {
  name: string;
  status: string;
  latencyUs: number;
  timestamp: string;
  detail: string | null;
}

interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: string;
}

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function StageNode({
  stage, index, activeIndex, isLast,
}: {
  stage: PipelineStage; index: number; activeIndex: number; isLast: boolean;
}) {
  const isDone   = index < activeIndex;
  const isActive = index === activeIndex;
  const isPending = index > activeIndex;

  const color = isDone ? C.green : isActive ? C.green : "#333";
  const bgColor = isDone ? "rgba(0,255,136,0.08)" : isActive ? "rgba(0,255,136,0.15)" : "#111";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.div
        initial={false}
        animate={{
          boxShadow: isActive ? "0 0 20px rgba(0,255,136,0.5), 0 0 40px rgba(0,255,136,0.2)" : "none",
          scale: isActive ? 1.06 : 1,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: bgColor,
          border: `1px solid ${color}`,
          borderRadius: 8,
          padding: "12px 16px",
          width: 140,
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Status indicator */}
        <div style={{
          position: "absolute",
          top: 8, right: 8,
          width: 6, height: 6,
          borderRadius: "50%",
          background: isDone ? C.green : isActive ? C.green : "#333",
          boxShadow: isActive ? `0 0 8px ${C.green}` : "none",
        }}
          className={isActive ? "pulse-dot" : ""}
        />

        <div style={{ fontSize: 20, marginBottom: 6 }}>{STAGE_ICONS[stage.name] ?? "●"}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: isDone || isActive ? "#fff" : "#444", letterSpacing: "0.05em", marginBottom: 4 }}>
          {stage.name.toUpperCase()}
        </div>
        {!isPending && (
          <div style={{ fontSize: 9, color: isDone ? C.green : isActive ? "#FFB800" : "#555", fontFamily: "monospace" }} className="num">
            {stage.latencyUs}µs
          </div>
        )}
        {stage.detail && (isDone || isActive) && (
          <div style={{ fontSize: 8, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
            {stage.detail.slice(0, 50)}
          </div>
        )}
      </motion.div>

      {/* Connector */}
      {!isLast && (
        <div style={{ position: "relative", width: 2, height: 28, background: "#1a1a1a", margin: "4px 0" }}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: index < activeIndex ? "100%" : "0%" }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%",
              background: `linear-gradient(to bottom, ${C.green}, #00cc6a)`,
              boxShadow: `0 0 6px ${C.green}`,
            }}
          />
          {/* Packet animation */}
          {index === activeIndex - 1 && (
            <motion.div
              initial={{ top: 0, opacity: 1 }}
              animate={{ top: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeIn" }}
              style={{
                position: "absolute",
                left: -3, width: 8, height: 8,
                borderRadius: "50%",
                background: C.green,
                boxShadow: `0 0 12px ${C.green}`,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [quantity, setQuantity] = useState("100");
  const [price, setPrice] = useState("210.00");
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [activeStage, setActiveStage] = useState(-1);
  const [resultTrades, setResultTrades] = useState<Trade[]>([]);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [animating, setAnimating] = useState(false);

  const { mutate: submitOrder, isPending } = useSubmitOrder();
  const { data: recentOrders } = useListOrders({ limit: 15 } as any, { query: { refetchInterval: 2000 } });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (animating) return;

    submitOrder(
      {
        data: {
          symbol,
          type,
          side,
          quantity: Number(quantity),
          price: type === "limit" ? Number(price) : undefined,
        } as any,
      },
      {
        onSuccess: (data: any) => {
          const stages: PipelineStage[] = data.pipeline ?? [];
          const trades: Trade[] = data.trades ?? [];
          setPipeline(stages);
          setResultTrades(trades);
          setOrderResult(data.order);
          setActiveStage(0);
          setAnimating(true);

          // Animate through each stage
          stages.forEach((_, i) => {
            setTimeout(() => {
              setActiveStage(i + 1);
              if (i === stages.length - 1) {
                setTimeout(() => setAnimating(false), 500);
              }
            }, (i + 1) * 280);
          });
        },
        onError: () => {
          alert("Order submission failed. Check API server.");
        },
      }
    );
  };

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      {/* Left: Form + Recent Orders */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>MATCHING ENGINE</h1>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 20 }}>PIPELINE VISUALIZER · C++ ENGINE</div>

        {/* Order Form */}
        <form onSubmit={handleSubmit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 12 }}>SUBMIT ORDER</div>

          {/* Symbol */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>SYMBOL</label>
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 8px", fontSize: 12, fontFamily: "monospace" }}
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Side toggle */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>SIDE</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {(["buy","sell"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  style={{
                    padding: "7px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    background: side === s ? (s === "buy" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)") : "#111",
                    border: `1px solid ${side === s ? (s === "buy" ? C.green : C.red) : "#2a2a2a"}`,
                    borderRadius: 4,
                    color: side === s ? (s === "buy" ? C.green : C.red) : "#666",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Type toggle */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>ORDER TYPE</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {(["limit","market"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    padding: "7px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    background: type === t ? "rgba(0,255,136,0.1)" : "#111",
                    border: `1px solid ${type === t ? "#00FF88" : "#2a2a2a"}`,
                    borderRadius: 4,
                    color: type === t ? "#00FF88" : "#666",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>QUANTITY</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 8px", fontSize: 12, fontFamily: "monospace" }}
            />
          </div>

          {/* Price (limit only) */}
          {type === "limit" && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>LIMIT PRICE ($)</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                step="0.01"
                min="0.01"
                style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 8px", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || animating}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.08em",
              background: isPending || animating ? "#1a1a1a" : side === "buy" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)",
              border: `1px solid ${isPending || animating ? "#333" : side === "buy" ? C.green : C.red}`,
              borderRadius: 4,
              color: isPending || animating ? "#555" : side === "buy" ? C.green : C.red,
              cursor: isPending || animating ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {isPending ? "PROCESSING..." : animating ? "ROUTING..." : `SUBMIT ${side.toUpperCase()} ORDER`}
          </button>
        </form>

        {/* Recent orders */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
            RECENT ORDERS
          </div>
          {recentOrders?.slice(0, 10).map((o: any) => {
            const isBuy = o.side === "buy";
            const statusColor = o.status === "filled" ? C.green : o.status === "partial" ? "#FFB800" : o.status === "rejected" ? C.red : "#555";
            return (
              <div key={o.id} style={{ padding: "6px 12px", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isBuy ? C.green : C.red, marginRight: 4 }}>{o.side?.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: "#fff" }}>{o.symbol}</span>
                  <span style={{ fontSize: 10, color: "#555", marginLeft: 4 }}>×{o.quantity}</span>
                </div>
                <div style={{ fontSize: 9, color: statusColor, letterSpacing: "0.05em" }}>{o.status?.toUpperCase()}</div>
              </div>
            );
          })}
          {!recentOrders?.length && (
            <div style={{ padding: 16, color: "#555", fontSize: 11, textAlign: "center" }}>No orders yet</div>
          )}
        </div>
      </div>

      {/* Right: Pipeline visualization */}
      <div>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 16, paddingTop: 4 }}>
          EXECUTION PIPELINE · {pipeline.length > 0 ? "ACTIVE" : "AWAITING ORDER"}
        </div>

        {pipeline.length === 0 ? (
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: 60,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>⚙</div>
            <div style={{ fontSize: 13, color: "#555" }}>Submit an order to watch it route through the matching engine.</div>
            <div style={{ fontSize: 11, color: "#333", marginTop: 8 }}>
              Each stage lights up as the order packet travels from trader to execution.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {pipeline.map((stage, i) => (
              <StageNode
                key={`${stage.name}-${i}`}
                stage={stage}
                index={i}
                activeIndex={activeStage}
                isLast={i === pipeline.length - 1}
              />
            ))}

            {/* Total latency summary */}
            {activeStage >= pipeline.length && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 16,
                  background: "rgba(0,255,136,0.08)",
                  border: "1px solid #00FF88",
                  borderRadius: 6,
                  padding: "12px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, color: "#00FF88", letterSpacing: "0.15em", marginBottom: 4 }}>TOTAL PIPELINE LATENCY</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#00FF88" }} className="num">
                  {pipeline.reduce((s, st) => s + (st.latencyUs ?? 0), 0).toLocaleString()} µs
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                  = {((pipeline.reduce((s, st) => s + (st.latencyUs ?? 0), 0)) / 1000).toFixed(2)} ms round-trip
                </div>
              </motion.div>
            )}

            {/* Trade results */}
            {resultTrades.length > 0 && activeStage >= pipeline.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginTop: 12,
                  width: "100%",
                  maxWidth: 400,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.green, letterSpacing: "0.1em" }}>
                  EXECUTIONS · {resultTrades.length} FILL{resultTrades.length > 1 ? "S" : ""}
                </div>
                {resultTrades.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #111",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 10, color: C.green, fontWeight: 700, marginRight: 6 }}>FILLED</span>
                      <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }} className="num">{fmt(t.quantity, 0)} @ ${fmt(t.price)}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#555" }}>{t.symbol}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {orderResult && activeStage >= pipeline.length && resultTrades.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  background: "rgba(255,184,0,0.08)",
                  border: "1px solid #FFB800",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#FFB800",
                  textAlign: "center",
                }}
              >
                Order {orderResult.status?.toUpperCase()} — resting in queue awaiting counterparty
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
