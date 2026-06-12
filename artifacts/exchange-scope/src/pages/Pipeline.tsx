import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubmitOrder, useListOrders, useListStocks } from "@workspace/api-client-react";
import { ExplainTip, InfoBox } from "@/components/Explain";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

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

const STAGE_META: Array<{ icon: string; color: string; explainKey: string; explain: string }> = [
  { icon: "👤", color: "#6B7280", explainKey: "Trader", explain: "You — the person submitting the order. Your request is serialized into a message and sent over a TCP connection to the exchange gateway." },
  { icon: "🔌", color: "#00FF88", explainKey: "Gateway", explain: "The exchange's front door. Authenticates your session, checks your credentials, and forwards the order to the internal system. Adds a timestamp to the microsecond." },
  { icon: "🛡", color: "#FFB800", explainKey: "Risk Check", explain: "Pre-trade risk controls verify you have enough funds (buying power) and aren't violating position limits. If you fail here, the order is rejected before it ever touches the book." },
  { icon: "✓",  color: "#00BFFF", explainKey: "Validation", explain: "Is the symbol valid? Is the quantity a positive integer? Is the limit price within circuit breaker bounds? If any check fails, the order is rejected with a specific error code." },
  { icon: "▦",  color: "#A855F7", explainKey: "Order Queue", explain: "The order joins a lock-free FIFO queue. A sequence number is assigned — this is the 'time' in price-time priority. Orders with the same price are matched in sequence number order." },
  { icon: "⚙",  color: "#00FF88", explainKey: "Matching Engine", explain: "The C++ matching engine scans all resting limit orders at the best available price. If your buy price >= best ask (or sell price <= best bid), a match is made instantly." },
  { icon: "⚡", color: "#FFB800", explainKey: "Trade Execution", explain: "A trade is generated: both sides get execution reports. The order book is updated atomically — no other orders can match during this microsecond. The fill is permanent." },
  { icon: "📡", color: "#FF4444", explainKey: "Market Broadcast", explain: "The new trade price is published to all market data subscribers in real time via the ITCH 5.0 protocol. Everyone's price feed updates simultaneously." },
];

