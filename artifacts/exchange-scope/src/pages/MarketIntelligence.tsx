import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegion } from "@/context/RegionContext";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f", blue: "#00BFFF", orange: "#FFB800", purple: "#A855F7" };

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPrice(n: number | null | undefined, region = "nasdaq") {
  if (n == null || isNaN(n)) return "—";
  const sym = region === "bse" ? "₹" : "$";
  return sym + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtLarge(n: number | null | undefined, region = "nasdaq") {
  if (n == null || isNaN(n)) return "—";
  const sym = region === "bse" ? "₹" : "$";
  if (n >= 1e12) return sym + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return sym + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return sym + (n / 1e6).toFixed(2) + "M";
  return sym + fmt(n, 0);
}

function badge(text: string, color: string) {
  return (
    <span style={{ padding: "2px 7px", background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 3, color, fontSize: 9, letterSpacing: "0.08em", fontWeight: 600 }}>
      {text}
    </span>
  );
}

const NEWS_CATEGORIES = ["general", "forex", "crypto", "merger", "earnings", "ipo"];

export default function MarketIntelligence() {
  const { region, regionMeta, defaultSymbol } = useRegion();
  const [activeTab, setActiveTab] = useState("pulse");
  const [newsCategory, setNewsCategory] = useState("general");
  const [news, setNews] = useState<any[]>([]);
  const [movers, setMovers] = useState<{ gainers: any[]; losers: any[]; mostActive: any[] }>({ gainers: [], losers: [], mostActive: [] });
  const [sectors, setSectors] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [earningsSymbol, setEarningsSymbol] = useState(defaultSymbol);
  const [earningsInput, setEarningsInput] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const api = useCallback((path: string) => `/api${path}${path.includes("?") ? "&" : "?"}region=${region}`, [region]);

  const fetchWithLoading = useCallback(async (key: string, url: string, setter: (d: any) => void) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(url);
      if (res.ok) setter(await res.json());
    } catch {}
    setLoading(prev => ({ ...prev, [key]: false }));
  }, []);

  useEffect(() => { fetchWithLoading("movers", api("/intelligence/movers"), setMovers); }, [region]);
  useEffect(() => { fetchWithLoading("sectors", api("/intelligence/sectors"), setSectors); }, [region]);
  useEffect(() => { fetchWithLoading("news", api(`/intelligence/news?category=${newsCategory}`), setNews); }, [region, newsCategory]);
  useEffect(() => { fetchWithLoading("briefing", api("/intelligence/daily-briefing"), setBriefing); }, [region]);

  useEffect(() => { setEarningsSymbol(defaultSymbol); }, [defaultSymbol]);

  useEffect(() => {
    if (activeTab === "earnings" && earningsSymbol) {
      fetchWithLoading("earnings", `/api/intelligence/earnings?symbol=${earningsSymbol}&region=${region}`, setEarningsData);
    }
  }, [region, activeTab, earningsSymbol]);

  const renderChange = (val: number | null | undefined) => {
    if (val == null) return <span style={{ color: "#555" }}>—</span>;
    const isPos = val >= 0;
    return <span style={{ color: isPos ? C.green : C.red, fontWeight: 600 }} className="num">{isPos ? "+" : ""}{val.toFixed(2)}%</span>;
  };

  const renderMovers = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {([["TOP GAINERS", movers.gainers, C.green], ["TOP LOSERS", movers.losers, C.red], ["MOST ACTIVE", movers.mostActive, C.blue]] as const).map(([title, items, color]) => (
        <div key={title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>{title}</div>
          {items.length === 0 ? (
            <div style={{ color: "#444", fontSize: 10 }}>Loading...</div>
          ) : items.slice(0, 8).map((item: any, i: number) => (
            <div key={item.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < 7 ? "1px solid #111" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: "#444", width: 14 }}>{i + 1}</span>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{item.symbol}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#ccc", fontFamily: "monospace" }} className="num">{fmtPrice(item.price, region)}</div>
                <div style={{ fontSize: 9, color: color }}>{item.changePercent >= 0 ? "+" : ""}{item.changePercent?.toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderPulse = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>SECTOR PERFORMANCE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {sectors.length === 0 ? (
            <div style={{ color: "#444", fontSize: 10, gridColumn: "1/-1" }}>Loading sectors...</div>
          ) : sectors.slice(0, 11).map((s: any) => (
            <div key={s.sector} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.sector}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.changePercent >= 0 ? C.green : C.red }} className="num">
                {s.changePercent >= 0 ? "+" : ""}{s.changePercent?.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
      {renderMovers()}
    </>
  );

  const renderNews = () => (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {NEWS_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setNewsCategory(cat)} style={{
            padding: "4px 10px", background: newsCategory === cat ? `${C.green}15` : "#111",
            border: `1px solid ${newsCategory === cat ? C.green : "#2a2a2a"}`, borderRadius: 3,
            color: newsCategory === cat ? C.green : "#666", cursor: "pointer", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase",
          }}>{cat}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading.news ? (
          <div style={{ color: "#444", fontSize: 10 }}>Loading news...</div>
        ) : news.length === 0 ? (
          <div style={{ color: "#555", fontSize: 11, padding: 20, textAlign: "center" }}>
            {region === "bse" ? "BSE news coverage is limited. Try switching to a different category or region." : "Finnhub API key not configured. Set FINNHUB_API_KEY env var."}
          </div>
        ) : news.slice(0, 30).map((item: any, i: number) => (
          <motion.a
            key={item.id ?? i} href={item.url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            style={{ display: "block", background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: "10px 14px", textDecoration: "none", cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, marginBottom: 3, lineHeight: 1.4 }}>{item.headline}</div>
                {item.summary && <div style={{ fontSize: 10, color: "#666", lineHeight: 1.5, marginBottom: 4 }}>{item.summary.slice(0, 200)}{item.summary.length > 200 ? "..." : ""}</div>}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 8, color: "#444", letterSpacing: "0.08em" }}>{item.source?.toUpperCase()}</span>
                  {item.symbol && <span style={{ fontSize: 8, color: C.green }}>{item.symbol}</span>}
                  <span style={{ fontSize: 8, color: "#444" }}>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</span>
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );

  const renderBriefing = () => (
    <div style={{ background: `linear-gradient(135deg, ${C.card}, #0f1a14)`, border: `1px solid ${C.green}30`, borderRadius: 6, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.green, letterSpacing: "0.1em", fontWeight: 700 }}>
          AI DAILY BRIEFING · {regionMeta.exchange} · GROQ LLAMA 3.3
        </div>
        {loading.briefing && <div style={{ fontSize: 8, color: "#555" }}>GENERATING...</div>}
      </div>
      {briefing ? (
        <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {(briefing.briefing ?? (typeof briefing === "string" ? briefing : "")).replace(/\*\*/g, "")}
        </div>
      ) : (
        <div style={{ color: "#555", fontSize: 11 }}>
          {loading.briefing ? "Generating daily briefing..." : `Briefing will appear here once generated. ${region === "bse" ? "Focusing on Indian markets." : "Focusing on US markets."}`}
        </div>
      )}
    </div>
  );

  const renderEarnings = () => (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input value={earningsInput} onChange={e => setEarningsInput(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter" && earningsInput.trim()) setEarningsSymbol(earningsInput.trim()); }}
          placeholder={`Symbol (e.g. ${defaultSymbol})`}
          style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "6px 10px", color: "#fff", fontSize: 11, fontFamily: "monospace", width: 140, outline: "none" }} />
        <button onClick={() => { if (earningsInput.trim()) setEarningsSymbol(earningsInput.trim()); }} style={{
          padding: "6px 12px", background: `${C.green}15`, border: `1px solid ${C.green}40`, borderRadius: 4,
          color: C.green, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", fontWeight: 600,
        }}>SEARCH</button>
        <div style={{ fontSize: 10, color: "#555" }}>Showing: <span style={{ color: "#fff", fontWeight: 600 }}>{earningsSymbol}</span></div>
      </div>
      {loading.earnings ? (
        <div style={{ color: "#444", fontSize: 10 }}>Loading earnings data...</div>
      ) : earningsData.length === 0 ? (
        <div style={{ color: "#555", fontSize: 11 }}>
          {region === "bse" ? "No earnings data for this symbol on BSE." : "No earnings data found. Finnhub API may not have this symbol."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["QUARTER", "ESTIMATED EPS", "ACTUAL EPS", "SURPRISE", "DATE"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, color: "#444", letterSpacing: "0.1em", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earningsData.slice(0, 12).map((e: any, i: number) => {
                const beat = e.surprisePct != null && e.surprisePct > 0;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "8px 10px", color: "#888" }}>{e.quarter}</td>
                    <td style={{ padding: "8px 10px", color: "#aaa" }} className="num">{e.estimatedEps != null ? fmtPrice(e.estimatedEps, region) : "—"}</td>
                    <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 600 }} className="num">{e.reportedEps != null ? fmtPrice(e.reportedEps, region) : "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {e.surprisePct != null ? (
                        <span style={{ color: beat ? C.green : C.red, background: beat ? `${C.green}10` : `${C.red}10`, padding: "2px 6px", borderRadius: 3, fontSize: 10 }}>
                          {beat ? "+" : ""}{e.surprisePct.toFixed(1)}%
                        </span>
                      ) : e.surprise != null ? (
                        <span style={{ color: beat ? C.green : C.red, padding: "2px 6px", fontSize: 10 }}>
                          {beat ? "+" : ""}{e.surprise.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#666", fontSize: 10 }}>{new Date(e.reportDate).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const TABS = [
    { id: "pulse", label: "Market Pulse" },
    { id: "news", label: "News Center" },
    { id: "briefing", label: "Daily Briefing" },
    { id: "earnings", label: "Earnings Center" },
  ];

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>MARKET INTELLIGENCE</h1>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>{regionMeta.exchange} · {regionMeta.currency} · DATA-DRIVEN INSIGHTS · AI-POWERED ANALYSIS</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "6px 14px", background: activeTab === tab.id ? `${C.green}15` : "#111",
            border: `1px solid ${activeTab === tab.id ? C.green : "#2a2a2a"}`, borderRadius: 4,
            color: activeTab === tab.id ? C.green : "#666", cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase",
          }}>{tab.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${activeTab}-${region}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === "pulse" && renderPulse()}
          {activeTab === "news" && renderNews()}
          {activeTab === "briefing" && renderBriefing()}
          {activeTab === "earnings" && renderEarnings()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
