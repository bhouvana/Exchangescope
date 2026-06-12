import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useGetMarketStats } from "@workspace/api-client-react";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

function AnimatedCounter({ target, duration = 2000, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// Scrolling ticker of fake order IDs
function OrderTicker() {
  const syms = ["AAPL", "MSFT", "NVDA", "JPM", "TSLA", "GOOG", "META", "AMZN", "BRK", "V"];
  const sides = ["BUY", "SELL"];
  const types = ["LMT", "MKT", "IOC"];
  const [ticks, setTicks] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: Math.random().toString(36).slice(2, 9).toUpperCase(),
      sym: syms[Math.floor(Math.random() * syms.length)],
      side: sides[Math.floor(Math.random() * sides.length)],
      type: types[Math.floor(Math.random() * types.length)],
      qty: Math.floor(Math.random() * 500) + 10,
      price: (Math.random() * 400 + 50).toFixed(2),
      status: Math.random() > 0.3 ? "FILLED" : "QUEUED",
      key: i,
    }))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setTicks(prev => {
        const newTick = {
          id: Math.random().toString(36).slice(2, 9).toUpperCase(),
          sym: syms[Math.floor(Math.random() * syms.length)],
          side: sides[Math.floor(Math.random() * sides.length)],
          type: types[Math.floor(Math.random() * types.length)],
          qty: Math.floor(Math.random() * 500) + 10,
          price: (Math.random() * 400 + 50).toFixed(2),
          status: Math.random() > 0.3 ? "FILLED" : "QUEUED",
          key: Date.now(),
        };
        return [newTick, ...prev.slice(0, 28)];
      });
    }, 180);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ overflow: "hidden", height: "100%", position: "relative" }}>
      {ticks.map((t, i) => (
        <motion.div
          key={t.key}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.25 - i * 0.008, y: 0 }}
          style={{
            display: "flex",
            gap: 16,
            padding: "2px 0",
            fontSize: 9,
            fontFamily: "monospace",
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "#555" }}>{t.id}</span>
          <span style={{ color: t.side === "BUY" ? C.green : C.red, fontWeight: 700 }}>{t.side}</span>
          <span style={{ color: "#aaa" }}>{t.sym}</span>
          <span style={{ color: "#666" }}>{t.type}</span>
          <span style={{ color: "#888" }}>×{t.qty}</span>
          <span style={{ color: "#777" }}>${t.price}</span>
          <span style={{ color: t.status === "FILLED" ? C.green : "#555" }}>{t.status}</span>
        </motion.div>
      ))}
    </div>
  );
}

const CONCEPTS = [
  {
    title: "Order Book",
    icon: "▤",
    color: "#00FF88",
    oneliner: "The world's biggest auction, happening millions of times per second.",
    detail: "Every stock exchange keeps a list of everyone willing to buy (bids) and sell (asks) a stock. The highest buyer and lowest seller are matched first — this is the order book. ExchangeScope makes it visible in real time.",
  },
  {
    title: "Matching Engine",
    icon: "⚙",
    color: "#00BFFF",
    oneliner: "The brain that connects every buyer with a seller in under a millisecond.",
    detail: "When you submit an order, a C++ program instantly scans thousands of resting orders to find the best match. ExchangeScope runs a real matching engine — not a simulation — and shows you every microsecond of the process.",
  },
  {
    title: "Market Makers",
    icon: "◈",
    color: "#FFB800",
    oneliner: "The invisible hands that keep markets liquid and prices fair.",
    detail: "Market makers are professional traders who constantly post both buy and sell orders, earning the tiny spread between them. Without them, you might wait hours for your order to fill. Watch them work live on the Control Center.",
  },
  {
    title: "Latency",
    icon: "⚡",
    color: "#FF4444",
    oneliner: "How fast your order travels from your screen to execution — measured in microseconds.",
    detail: "Modern exchanges process orders in under 10 microseconds — 50 times faster than the blink of an eye. ExchangeScope measures gateway latency, queue time, and matching time separately so you can see exactly where time is spent.",
  },
  {
    title: "Price Discovery",
    icon: "◎",
    color: "#A855F7",
    oneliner: "How millions of competing bids and asks converge on a fair price.",
    detail: "No one sets stock prices — they emerge from the collective decisions of millions of buyers and sellers. The matching engine is the mechanism: by connecting the highest bidder with the lowest asker, it continuously discovers the true market price.",
  },
  {
    title: "Flash Crash",
    icon: "↯",
    color: "#FF4444",
    oneliner: "When algorithmic feedback loops cause prices to collapse in seconds.",
    detail: "In 2010, the Dow Jones fell 9% in minutes due to cascading automated sell orders. Trigger one in ExchangeScope's Control Center to see how panic selling spirals through the matching engine — and how exchanges recover.",
  },
];

