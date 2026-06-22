import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { useGetMarketStats } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

function AnimatedCounter({ target, duration = 2000, suffix = "", decimals = 0 }: { target: number; duration?: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const frozenTarget = useRef<number>(target);

  useEffect(() => {
    if (!inView) return;
    frozenTarget.current = target;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * frozenTarget.current;
      setDisplay(current.toFixed(decimals));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, duration]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// Scrolling ticker mixing US and Indian market symbols
function OrderTicker() {
  const syms = ["AAPL", "RELIANCE", "MSFT", "TCS", "NVDA", "INFY", "JPM", "HDFC", "TSLA", "WIPRO"];
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

const EXCHANGES = [
  { id: "nasdaq", label: "NASDAQ", flag: "🇺🇸", currency: "USD", count: "721", color: "#00FF88", desc: "US tech and growth leaders. Apple, NVIDIA, Meta, Amazon, and 700+ more." },
  { id: "nyse",   label: "NYSE",   flag: "🇺🇸", currency: "USD", count: "713", color: "#00BFFF", desc: "The world's largest exchange by market cap. JPMorgan, Berkshire, Exxon." },
  { id: "nse",    label: "NSE",    flag: "🇮🇳", currency: "INR", count: "515", color: "#FFB800", desc: "India's top exchange. Reliance, TCS, Infosys, HDFC Bank, and 500+ more." },
  { id: "bse",    label: "BSE",    flag: "🇮🇳", currency: "INR", count: "483", color: "#A855F7", desc: "Asia's oldest exchange (est. 1875). The Bombay Stock Exchange Sensex." },
];

const CONCEPTS = [
  {
    title: "Order Book",
    icon: "▤",
    color: "#00FF88",
    oneliner: "The world's biggest auction, happening millions of times per second.",
    detail: "Every stock exchange — NASDAQ, NYSE, NSE, BSE — keeps a live ledger of everyone willing to buy (bids) and sell (asks). The highest buyer and lowest seller are matched first. ExchangeScope makes it visible in real time across all four markets.",
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
    detail: "Market makers post both buy and sell orders continuously, earning the spread between them. Without them, you might wait hours to fill an order. Watch them work live across NSE, BSE, NASDAQ, and NYSE in the Control Center.",
  },
  {
    title: "Latency",
    icon: "⚡",
    color: "#FF4444",
    oneliner: "How fast your order travels from your screen to execution — measured in microseconds.",
    detail: "Modern exchanges process orders in under 10 microseconds. ExchangeScope measures gateway latency, queue time, and matching time separately so you can see exactly where time is spent — whether you're trading in Mumbai or New York.",
  },
  {
    title: "Price Discovery",
    icon: "◎",
    color: "#A855F7",
    oneliner: "How millions of competing bids and asks converge on a fair price.",
    detail: "No one sets stock prices — they emerge from the collective decisions of millions of buyers and sellers. The same price-time priority rules that govern AAPL on NASDAQ govern RELIANCE on NSE. The matching engine is universal.",
  },
  {
    title: "Flash Crash",
    icon: "↯",
    color: "#FF4444",
    oneliner: "When algorithmic feedback loops cause prices to collapse in seconds.",
    detail: "In 2010, the Dow fell 9% in minutes. Indian markets hit their 10% circuit breaker in 2020 in hours. Trigger one in ExchangeScope's Control Center to see how panic selling spirals through the matching engine — and how exchanges recover.",
  },
];

const PAGES = [
  { path: "/academy", label: "Academy", desc: "Eight structured lessons from 'what is a stock?' to matching engine microstructure. Covers NASDAQ, NYSE, NSE, and BSE with real-world examples.", color: "#00FF88" },
  { path: "/market",  label: "Market Overview", desc: "Live prices for 2,400+ companies across all four exchanges. Switch regions instantly — US to India and back — with sparklines, movers, and watchlists.", color: "#00FF88" },
  { path: "/orderbook", label: "Order Book", desc: "Bid/ask depth visualization for any stock on any exchange. Watch Indian rupee prices update alongside US dollar quotes in real time.", color: "#00BFFF" },
  { path: "/sector-heatmap", label: "Sector Heatmap", desc: "Market-cap weighted treemap showing sector rotation across any exchange. Compare NSE Energy vs NASDAQ Technology in one view.", color: "#FFB800" },
  { path: "/pipeline", label: "Matching Engine Pipeline", desc: "Submit an order and watch it travel through all 8 stages — gateway, risk check, matching, and more — with live µs timings.", color: "#A855F7" },
  { path: "/control", label: "Control Center", desc: "Trigger market scenarios (flash crash, bull run, bear market), observe AI trader behavior, and ask the AI to explain anything about market microstructure.", color: "#FF4444" },
];

declare global {
  interface Window { google?: { accounts: { id: { initialize: (config: any) => void; renderButton: (el: HTMLElement, opts: any) => void; prompt: () => void } } } }
}

export default function Landing() {
  const { data: stats } = useGetMarketStats({ query: { refetchInterval: 1000, queryKey: ["market-stats"] } });
  const { user, login, loading } = useAuth();
  const [, navigate] = useLocation();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [loginError, setLoginError] = useState("");
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/config")
      .then(r => r.json())
      .then(cfg => setGoogleClientId(cfg.googleClientId))
      .catch(() => setGoogleClientId(null));
  }, []);

  useEffect(() => {
    if (user || !googleClientId) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: any) => {
            try {
              await login(resp.credential);
              navigate("/market");
            } catch {
              setLoginError("Sign in failed. Try again.");
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 280,
        });
      }
    };
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, [user, googleClientId, login, navigate]);

  const handleDevLogin = async () => {
    try {
      await login("dev-mode");
      navigate("/market");
    } catch {
      setLoginError("Dev login failed");
    }
  };

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", opacity: 0.18, overflow: "hidden", padding: "20px 40px", gap: 40 }}>
          {[0,1,2,3].map(i => <OrderTicker key={i} />)}
        </div>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(0,255,136,0.05) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to bottom, transparent, #0A0A0A)" }} />

        <div style={{ position: "relative", textAlign: "center", maxWidth: 860, padding: "0 40px" }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ fontSize: 11, letterSpacing: "0.25em", color: "#00FF88", marginBottom: 20, textTransform: "uppercase" }}
          >
            Global Stock Market Simulator · NASDAQ · NYSE · NSE · BSE
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontSize: 54, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.02em" }}
          >
            Learn how stock markets<br />
            <span style={{ color: "#00FF88" }}>actually work</span> — US &amp; India
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{ fontSize: 17, color: "#888", lineHeight: 1.75, marginBottom: 40, maxWidth: 660, margin: "0 auto 40px" }}
          >
            Never bought a stock? Start at Lesson 1. Already trade on Zerodha or Robinhood? Jump to microstructure.
            This simulator tracks <strong style={{ color: "#ccc" }}>2,400+ live prices</strong> across NASDAQ, NYSE, NSE, and BSE using a real C++ matching engine — explained in plain English at every step.
          </motion.p>

          {/* Live stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: "flex", justifyContent: "center", gap: 48, marginBottom: 44, flexWrap: "wrap" }}
          >
            {[
              { label: "Exchanges covered", value: 4, suffix: "", decimals: 0 },
              { label: "Live prices tracked", value: 2432, suffix: "+", decimals: 0 },
              { label: "Engine latency", value: stats?.latency?.totalUs ?? 256, suffix: "µs", decimals: 1 },
            ].map(({ label, value, suffix, decimals }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#00FF88", fontFamily: "monospace", lineHeight: 1 }}>
                  <AnimatedCounter target={value} suffix={suffix} decimals={decimals} />
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 6, letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}
          >
            {user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {user.picture && <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />}
                  <span style={{ color: "#00FF88", fontSize: 14 }}>Welcome back, {user.name}</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <Link href="/market">
                    <motion.button whileHover={{ scale: 1.04 }} style={{ padding: "14px 36px", background: "rgba(0,255,136,0.12)", border: "1px solid #00FF88", borderRadius: 6, color: "#00FF88", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "monospace" }}>
                      ENTER THE LAB
                    </motion.button>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Link href="/academy">
                  <motion.button whileHover={{ scale: 1.04 }} style={{ padding: "12px 32px", background: "transparent", border: "1px solid #444", borderRadius: 6, color: "#aaa", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "monospace", width: 280 }}>
                    CONTINUE AS GUEST
                  </motion.button>
                </Link>
                {googleClientId ? (
                  !loading && <div ref={googleBtnRef} style={{ minHeight: 40 }} />
                ) : (
                  <motion.button onClick={handleDevLogin} whileHover={{ scale: 1.04 }} style={{ padding: "12px 32px", background: "rgba(0,255,136,0.12)", border: "1px solid #00FF88", borderRadius: 6, color: "#00FF88", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "monospace", width: 280 }}>
                    SIGN IN WITH GOOGLE
                  </motion.button>
                )}
                {loginError && <div style={{ fontSize: 11, color: "#FF4444" }}>{loginError}</div>}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: 20, fontSize: 11, color: "#fff", letterSpacing: "0.1em", opacity: 0.8 }}
        >
          SCROLL TO EXPLORE
        </motion.div>
      </section>

      {/* ── Pipeline banner ───────────────────────────────────────────────────── */}
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

      {/* ── Exchange showcase ─────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 80px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>LIVE DATA · FOUR EXCHANGES</div>
          <h2 style={{ fontSize: 38, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Switch between US and Indian markets</h2>
          <p style={{ fontSize: 15, color: "#666", maxWidth: 620, margin: "0 auto" }}>
            One click changes the entire lab — live prices, sector heatmap, order book, and matching engine — to whichever exchange you're studying.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, maxWidth: 1100, margin: "0 auto" }}>
          {EXCHANGES.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, borderColor: ex.color }}
              style={{ background: "#111", border: `1px solid #1f1f1f`, borderRadius: 8, padding: "20px 18px", transition: "border-color 0.2s" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{ex.flag}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ex.color, letterSpacing: "0.05em" }}>{ex.label}</div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.08em" }}>{ex.currency}</div>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, fontFamily: "monospace" }}>{ex.count}</div>
              <div style={{ fontSize: 9, color: "#555", marginBottom: 10 }}>companies tracked</div>
              <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{ex.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Concepts grid ─────────────────────────────────────────────────────── */}
      <section id="concepts" style={{ padding: "60px 80px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>CORE CONCEPTS</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Everything you need to know</h2>
          <p style={{ fontSize: 16, color: "#666", maxWidth: 600, margin: "0 auto" }}>
            Stock exchanges are complex systems. ExchangeScope explains each piece with live visualizations, not textbook diagrams — whether the exchange is in Mumbai or New York.
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
              style={{ background: "#111", border: `1px solid ${c.color}20`, borderRadius: 8, padding: 24 }}
            >
              <div style={{ fontSize: 28, marginBottom: 12, color: c.color }}>{c.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: c.color, marginBottom: 12, fontStyle: "italic" }}>{c.oneliner}</div>
              <div style={{ fontSize: 12, color: "#777", lineHeight: 1.7 }}>{c.detail}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pipeline explainer ────────────────────────────────────────────────── */}
      <section style={{ background: "#0D0D0D", border: "1px solid #1a1a1a", padding: "80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>HOW AN ORDER TRAVELS</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 12 }}>From your click to execution in 256 microseconds</h2>
            <p style={{ fontSize: 14, color: "#666" }}>The same 8-stage pipeline runs whether your order lands on NSE, BSE, NASDAQ, or NYSE.</p>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", padding: "0 0 16px" }}>
            {[
              { name: "Trader",    color: "#6B7280", desc: "You hit submit. The order is serialized into a protocol message.", us: "0" },
              { name: "Gateway",   color: "#00FF88", desc: "The exchange gateway authenticates your session and timestamps arrival to the microsecond.", us: "30-80" },
              { name: "Risk Check",color: "#FFB800", desc: "Pre-trade risk controls verify buying power and position limits. NSE uses SEBI's 20% circuit breaker.", us: "20-40" },
              { name: "Validation",color: "#00BFFF", desc: "Symbol exists? Quantity valid? Price within circuit breaker band? If yes, proceed.", us: "10-20" },
              { name: "Order Queue",color: "#A855F7", desc: "The order joins a lock-free queue. Sequence number assigned. Time priority begins here.", us: "50-150" },
              { name: "C++ Engine",color: "#00FF88", desc: "The matching engine scans all resting orders at the best price. Price-time priority is universal.", us: "40-100" },
              { name: "Execution", color: "#FFB800", desc: "Trade confirmed. Both sides get execution reports. Order book updated atomically.", us: "20-40" },
              { name: "Broadcast", color: "#FF4444", desc: "The new trade price is sent to every market data subscriber. ITCH on US; NEAT/BOLT on Indian exchanges.", us: "10-30" },
            ].map((stage, i) => (
              <div key={stage.name} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                <div style={{ background: "#151515", border: `1px solid ${stage.color}30`, borderRadius: 8, padding: "16px 14px", width: 120, textAlign: "center" }}>
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

      {/* ── Features / pages grid ─────────────────────────────────────────────── */}
      <section style={{ padding: "100px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>EXPLORE THE LAB</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: "#fff" }}>Learn by doing, not reading slides</h2>
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
                  border: "1px solid #1f1f1f",
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
          <Link href="/academy">
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
              BEGIN THE CURRICULUM
            </motion.button>
          </Link>
        </div>
      </section>

      {/* ── US vs India comparison strip ─────────────────────────────────────── */}
      <section style={{ background: "#0D0D0D", borderTop: "1px solid #1a1a1a", padding: "60px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 12 }}>COMPARE MARKET STRUCTURES</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Same rules, different markets</h2>
            <p style={{ fontSize: 14, color: "#666" }}>The mechanics are universal — only the currency, timezone, and circuit breaker levels change.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              {
                label: "US Markets (NASDAQ / NYSE)",
                flag: "🇺🇸",
                color: "#00FF88",
                rows: [
                  ["Currency", "USD ($)"],
                  ["Trading hours", "9:30 AM – 4:00 PM ET"],
                  ["Settlement", "T+1 (since May 2024)"],
                  ["Circuit breakers", "7% / 13% / 20% (S&P 500)"],
                  ["Regulator", "SEC / FINRA"],
                  ["Market makers", "Citadel Securities, Virtu Financial"],
                ],
              },
              {
                label: "Indian Markets (NSE / BSE)",
                flag: "🇮🇳",
                color: "#FFB800",
                rows: [
                  ["Currency", "INR (₹)"],
                  ["Trading hours", "9:15 AM – 3:30 PM IST"],
                  ["Settlement", "T+1 (since Jan 2023)"],
                  ["Circuit breakers", "10% / 15% / 20% (Nifty 50)"],
                  ["Regulator", "SEBI"],
                  ["Market index", "Nifty 50 (NSE) / Sensex (BSE)"],
                ],
              },
            ].map(market => (
              <div key={market.label} style={{ background: "#111", border: `1px solid ${market.color}20`, borderRadius: 8, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>{market.flag}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: market.color }}>{market.label}</div>
                </div>
                {market.rows.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1a1a1a", padding: "7px 0" }}>
                    <span style={{ fontSize: 11, color: "#555" }}>{k}</span>
                    <span style={{ fontSize: 11, color: "#ccc", fontFamily: "monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid #1a1a1a", padding: "24px 80px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, background: "linear-gradient(135deg, #00FF88, #00cc6a)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <span style={{ fontSize: 12, color: "#555" }}>ExchangeScope · NASDAQ · NYSE · NSE · BSE · Financial Systems Laboratory</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Market Overview", "Order Book", "Sector Heatmap", "Pipeline", "Control"].map(p => (
            <span key={p} style={{ fontSize: 11, color: "#444", cursor: "pointer" }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