function StageNode({
  stage, meta, index, activeIndex, isFirst, isLast, totalStages,
}: {
  stage: PipelineStage; meta: typeof STAGE_META[0]; index: number; activeIndex: number; isFirst: boolean; isLast: boolean; totalStages: number;
}) {
  const isDone = index < activeIndex;
  const isActive = index === activeIndex;
  const color = isDone || isActive ? meta.color : "#2a2a2a";
  const textColor = isDone || isActive ? "#fff" : "#444";

  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
      {/* Stage card */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <motion.div
          animate={{
            boxShadow: isActive ? `0 0 18px ${meta.color}60, 0 0 36px ${meta.color}20` : "none",
            scale: isActive ? 1.04 : 1,
          }}
          transition={{ duration: 0.25 }}
          style={{
            background: isDone ? `${meta.color}10` : isActive ? `${meta.color}18` : "#0f0f0f",
            border: `1px solid ${color}`,
            borderRadius: 8,
            padding: "12px 10px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Scan line when active */}
          {isActive && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(90deg, transparent, ${meta.color}15, transparent)`,
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ fontSize: 18, marginBottom: 5 }}>{meta.icon}</div>

          <div style={{ fontSize: 9, fontWeight: 700, color: isDone || isActive ? meta.color : "#444", letterSpacing: "0.06em", marginBottom: 3, lineHeight: 1.2 }}>
            {stage.name.toUpperCase()}
          </div>

          {!isActive && !isDone ? null : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: 9, color: isDone ? meta.color : "#FFB800", fontFamily: "monospace", fontWeight: 700 }}
              className="num"
            >
              {stage.latencyUs > 0 ? `${stage.latencyUs}µs` : "—"}
            </motion.div>
          )}

          {/* Done checkmark */}
          {isDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{ position: "absolute", top: 5, right: 5, width: 12, height: 12, borderRadius: "50%", background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#000", fontWeight: 700 }}
            >
              ✓
            </motion.div>
          )}
        </motion.div>

        {/* Explanation tooltip */}
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <ExplainTip term={stage.name} explanation={meta.explain} />
        </div>
      </div>

      {/* Connector arrow */}
      {!isLast && (
        <div style={{ position: "relative", width: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", height: 50 }}>
          <div style={{ width: "100%", height: 1, background: "#1a1a1a", position: "absolute" }} />
          <motion.div
            initial={false}
            animate={{ width: isDone ? "100%" : "0%" }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute", left: 0, height: 1,
              background: `linear-gradient(to right, ${meta.color}, ${STAGE_META[index + 1]?.color ?? meta.color})`,
              boxShadow: `0 0 4px ${meta.color}`,
            }}
          />
          {/* Animated packet */}
          {isActive && (
            <motion.div
              initial={{ left: 0, opacity: 1 }}
              animate={{ left: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeIn" }}
              style={{
                position: "absolute",
                width: 8, height: 8,
                borderRadius: "50%",
                background: meta.color,
                boxShadow: `0 0 12px ${meta.color}`,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
          {/* Arrow head */}
          <div style={{
            position: "absolute", right: 0,
            width: 0, height: 0,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderLeft: `6px solid ${isDone ? STAGE_META[index + 1]?.color ?? meta.color : "#1a1a1a"}`,
          }} />
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const { data: stockList } = useListStocks({ query: { staleTime: 30000 } });
  const symbols = stockList?.map(s => s.symbol).slice(0, 50) ?? ["AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "TSLA"];

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
  const [symSearch, setSymSearch] = useState("");

  const { mutate: submitOrder, isPending } = useSubmitOrder();
  const { data: recentOrders } = useListOrders({ limit: 20 } as any, { query: { refetchInterval: 2000 } });

  const totalLatency = pipeline.reduce((s, st) => s + (st.latencyUs ?? 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (animating) return;
    setPipeline([]);
    setActiveStage(-1);
    setResultTrades([]);
    setOrderResult(null);

    submitOrder(
      { data: { symbol, type, side, quantity: Number(quantity), price: type === "limit" ? Number(price) : undefined } as any },
      {
        onSuccess: (data: any) => {
          const stages: PipelineStage[] = data.pipeline ?? [];
          setPipeline(stages);
          setResultTrades(data.trades ?? []);
          setOrderResult(data.order);
          setActiveStage(0);
          setAnimating(true);
          stages.forEach((_, i) => {
            setTimeout(() => {
              setActiveStage(i + 1);
              if (i === stages.length - 1) setTimeout(() => setAnimating(false), 400);
            }, (i + 1) * 300);
          });
        },
        onError: () => alert("Order submission failed — check API server."),
      }
    );
  };

  const filteredSymbols = symSearch
    ? symbols.filter(s => s.includes(symSearch.toUpperCase())).slice(0, 20)
    : symbols.slice(0, 30);

  return (
    <div style={{ padding: "20px 28px", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 0 }}>MATCHING ENGINE PIPELINE</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
            C++ ENGINE · PRICE-TIME PRIORITY ·&nbsp;
            <ExplainTip term="ITCH 5.0 PROTOCOL" explanation="ITCH 5.0 is NASDAQ's market data protocol. It broadcasts order additions, cancellations, executions, and price changes to thousands of subscribers simultaneously, in binary format for maximum speed." />
          </div>
        </div>
        {totalLatency > 0 && activeStage >= pipeline.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: "4px 14px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid #00FF88",
              borderRadius: 4,
              fontSize: 11, color: "#00FF88", fontWeight: 700,
            }}
          >
            {totalLatency.toLocaleString()}µs total · {(totalLatency / 1000).toFixed(2)}ms
          </motion.div>
        )}
      </div>

      {/* Order form — compact horizontal */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "14px 20px",
          display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap",
        }}>
          {/* Symbol with search */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>SYMBOL</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={symSearch || symbol}
                onChange={e => { setSymSearch(e.target.value.toUpperCase()); if (SYMBOL_DATA_KEYS.includes(e.target.value.toUpperCase())) { setSymbol(e.target.value.toUpperCase()); setSymSearch(""); } }}
                placeholder="Search symbol..."
                style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#00FF88", padding: "7px 10px", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}
              />
              {symSearch && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, maxHeight: 140, overflowY: "auto", zIndex: 100 }}>
                  {filteredSymbols.map(s => (
                    <div key={s} onClick={() => { setSymbol(s); setSymSearch(""); }} style={{ padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#aaa" }}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>SIDE</label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["buy", "sell"] as const).map(s => (
                <button key={s} type="button" onClick={() => setSide(s)} style={{
                  padding: "7px 16px", fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                  background: side === s ? (s === "buy" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)") : "#111",
                  border: `1px solid ${side === s ? (s === "buy" ? C.green : C.red) : "#2a2a2a"}`,
                  borderRadius: 4, color: side === s ? (s === "buy" ? C.green : C.red) : "#666",
                  cursor: "pointer", letterSpacing: "0.05em",
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
              <ExplainTip term="ORDER TYPE" explanation="LIMIT order: execute only at your specified price or better. MARKET order: execute immediately at whatever price is available. Limit orders rest in the book; market orders consume liquidity instantly." />
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["limit", "market"] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} style={{
                  padding: "7px 14px", fontSize: 11, fontFamily: "monospace",
                  background: type === t ? "rgba(0,255,136,0.1)" : "#111",
                  border: `1px solid ${type === t ? "#00FF88" : "#2a2a2a"}`,
                  borderRadius: 4, color: type === t ? "#00FF88" : "#666",
                  cursor: "pointer", letterSpacing: "0.05em",
                }}>{t.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 100 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>QTY (SHARES)</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1"
              style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "7px 10px", fontSize: 12, fontFamily: "monospace" }} />
          </div>

          {/* Price */}
          {type === "limit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 110 }}>
              <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
                <ExplainTip term="LIMIT PRICE ($)" explanation="Your price ceiling (buy) or floor (sell). A buy limit of $210 means: fill me at $210 or cheaper. The order rests in the book at this price until matched or cancelled." />
              </label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.01" min="0.01"
                style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "7px 10px", fontSize: 12, fontFamily: "monospace" }} />
            </div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isPending || animating}
            whileHover={{ scale: isPending || animating ? 1 : 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "8px 24px", fontSize: 12, fontFamily: "monospace", fontWeight: 700,
              letterSpacing: "0.08em",
              background: isPending || animating ? "#111" : side === "buy" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)",
              border: `1px solid ${isPending || animating ? "#333" : side === "buy" ? C.green : C.red}`,
              borderRadius: 4,
              color: isPending || animating ? "#555" : side === "buy" ? C.green : C.red,
              cursor: isPending || animating ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {isPending ? "ROUTING..." : animating ? "ANIMATING..." : `SUBMIT ${side.toUpperCase()}`}
          </motion.button>
        </div>
      </form>

      {/* HORIZONTAL PIPELINE */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 20px 14px" }}>
        <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 16 }}>
          EXECUTION PIPELINE · {pipeline.length > 0 ? `STAGE ${Math.min(activeStage + 1, pipeline.length)} / ${pipeline.length}` : "AWAITING ORDER"}
        </div>

        {pipeline.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 0, paddingBottom: 16 }}>
            {STAGE_META.map((meta, i) => (
              <div key={meta.explainKey} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 8,
                    padding: "12px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 5, opacity: 0.3 }}>{meta.icon}</div>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.06em", lineHeight: 1.2 }}>
                      {STAGE_NAMES[i].toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <ExplainTip term={STAGE_NAMES[i]} explanation={meta.explain} />
                  </div>
                </div>
                {i < STAGE_META.length - 1 && (
                  <div style={{ width: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", height: 50 }}>
                    <div style={{ width: "100%", height: 1, background: "#1a1a1a" }} />
                    <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "6px solid #1a1a1a", flexShrink: 0 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {pipeline.map((stage, i) => (
              <StageNode
                key={`${stage.name}-${i}`}
                stage={stage}
                meta={STAGE_META[i] ?? STAGE_META[0]}
                index={i}
                activeIndex={activeStage}
                isFirst={i === 0}
                isLast={i === pipeline.length - 1}
                totalStages={pipeline.length}
              />
            ))}
          </div>
        )}

        {/* Active stage detail */}
        <AnimatePresence>
          {pipeline.length > 0 && activeStage > 0 && activeStage <= pipeline.length && (() => {
            const idx = Math.min(activeStage - 1, pipeline.length - 1);
            const stage = pipeline[idx];
            const meta = STAGE_META[idx];
            return (
              <motion.div
                key={activeStage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  marginTop: 12, padding: "8px 14px",
                  background: `${meta?.color ?? "#00FF88"}0A`,
                  border: `1px solid ${meta?.color ?? "#00FF88"}25`,
                  borderRadius: 4, display: "flex", gap: 20, alignItems: "center",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: meta?.color ?? "#00FF88", letterSpacing: "0.08em" }}>{stage?.name?.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: "#999", flex: 1 }}>{stage?.detail ?? "Processing..."}</span>
                <span style={{ fontSize: 10, color: "#FFB800", fontFamily: "monospace" }} className="num">{stage?.latencyUs}µs</span>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Results + Recent orders grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Results */}
        <div>
          <AnimatePresence>
            {resultTrades.length > 0 && activeStage >= pipeline.length && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: C.card, border: "1px solid #00FF8830", borderRadius: 8, overflow: "hidden" }}
              >
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a1a", fontSize: 9, color: "#00FF88", letterSpacing: "0.1em" }}>
                  EXECUTIONS · {resultTrades.length} FILL{resultTrades.length > 1 ? "S" : ""}
                  &nbsp;·&nbsp;
                  <ExplainTip term="WHAT IS A FILL?" explanation="A fill happens when your order matches with a counterparty's order. 'Partial fill' means only some of your shares were matched. 'Filled' means the full quantity was executed." />
                </div>
                {resultTrades.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ padding: "10px 14px", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: "0.05em" }}>FILLED</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }} className="num">{fmt(t.quantity, 0)}</span>
                      <span style={{ fontSize: 11, color: "#777" }}>shares of {t.symbol}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.green }} className="num">${fmt(t.price)}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>per share</div>
                    </div>
                  </motion.div>
                ))}
                <div style={{ padding: "8px 14px", fontSize: 10, color: "#555" }}>
                  Total value: <span style={{ color: "#fff", fontWeight: 700 }} className="num">
                    ${fmt(resultTrades.reduce((s, t) => s + t.price * t.quantity, 0))}
                  </span>
                </div>
              </motion.div>
            )}
            {orderResult && activeStage >= pipeline.length && resultTrades.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: C.card, border: "1px solid #FFB80030", borderRadius: 8, padding: "16px 14px" }}
              >
                <div style={{ fontSize: 10, color: "#FFB800", fontWeight: 700, marginBottom: 6 }}>
                  ORDER QUEUED — RESTING IN BOOK
                </div>
                <div style={{ fontSize: 11, color: "#777", lineHeight: 1.6 }}>
                  No counterparty matched at your price. Your order rests in the order book
                  waiting for someone to sell at your limit price or below.
                  <br />
                  <ExplainTip term="Why didn't it fill?" explanation="Your limit price may be below the current best ask. The order stays in the book until a seller accepts your price, or you cancel it. This is called 'providing liquidity.'" />
                </div>
              </motion.div>
            )}
            {pipeline.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "24px 14px" }}
              >
                <InfoBox title="HOW THE PIPELINE WORKS" color="#00FF88">
                  Submit an order above and watch it travel through all 8 stages in real time. Each stage lights
                  up with the actual microsecond latency from the C++ matching engine. Hover the <strong>?</strong> icons
                  to understand what each stage does.
                </InfoBox>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent orders */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
            RECENT ORDERS · ALL TRADERS
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {recentOrders?.slice(0, 20).map((o: any, i: number) => {
              const isBuy = o.side === "buy";
              const statusColor = o.status === "filled" ? C.green : o.status === "partial" ? "#FFB800" : o.status === "rejected" ? C.red : "#555";
              return (
                <div key={o.id} style={{ padding: "6px 14px", borderBottom: "1px solid #0f0f0f", display: "grid", gridTemplateColumns: "40px 60px 70px 1fr 60px", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <span style={{ color: isBuy ? C.green : C.red, fontWeight: 700, fontSize: 10 }}>{o.side?.toUpperCase()}</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{o.symbol}</span>
                  <span style={{ color: "#888" }} className="num">×{o.quantity}</span>
                  <span style={{ color: "#555", fontSize: 9 }}>
                    {o.traderId ? `AI:${o.traderId}` : "USER"}
                  </span>
                  <span style={{ color: statusColor, fontSize: 9, letterSpacing: "0.05em" }}>{o.status?.toUpperCase()}</span>
                </div>
              );
            })}
            {!recentOrders?.length && (
              <div style={{ padding: 20, color: "#555", fontSize: 11, textAlign: "center" }}>No orders yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SYMBOL_DATA_KEYS = ["AAPL","MSFT","NVDA","GOOG","GOOGL","META","AMZN","TSLA","AVGO","ORCL","CRM","ADBE","AMD","QCOM","TXN","INTC","NOW","INTU","PANW","CRWD","AMAT","LRCX","KLAC","MU","ASML","SNOW","NET","DDOG","TEAM","WDAY","FTNT","ZS","CDNS","SNPS","MRVL","ADI","MCHP","NXPI","SWKS","STX","WDC","HPQ","HPE","DELL","IBM","CSCO","AKAM","VEEV","ANSS","TYL","EPAM","CTSH","ACN","GLOB","GFS","CIEN","JNPR","ANET","FICO","SMCI","ARM","ONTO","MPWR","GEN","GDDY","PLTR","BRK_B","JPM","BAC","WFC","GS","MS","C","BLK","SCHW","AXP","V","MA","PYPL","DFS","COF","SYF","ALLY","SPGI","MCO","ICE","CME","NDAQ","BX","KKR","APO","BAM","BN","FNF","FAF","CBOE","RJF","LPLA","COIN","HIG","TRV","ALL","CB","PGR","MET","PRU","AFL","AIG","LNC","CINF","WRB","ERIE","AON","MMC","WTW","NTRS","UNH","LLY","JNJ","MRK","ABBV","PFE","TMO","ABT","DHR","AMGN","GILD","REGN","VRTX","BIIB","MRNA","ISRG","BSX","MDT","SYK","EW","BDX","ZBH","DXCM","IDXX","IQV","CRL","HOLX","ALGN","CVS","CI","HUM","MOH","CNC","ELV","WBA","RVMD","NTRA","BAX","COO","VTRS","ZTS","MTD","WST","HSIC","HD","MCD","NKE","SBUX","TJX","LOW","TGT","BKNG","CMG","ROST","DG","DLTR","EBAY","ETSY","ABNB","MAR","HLT","GM","F","RIVN","LCID","LVS","MGM","WYNN","RCL","CCL","NCLH","YUM","DRI","ULTA","LULU","TPR","RL","VFC","CPRI","HAS","MAT","POOL","WMT","COST","PG","KO","PEP","PM","MO","MDLZ","CL","KMB","CHD","CLX","HRL","K","CPB","GIS","CAG","MKC","TSN","KHC","SJM","MNST","STZ","TAP","SAM","XOM","CVX","COP","EOG","SLB","OXY","MPC","VLO","PSX","HAL","DVN","FANG","PR","MRO","APA","EQT","AR","CNX","MTDR","CTRA","SM","HES","BKR","CHRD","VTLE","GE","HON","CAT","DE","UPS","FDX","LMT","RTX","BA","NOC","GD","AXON","LHX","TDG","GWW","ROK","EMR","ETN","PH","ITW","SWK","MMM","ROP","OTIS","CARR","XYL","IEX","FTV","CTAS","FAST","HUBB","GNRC","VLTO","LDOS","BAH","LIN","APD","SHW","ECL","DD","NEM","FCX","NUE","STLD","CLF","X","AA","VMC","MLM","PKG","IP","WRK","SEE","IFF","CE","NEE","DUK","SO","AEP","XEL","EXC","PPL","ED","FE","WEC","CMS","ETR","LNT","ATO","NI","PNW","AES","NRG","VST","CEG","PLD","AMT","CCI","EQIX","SPG","PSA","O","AVB","EQR","DLR","WELL","VTR","MAA","UDR","CPT","EXR","CUBE","NNN","WPC","NFLX","DIS","CMCSA","VZ","T","TMUS","CHTR","PARA","WBD","FOX","OMC","IPG","EA","TTWO","RBLX","SNAP","PINS","SPOT","MTCH","ZM"];

const STAGE_NAMES = ["Trader","Gateway","Risk Check","Validation","Order Queue","Matching Engine","Trade Execution","Market Data Broadcast"];
