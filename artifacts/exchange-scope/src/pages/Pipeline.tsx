import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubmitOrder, useListOrders, useListStocks, useGetMarketStats } from "@workspace/api-client-react";
import { useRegion } from "@/context/RegionContext";
import { ExplainTip, InfoBox } from "@/components/Explain";
import {
  STAGE_META, PIPELINE_LAYERS, generateTraceMessage,
  type OrderContext, type PipelineLayer,
} from "@/lib/pipelineStages";

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

/* ─── Architecture layer bar ─── */
function ArchitectureBar({ activeLayer }: { activeLayer: PipelineLayer | null }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
      {PIPELINE_LAYERS.map(layer => {
        const isActive = activeLayer === layer.id;
        const stagesInLayer = STAGE_META.filter(s => s.layer === layer.id);
        return (
          <div key={layer.id} style={{ flex: stagesInLayer.length, minWidth: 0 }}>
            <motion.div
              animate={{
                background: isActive ? `${layer.color}18` : "#0a0a0a",
                borderColor: isActive ? layer.color : "#1a1a1a",
              }}
              style={{
                padding: "5px 8px", borderRadius: 4, textAlign: "center",
                border: "1px solid #1a1a1a",
              }}
            >
              <div style={{ fontSize: 8, fontWeight: 800, color: isActive ? layer.color : "#333", letterSpacing: "0.1em" }}>
                {layer.label.toUpperCase()}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Latency waterfall ─── */
function LatencyWaterfall({ stages, activeIndex }: { stages: PipelineStage[]; activeIndex: number }) {
  const total = stages.reduce((s, st) => s + (st.latencyUs ?? 0), 0);
  if (total === 0) return null;

  let cumulative = 0;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#444", marginBottom: 6, letterSpacing: "0.08em" }}>
        <span>LATENCY WATERFALL</span>
        <span className="num">{total.toLocaleString()}µs total · {(total / 1000).toFixed(3)}ms</span>
      </div>
      <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden", background: "#0a0a0a" }}>
        {stages.map((stage, i) => {
          const pct = (stage.latencyUs / total) * 100;
          cumulative += stage.latencyUs;
          const meta = STAGE_META[i];
          const revealed = i < activeIndex;
          return (
            <motion.div
              key={stage.name}
              initial={{ width: 0 }}
              animate={{ width: revealed ? `${pct}%` : "0%" }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              title={`${stage.name}: ${stage.latencyUs}µs`}
              style={{
                background: meta?.color ?? "#333",
                opacity: revealed ? 0.85 : 0,
                position: "relative",
                minWidth: revealed && pct > 3 ? 0 : undefined,
              }}
            >
              {revealed && pct > 8 && (
                <span style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 700, color: "#000", letterSpacing: "0.04em",
                }}>
                  {meta?.abbr}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div style={{ display: "flex", marginTop: 4, gap: 12, flexWrap: "wrap" }}>
        {stages.map((stage, i) => {
          const meta = STAGE_META[i];
          if (i >= activeIndex) return null;
          return (
            <span key={stage.name} style={{ fontSize: 9, color: "#555" }}>
              <span style={{ color: meta?.color, fontWeight: 700 }}>{meta?.abbr}</span>
              {" "}<span className="num">{stage.latencyUs}µs</span>
              {i < stages.length - 1 && activeIndex > i + 1 ? " →" : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Protocol trace console ─── */
function ProtocolTrace({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, overflow: "hidden", height: "100%", minHeight: 200, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #1a1a1a", fontSize: 9, color: "#444", letterSpacing: "0.1em", display: "flex", justifyContent: "space-between" }}>
        <span>PROTOCOL TRACE</span>
        <span style={{ color: "#333" }}>FIX · ITCH · WS</span>
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: "8px 12px", fontFamily: "monospace", fontSize: 10, lineHeight: 1.7 }}>
        {lines.length === 0 ? (
          <span style={{ color: "#333" }}>// Awaiting order submission...</span>
        ) : (
          lines.map((line, i) => (
            <motion.div
              key={`${i}-${line.slice(0, 20)}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ color: i === lines.length - 1 ? C.green : "#666", marginBottom: 2 }}
            >
              <span style={{ color: "#333", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
              {line}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Stage deep dive panel ─── */
function StageDeepDive({ stageIndex, stage }: {
  stageIndex: number;
  stage: PipelineStage | null;
}) {
  const meta = STAGE_META[stageIndex];
  if (!meta || !stage) {
    return (
      <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: 20, height: "100%", minHeight: 200 }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.1em", marginBottom: 12 }}>STAGE DEEP DIVE</div>
        <p style={{ fontSize: 12, color: "#444", lineHeight: 1.7, margin: 0 }}>
          Submit an order to see per-stage technical breakdown — subsystem, protocol, algorithm, and data structures used at each hop.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={stageIndex}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: "#0a0a0a", border: `1px solid ${meta.color}30`, borderRadius: 6, overflow: "hidden", height: "100%", minHeight: 200, display: "flex", flexDirection: "column" }}
    >
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${meta.color}20`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, letterSpacing: "0.08em" }}>{meta.abbr}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{meta.name}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#FFB800", fontFamily: "monospace" }} className="num">{stage.latencyUs}µs</span>
      </div>

      <div style={{ padding: "12px 14px", flex: 1, overflowY: "auto" }}>
        {stage.detail && (
          <div style={{
            padding: "8px 10px", background: `${meta.color}08`, border: `1px solid ${meta.color}20`,
            borderRadius: 4, marginBottom: 12, fontSize: 10, color: meta.color, fontFamily: "monospace", lineHeight: 1.6,
          }}>
            {stage.detail}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            { label: "SUBSYSTEM", value: meta.subsystem },
            { label: "PROTOCOL", value: meta.protocol },
            { label: "ALGORITHM", value: meta.algorithm },
            { label: "DATA STRUCTURE", value: meta.dataStructure },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#111", borderRadius: 4, padding: "6px 8px" }}>
              <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: "#aaa", lineHeight: 1.4 }}>{value}</div>
            </div>
          ))}
        </div>

        {meta.checks && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {meta.checks.map(c => (
              <span key={c} style={{ fontSize: 9, padding: "2px 8px", background: "#111", border: "1px solid #222", borderRadius: 3, color: "#666" }}>
                {c} ✓
              </span>
            ))}
          </div>
        )}

        {meta.deepDive.map((line, i) => (
          <p key={i} style={{ fontSize: 11, color: "#777", lineHeight: 1.65, margin: "0 0 8px" }}>{line}</p>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Floating stage detail modal ─── */
function StageModal({ stageIndex, stage, onClose }: {
  stageIndex: number; stage: PipelineStage | null; onClose: () => void;
}) {
  const meta = STAGE_META[stageIndex];
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!meta || !stage) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "#0a0a0a", border: `1px solid ${meta.color}40`, borderRadius: 10, maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${meta.color}20`, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: meta.color, letterSpacing: "0.08em" }}>{meta.abbr}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{meta.name}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#FFB800", fontFamily: "monospace" }} className="num">{stage.latencyUs}µs</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>
          {stage.detail && (
            <div style={{ padding: "8px 10px", background: `${meta.color}08`, border: `1px solid ${meta.color}20`, borderRadius: 4, marginBottom: 14, fontSize: 10, color: meta.color, fontFamily: "monospace", lineHeight: 1.6 }}>
              {stage.detail}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: "SUBSYSTEM", value: meta.subsystem },
              { label: "PROTOCOL", value: meta.protocol },
              { label: "ALGORITHM", value: meta.algorithm },
              { label: "DATA STRUCTURE", value: meta.dataStructure },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#111", borderRadius: 4, padding: "6px 8px" }}>
                <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 10, color: "#aaa", lineHeight: 1.4 }}>{value}</div>
              </div>
            ))}
          </div>

          {meta.checks && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
              {meta.checks.map(c => (
                <span key={c} style={{ fontSize: 9, padding: "2px 8px", background: "#111", border: "1px solid #222", borderRadius: 3, color: "#666" }}>
                  {c} ✓
                </span>
              ))}
            </div>
          )}

          {meta.deepDive.map((line, i) => (
            <p key={i} style={{ fontSize: 11, color: "#777", lineHeight: 1.65, margin: "0 0 8px" }}>{line}</p>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Stage node in pipeline ─── */
function StageNode({
  stage, meta, index, activeIndex, isLast, onClick,
}: {
  stage: PipelineStage; meta: typeof STAGE_META[0]; index: number; activeIndex: number; isLast: boolean; onClick: () => void;
}) {
  const isDone = index < activeIndex;
  const isActive = index === activeIndex;
  const color = isDone || isActive ? meta.color : "#2a2a2a";

  return (
    <div style={{ display: "flex", alignItems: "stretch", flex: 1, minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <motion.div
          onClick={onClick}
          style={{ cursor: "pointer", flex: 1, ...{
            background: isDone ? `${meta.color}08` : isActive ? `${meta.color}15` : "#0a0a0a",
            border: `1px solid ${color}`,
            borderRadius: 6,
            padding: "10px 6px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          } as React.CSSProperties }}
          animate={{
            boxShadow: isActive ? `0 0 20px ${meta.color}50, 0 0 40px ${meta.color}15` : "none",
            scale: isActive ? 1.05 : 1,
          }}
          transition={{ duration: 0.25 }}
        >
          {isActive && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 0.7, ease: "linear", repeat: Infinity }}
              style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(90deg, transparent, ${meta.color}12, transparent)`,
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.06em", marginBottom: 3 }}>{meta.layer}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: isDone || isActive ? meta.color : "#333", marginBottom: 4 }}>{meta.abbr}</div>
          <div style={{ fontSize: 8, fontWeight: 600, color: isDone || isActive ? "#ccc" : "#333", letterSpacing: "0.04em", lineHeight: 1.2, marginBottom: 4 }}>
            {stage.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 7, color: "#444", marginBottom: 4 }}>{meta.protocol}</div>

          {(isDone || isActive) && stage.latencyUs > 0 && (
            <div style={{ fontSize: 9, color: isActive ? "#FFB800" : meta.color, fontFamily: "monospace", fontWeight: 700 }} className="num">
              {stage.latencyUs}µs
            </div>
          )}

          {isDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: "absolute", top: 4, right: 4, width: 12, height: 12, borderRadius: "50%",
                background: meta.color, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 7, color: "#000", fontWeight: 700,
              }}
            >✓</motion.div>
          )}
        </motion.div>

        <div style={{ textAlign: "center", marginTop: 3 }}>
          <ExplainTip term={stage.name} explanation={meta.explain} />
        </div>
      </div>

      {!isLast && (
        <div style={{ position: "relative", width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", height: 1, background: "#1a1a1a", position: "absolute" }} />
          <motion.div
            initial={false}
            animate={{ width: isDone ? "100%" : "0%" }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute", left: 0, height: 2,
              background: `linear-gradient(to right, ${meta.color}, ${STAGE_META[index + 1]?.color ?? meta.color})`,
              boxShadow: `0 0 6px ${meta.color}`,
            }}
          />
          {isActive && (
            <motion.div
              initial={{ left: 0, opacity: 1 }}
              animate={{ left: "100%", opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeIn" }}
              style={{
                position: "absolute", width: 6, height: 6, borderRadius: "50%",
                background: meta.color, boxShadow: `0 0 10px ${meta.color}`,
                top: "50%", transform: "translateY(-50%)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Live stats strip ─── */
function LiveStatsStrip() {
  const { data: stats } = useGetMarketStats({ query: { refetchInterval: 2000 } } as any);
  const items = [
    { label: "ENGINE", value: stats?.marketState?.toUpperCase() ?? "—", color: C.green },
    { label: "ORDERS/S", value: stats?.ordersPerSecond?.toLocaleString() ?? "—", color: "#fff" },
    { label: "TRADES/S", value: stats?.tradesPerSecond?.toLocaleString() ?? "—", color: "#fff" },
    { label: "MATCH µs", value: stats?.latency?.matchingUs?.toLocaleString() ?? "—", color: "#FFB800" },
    { label: "QUEUE DEPTH", value: stats?.queueDepth?.toLocaleString() ?? "—", color: "#A855F7" },
    { label: "FILL RATE", value: stats?.ordersReceived ? `${Math.round((stats.ordersFilled / stats.ordersReceived) * 100)}%` : "—", color: C.green },
  ];

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{
          padding: "4px 10px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 4,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 8, color: "#444", letterSpacing: "0.08em" }}>{label}</span>
          <span className="num" style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─── */
export default function Pipeline() {
  const { regionMeta, defaultSymbol } = useRegion();
  const cs = regionMeta.currencySymbol;
  const { data: stockList } = useListStocks({ query: { staleTime: 30000 } } as any) as any;
  const symbols = stockList?.map((s: any) => s.symbol).slice(0, 50) ?? [defaultSymbol];

  const [symbol, setSymbol] = useState(defaultSymbol);
  const [symSearch, setSymSearch] = useState<string | null>(null);
  useEffect(() => { setSymbol(defaultSymbol); setSymSearch(null); }, [defaultSymbol]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [quantity, setQuantity] = useState("100");
  const [price, setPrice] = useState("210.00");
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [activeStage, setActiveStage] = useState(-1);
  const [resultTrades, setResultTrades] = useState<Trade[]>([]);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [animating, setAnimating] = useState(false);
  const [traceLines, setTraceLines] = useState<string[]>([]);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const { mutate: submitOrder, isPending } = useSubmitOrder();
  const { data: recentOrders } = useListOrders({ limit: 20 } as any, { query: { refetchInterval: 2000 } } as any);

  const totalLatency = pipeline.reduce((s, st) => s + (st.latencyUs ?? 0), 0);
  const activeLayer = activeStage >= 0 && activeStage < STAGE_META.length ? STAGE_META[activeStage].layer : null;
  const deepDiveIndex = activeStage > 0 ? Math.min(activeStage - 1, pipeline.length - 1) : -1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (animating) return;
    setPipeline([]);
    setActiveStage(-1);
    setResultTrades([]);
    setOrderResult(null);
    setTraceLines([]);
    setSelectedStage(null);

    submitOrder(
      { data: { symbol, type, side, quantity: Number(quantity), price: type === "limit" ? Number(price) : undefined } as any },
      {
        onSuccess: (data: any) => {
          const stages: PipelineStage[] = data.pipeline ?? [];
          const oid = data.order?.id ?? null;
          setLastOrderId(oid);
          setPipeline(stages);
          setResultTrades(data.trades ?? []);
          setOrderResult(data.order);
          setActiveStage(0);
          setAnimating(true);

          const ctx: OrderContext = {
            symbol, side, type, quantity: Number(quantity),
            price: type === "limit" ? Number(price) : undefined,
            orderId: oid ?? undefined,
          };

          stages.forEach((_, i) => {
            setTimeout(() => {
              setActiveStage(i + 1);
              setTraceLines(prev => [...prev, generateTraceMessage(i, ctx)]);
              if (i === stages.length - 1) setTimeout(() => setAnimating(false), 500);
            }, (i + 1) * 350);
          });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? err?.message ?? "Unknown error";
          alert(`Order submission failed: ${msg}`);
        },
      }
    );
  };

  const filteredSymbols = symSearch
    ? symbols.filter((s: string) => s.includes(symSearch.toUpperCase())).slice(0, 20)
    : symbols.slice(0, 30);

  return (
    <div style={{ padding: "20px 28px", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Hero header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "0.06em", marginBottom: 4 }}>
            MATCHING ENGINE PIPELINE
          </h1>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.06em", lineHeight: 1.8 }}>
            C++17 NATIVE ENGINE · LOCK-FREE MPSC QUEUE · PRICE-TIME PRIORITY ·&nbsp;
            <ExplainTip term="ITCH 5.0" explanation="NASDAQ's binary market data protocol. Message types: A=add, E=execute, D=delete, U=replace. Broadcast via multicast UDP to thousands of subscribers." />
            &nbsp;· REG NMS · FIX 4.2
          </div>
        </div>
        <LiveStatsStrip />
      </div>

      {/* Order form */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 20px",
          display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>SYMBOL</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={symSearch ?? symbol}
                onChange={e => { const v = e.target.value.toUpperCase(); setSymSearch(v); if (v && symbols.includes(v)) { setSymbol(v); setSymSearch(null); } }}
                placeholder="Search..."
                style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: C.green, padding: "7px 10px", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}
              />
              {symSearch && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, maxHeight: 140, overflowY: "auto", zIndex: 100 }}>
                  {filteredSymbols.map((s: string) => (
                    <div key={s} onClick={() => { setSymbol(s); setSymSearch(null); }} style={{ padding: "5px 10px", fontSize: 11, cursor: "pointer", color: "#aaa" }}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>SIDE</label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["buy", "sell"] as const).map(s => (
                <button key={s} type="button" onClick={() => setSide(s)} style={{
                  padding: "7px 16px", fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                  background: side === s ? (s === "buy" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)") : "#111",
                  border: `1px solid ${side === s ? (s === "buy" ? C.green : C.red) : "#2a2a2a"}`,
                  borderRadius: 4, color: side === s ? (s === "buy" ? C.green : C.red) : "#666", cursor: "pointer",
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
              <ExplainTip term="ORDER TYPE" explanation="LIMIT: execute only at specified price or better. MARKET: execute immediately at best available price." />
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["limit", "market"] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} style={{
                  padding: "7px 14px", fontSize: 11, fontFamily: "monospace",
                  background: type === t ? "rgba(0,255,136,0.1)" : "#111",
                  border: `1px solid ${type === t ? C.green : "#2a2a2a"}`,
                  borderRadius: 4, color: type === t ? C.green : "#666", cursor: "pointer",
                }}>{t.toUpperCase()}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 90 }}>
            <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>QTY</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1"
              style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "7px 10px", fontSize: 12, fontFamily: "monospace" }} />
          </div>

          {type === "limit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 100 }}>
              <label style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>LIMIT {cs}</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.01" min="0.01"
                style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "7px 10px", fontSize: 12, fontFamily: "monospace" }} />
            </div>
          )}

          <motion.button
            type="submit"
            disabled={isPending || animating}
            whileHover={{ scale: isPending || animating ? 1 : 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "8px 24px", fontSize: 12, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em",
              background: isPending || animating ? "#111" : side === "buy" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)",
              border: `1px solid ${isPending || animating ? "#333" : side === "buy" ? C.green : C.red}`,
              borderRadius: 4, color: isPending || animating ? "#555" : side === "buy" ? C.green : C.red,
              cursor: isPending || animating ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "ROUTING..." : animating ? "EXECUTING..." : `SUBMIT ${side.toUpperCase()}`}
          </motion.button>
        </div>
      </form>

      {/* Pipeline visualization */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
            EXECUTION PIPELINE · {pipeline.length > 0 ? `STAGE ${Math.min(activeStage, pipeline.length)} / ${pipeline.length}` : "9 STAGES · AWAITING ORDER"}
          </div>
          {totalLatency > 0 && activeStage >= pipeline.length && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "3px 12px", background: "rgba(0,255,136,0.08)", border: `1px solid ${C.green}`, borderRadius: 4, fontSize: 10, color: C.green, fontWeight: 700 }}
            >
              E2E: <span className="num">{totalLatency.toLocaleString()}µs</span> · {(totalLatency / 1000).toFixed(3)}ms
            </motion.div>
          )}
        </div>

        <ArchitectureBar activeLayer={activeLayer} />

        {pipeline.length === 0 ? (
          <div style={{ display: "flex", gap: 0, paddingBottom: 8 }}>
            {STAGE_META.map((meta, i) => (
                <div key={meta.name} style={{ display: "flex", alignItems: "stretch", flex: 1, minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div onClick={() => setSelectedStage(i)} style={{ cursor: "pointer", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: "10px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "#2a2a2a", marginBottom: 3 }}>{meta.layer}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#2a2a2a", marginBottom: 4 }}>{meta.abbr}</div>
                    <div style={{ fontSize: 8, color: "#222", letterSpacing: "0.04em" }}>{meta.name.toUpperCase()}</div>
                    <div style={{ fontSize: 7, color: "#1a1a1a", marginTop: 4 }}>{meta.protocol}</div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 3 }}>
                    <ExplainTip term={meta.name} explanation={meta.explain} />
                  </div>
                </div>
                {i < STAGE_META.length - 1 && <div style={{ width: 20, flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 0 }}>
            {pipeline.map((stage, i) => (
              <StageNode
                key={`${stage.name}-${i}`}
                stage={stage}
                meta={STAGE_META[i] ?? STAGE_META[0]}
                index={i}
                activeIndex={activeStage}
                isLast={i === pipeline.length - 1}
                onClick={() => setSelectedStage(i)}
              />
            ))}
          </div>
        )}

        {pipeline.length > 0 && <LatencyWaterfall stages={pipeline} activeIndex={activeStage} />}
      </div>

      {/* Protocol trace + deep dive */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ProtocolTrace lines={traceLines} />
        <StageDeepDive
          stageIndex={deepDiveIndex}
          stage={deepDiveIndex >= 0 ? pipeline[deepDiveIndex] : null}
        />
      </div>

      {/* Results grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <AnimatePresence>
            {resultTrades.length > 0 && activeStage >= pipeline.length && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: C.card, border: "1px solid #00FF8830", borderRadius: 8, overflow: "hidden" }}
              >
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a1a", fontSize: 9, color: C.green, letterSpacing: "0.1em" }}>
                  EXECUTION REPORT · {resultTrades.length} FILL{resultTrades.length > 1 ? "S" : ""} · FIX 35=8
                </div>
                {resultTrades.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ padding: "10px 14px", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>150=2 FILLED</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }} className="num">{fmt(t.quantity, 0)}</span>
                      <span style={{ fontSize: 11, color: "#777" }}>{t.symbol} @ tag 31</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.green }} className="num">{cs}{fmt(t.price)}</div>
                    </div>
                  </motion.div>
                ))}
                <div style={{ padding: "8px 14px", fontSize: 10, color: "#555" }}>
                  Notional: <span style={{ color: "#fff", fontWeight: 700 }} className="num">
                    ${fmt(resultTrades.reduce((s, t) => s + t.price * t.quantity, 0))}
                  </span>
                  {" · "}Latency: <span className="num" style={{ color: "#FFB800" }}>{totalLatency}µs</span>
                </div>
              </motion.div>
            )}
            {orderResult && activeStage >= pipeline.length && resultTrades.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: C.card, border: "1px solid #FFB80030", borderRadius: 8, padding: "16px 14px" }}
              >
                <div style={{ fontSize: 10, color: "#FFB800", fontWeight: 700, marginBottom: 6 }}>150=0 NEW · RESTING IN BOOK</div>
                <div style={{ fontSize: 11, color: "#777", lineHeight: 1.6 }}>
                  No cross at your limit price. Order queued via ITCH type=A — providing liquidity at your level.
                  <ExplainTip term="Why queued?" explanation="Your limit price is below the best ask (buy) or above the best bid (sell). The order rests until a counterparty accepts your price." />
                </div>
              </motion.div>
            )}
            {pipeline.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 14px" }}
              >
                <InfoBox title="ORDER-TO-EXECUTION TRACE" color={C.green}>
                  Submit an order to watch it traverse 9 production-grade stages — from HTTPS ingress through
                  C++ price-time matching to ITCH 5.0 market data fanout. Each stage shows real µs latency,
                  protocol messages in the trace console, and a technical deep dive panel.
                </InfoBox>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>
            ORDER FLOW · ALL PARTICIPANTS
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {recentOrders?.slice(0, 20).map((o: any) => {
              const isBuy = o.side === "buy";
              const statusColor = o.status === "filled" ? C.green : o.status === "partial" ? "#FFB800" : o.status === "rejected" ? C.red : "#555";
              return (
                <div key={o.id} style={{ padding: "6px 14px", borderBottom: "1px solid #0f0f0f", display: "grid", gridTemplateColumns: "36px 52px 60px 1fr 56px", alignItems: "center", gap: 6, fontSize: 10 }}>
                  <span style={{ color: isBuy ? C.green : C.red, fontWeight: 700, fontSize: 9 }}>{o.side?.toUpperCase()}</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{o.symbol}</span>
                  <span style={{ color: "#888" }} className="num">×{o.quantity}</span>
                  <span style={{ color: "#555", fontSize: 8 }}>{o.traderId ? `AI:${o.traderId}` : "USER"}</span>
                  <span style={{ color: statusColor, fontSize: 8, letterSpacing: "0.04em" }}>{o.status?.toUpperCase()}</span>
                </div>
              );
            })}
            {!recentOrders?.length && <div style={{ padding: 20, color: "#555", fontSize: 11, textAlign: "center" }}>No orders yet</div>}
          </div>
        </div>
      </div>
      {/* Floating detail modal */}
      <AnimatePresence>
        {selectedStage !== null && (
          <StageModal
            stageIndex={selectedStage}
            stage={selectedStage >= 0 && selectedStage < pipeline.length ? pipeline[selectedStage] : null}
            onClose={() => setSelectedStage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const SYMBOL_DATA_KEYS = ["AAPL","MSFT","NVDA","GOOG","GOOGL","META","AMZN","TSLA","AVGO","ORCL","CRM","ADBE","AMD","QCOM","TXN","INTC","NOW","INTU","PANW","CRWD","AMAT","LRCX","KLAC","MU","ASML","SNOW","NET","DDOG","TEAM","WDAY","FTNT","ZS","CDNS","SNPS","MRVL","ADI","MCHP","NXPI","SWKS","STX","WDC","HPQ","HPE","DELL","IBM","CSCO","AKAM","VEEV","ANSS","TYL","EPAM","CTSH","ACN","GLOB","GFS","CIEN","JNPR","ANET","FICO","SMCI","ARM","ONTO","MPWR","GEN","GDDY","PLTR","BRK_B","JPM","BAC","WFC","GS","MS","C","BLK","SCHW","AXP","V","MA","PYPL","DFS","COF","SYF","ALLY","SPGI","MCO","ICE","CME","NDAQ","BX","KKR","APO","BAM","BN","FNF","FAF","CBOE","RJF","LPLA","COIN","HIG","TRV","ALL","CB","PGR","MET","PRU","AFL","AIG","LNC","CINF","WRB","ERIE","AON","MMC","WTW","NTRS","UNH","LLY","JNJ","MRK","ABBV","PFE","TMO","ABT","DHR","AMGN","GILD","REGN","VRTX","BIIB","MRNA","ISRG","BSX","MDT","SYK","EW","BDX","ZBH","DXCM","IDXX","IQV","CRL","HOLX","ALGN","CVS","CI","HUM","MOH","CNC","ELV","WBA","RVMD","NTRA","BAX","COO","VTRS","ZTS","MTD","WST","HSIC","HD","MCD","NKE","SBUX","TJX","LOW","TGT","BKNG","CMG","ROST","DG","DLTR","EBAY","ETSY","ABNB","MAR","HLT","GM","F","RIVN","LCID","LVS","MGM","WYNN","RCL","CCL","NCLH","YUM","DRI","ULTA","LULU","TPR","RL","VFC","CPRI","HAS","MAT","POOL","WMT","COST","PG","KO","PEP","PM","MO","MDLZ","CL","KMB","CHD","CLX","HRL","K","CPB","GIS","CAG","MKC","TSN","KHC","SJM","MNST","STZ","TAP","SAM","XOM","CVX","COP","EOG","SLB","OXY","MPC","VLO","PSX","HAL","DVN","FANG","PR","MRO","APA","EQT","AR","CNX","MTDR","CTRA","SM","HES","BKR","CHRD","VTLE","GE","HON","CAT","DE","UPS","FDX","LMT","RTX","BA","NOC","GD","AXON","LHX","TDG","GWW","ROK","EMR","ETN","PH","ITW","SWK","MMM","ROP","OTIS","CARR","XYL","IEX","FTV","CTAS","FAST","HUBB","GNRC","VLTO","LDOS","BAH","LIN","APD","SHW","ECL","DD","NEM","FCX","NUE","STLD","CLF","X","AA","VMC","MLM","PKG","IP","WRK","SEE","IFF","CE","NEE","DUK","SO","AEP","XEL","EXC","PPL","ED","FE","WEC","CMS","ETR","LNT","ATO","NI","PNW","AES","NRG","VST","CEG","PLD","AMT","CCI","EQIX","SPG","PSA","O","AVB","EQR","DLR","WELL","VTR","MAA","UDR","CPT","EXR","CUBE","NNN","WPC","NFLX","DIS","CMCSA","VZ","T","TMUS","CHTR","PARA","WBD","FOX","OMC","IPG","EA","TTWO","RBLX","SNAP","PINS","SPOT","MTCH","ZM"];