const PAGES = [
  { path: "/market", label: "Market Overview", desc: "Live prices for 300+ companies across every sector. Sparkline charts, market movers, and watchlists.", color: "#00FF88" },
  { path: "/orderbook", label: "Order Book", desc: "Bid/ask depth visualization. Watch prices change in real time as orders flow in and out of the book.", color: "#00BFFF" },
  { path: "/pipeline", label: "Matching Engine Pipeline", desc: "Submit an order and watch it travel through all 8 stages — gateway, risk check, matching, and more — with live µs timings.", color: "#FFB800" },
  { path: "/control", label: "Control Center", desc: "Trigger market scenarios, observe AI trader behavior, and ask the AI to explain anything about market microstructure.", color: "#A855F7" },
  { path: "/replay", label: "Market Replay", desc: "Scrub through every market event on a timeline. Inspect individual orders, fills, and cancellations.", color: "#FF4444" },
];

export default function Landing() {
  const { data: stats } = useGetMarketStats({ query: { refetchInterval: 1000 } });

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", overflowX: "hidden" }}>

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Ticker background */}
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", opacity: 0.18, overflow: "hidden", padding: "20px 40px", gap: 40 }}>
          {[0,1,2,3].map(i => <OrderTicker key={i} />)}
        </div>

        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(0,255,136,0.05) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to bottom, transparent, #0A0A0A)" }} />

        {/* Content */}
        <div style={{ position: "relative", textAlign: "center", maxWidth: 800, padding: "0 40px" }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ fontSize: 11, letterSpacing: "0.25em", color: "#00FF88", marginBottom: 20, textTransform: "uppercase" }}
          >
            Financial Systems Visualization Laboratory
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.05, marginBottom: 24, letterSpacing: "-0.02em" }}
          >
            Peer inside the<br />
            <span style={{ color: "#00FF88", textShadow: "0 0 40px rgba(0,255,136,0.4)" }}>world's fastest</span><br />
            machines
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{ fontSize: 18, color: "#888", lineHeight: 1.7, marginBottom: 40 }}
          >
            Stock exchanges process millions of orders every second with sub-millisecond precision.
            ExchangeScope makes every microsecond visible — powered by a real C++ matching engine,
            300+ live simulated companies, and AI-powered explanations for everyone.
          </motion.p>

          {/* Live stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: "flex", justifyContent: "center", gap: 48, marginBottom: 44 }}
          >
            {[
              { label: "Companies tracked", value: stats ? 313 : 313, suffix: "+" },
              { label: "Orders / second", value: stats?.ordersPerSecond ?? 0, suffix: "" },
              { label: "Engine latency", value: stats?.latency?.totalUs ?? 256, suffix: "µs" },
            ].map(({ label, value, suffix }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#00FF88", fontFamily: "monospace", lineHeight: 1 }}>
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 6, letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            style={{ display: "flex", gap: 12, justifyContent: "center" }}
          >
            <Link href="/market">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(0,255,136,0.35)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: "14px 36px",
                  background: "rgba(0,255,136,0.12)",
                  border: "1px solid #00FF88",
                  borderRadius: 6,
                  color: "#00FF88",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                ENTER THE EXCHANGE
              </motion.button>
            </Link>
            <a href="#concepts">
              <motion.button
                whileHover={{ scale: 1.04 }}
                style={{
                  padding: "14px 36px",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#888",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                LEARN HOW IT WORKS
              </motion.button>
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: "absolute", bottom: 32, fontSize: 11, color: "#333", letterSpacing: "0.1em" }}
        >
          SCROLL TO EXPLORE
        </motion.div>
      </section>

      {/* How it works banner */}
      <section style={{ background: "#0D0D0D", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", padding: "20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 60, overflow: "hidden" }}>
          {["Order Submitted", "Gateway Auth", "Risk Check", "Validation", "Order Queue", "C++ Matching Engine", "Trade Execution", "Market Broadcast"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
              {i > 0 && <div style={{ width: 32, height: 1, background: "#1f1f1f" }} />}
              <div style={{ fontSize: 10, color: i === 5 ? "#00FF88" : "#444", letterSpacing: "0.08em", whiteSpace: "nowrap", fontWeight: i === 5 ? 700 : 400 }}>
                {s}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Concepts grid */}
      <section id="concepts" style={{ padding: "100px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>CORE CONCEPTS</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Everything you need to know</h2>
          <p style={{ fontSize: 16, color: "#666", maxWidth: 600, margin: "0 auto" }}>
            Stock exchanges are complex systems. ExchangeScope explains each piece with live visualizations, not textbook diagrams.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
          {CONCEPTS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              style={{
                background: "#111",
                border: `1px solid ${c.color}20`,
                borderRadius: 8,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12, color: c.color }}>{c.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: c.color, marginBottom: 12, fontStyle: "italic" }}>{c.oneliner}</div>
              <div style={{ fontSize: 12, color: "#777", lineHeight: 1.7 }}>{c.detail}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pipeline explainer */}
      <section style={{ background: "#0D0D0D", border: "1px solid #1a1a1a", padding: "80px", margin: "0 0 0 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>HOW AN ORDER TRAVELS</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 12 }}>From your click to the execution in 256 microseconds</h2>
            <p style={{ fontSize: 14, color: "#666" }}>Every time you submit an order in ExchangeScope, it passes through all 8 of these real stages.</p>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", padding: "0 0 16px" }}>
            {[
              { name: "Trader", color: "#6B7280", desc: "You hit submit. The order is serialized into a fix-protocol message.", us: "0" },
              { name: "Gateway", color: "#00FF88", desc: "The exchange gateway authenticates your session and receives the packet.", us: "30-80" },
              { name: "Risk Check", color: "#FFB800", desc: "Pre-trade risk controls verify you have enough buying power and aren't violating position limits.", us: "20-40" },
              { name: "Validation", color: "#00BFFF", desc: "Symbol exists? Quantity valid? Price within circuit breaker limits? If yes, proceed.", us: "10-20" },
              { name: "Order Queue", color: "#A855F7", desc: "The order joins a lock-free queue. Sequence number assigned. This is where time priority begins.", us: "50-150" },
              { name: "C++ Engine", color: "#00FF88", desc: "The matching engine scans all resting orders at the best price. If a counterparty exists, it matches.", us: "40-100" },
              { name: "Execution", color: "#FFB800", desc: "Trade confirmed. Both sides get execution reports. The order book is updated atomically.", us: "20-40" },
              { name: "Broadcast", color: "#FF4444", desc: "The new trade price is sent to every market data subscriber via ITCH 5.0 protocol.", us: "10-30" },
            ].map((stage, i) => (
              <div key={stage.name} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                <div style={{
                  background: "#151515",
                  border: `1px solid ${stage.color}30`,
                  borderRadius: 8,
                  padding: "16px 14px",
                  width: 120,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, color: "#444", marginBottom: 6, letterSpacing: "0.1em" }}>STAGE {i+1}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: stage.color, marginBottom: 6 }}>{stage.name}</div>
                  <div style={{ fontSize: 9, color: "#555", lineHeight: 1.5 }}>{stage.desc}</div>
                  <div style={{ marginTop: 8, fontSize: 9, color: stage.color, fontFamily: "monospace" }}>{stage.us}µs</div>
                </div>
                {i < 7 && (
                  <div style={{ display: "flex", alignItems: "center", height: 80, paddingTop: 24 }}>
                    <div style={{ width: 20, height: 1, background: "#333" }} />
                    <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "6px solid #333" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / pages grid */}
      <section style={{ padding: "100px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>EXPLORE THE LAB</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: "#fff" }}>Five views, one exchange</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 900, margin: "0 auto" }}>
          {PAGES.map((p, i) => (
            <Link key={p.path} href={p.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02, borderColor: p.color }}
                style={{
                  background: "#111",
                  border: `1px solid #1f1f1f`,
                  borderRadius: 8,
                  padding: "20px 24px",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                  gridColumn: i === 4 ? "span 2" : "span 1",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 6, letterSpacing: "0.05em" }}>
                  {p.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{p.desc}</div>
              </motion.div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 60 }}>
          <Link href="/market">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 32px rgba(0,255,136,0.3)" }}
              style={{
                padding: "16px 48px",
                background: "rgba(0,255,136,0.1)",
                border: "1px solid #00FF88",
                borderRadius: 6,
                color: "#00FF88",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.12em",
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              START EXPLORING
            </motion.button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1a1a1a", padding: "24px 80px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, background: "linear-gradient(135deg, #00FF88, #00cc6a)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <span style={{ fontSize: 12, color: "#555" }}>ExchangeScope · Financial Systems Visualization Laboratory</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Market Overview", "Order Book", "Pipeline", "Control", "Replay"].map(p => (
            <span key={p} style={{ fontSize: 11, color: "#444", cursor: "pointer" }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
