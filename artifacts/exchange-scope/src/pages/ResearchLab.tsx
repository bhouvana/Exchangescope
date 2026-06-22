import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegion } from "@/context/RegionContext";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f", blue: "#00BFFF", orange: "#FFB800", purple: "#A855F7" };

const INDIAN_SYMBOLS = [
  { s: "RELIANCE", n: "Reliance Industries" },
  { s: "TCS", n: "Tata Consultancy Services" },
  { s: "HDFCBANK", n: "HDFC Bank Ltd" },
  { s: "INFY", n: "Infosys Ltd" },
  { s: "ICICIBANK", n: "ICICI Bank Ltd" },
  { s: "WIPRO", n: "Wipro Ltd" },
  { s: "ITC", n: "ITC Ltd" },
  { s: "SBIN", n: "State Bank of India" },
  { s: "BHARTIARTL", n: "Bharti Airtel Ltd" },
  { s: "KOTAKBANK", n: "Kotak Mahindra Bank" },
  { s: "LT", n: "Larsen & Toubro Ltd" },
  { s: "AXISBANK", n: "Axis Bank Ltd" },
  { s: "BAJFINANCE", n: "Bajaj Finance Ltd" },
  { s: "MARUTI", n: "Maruti Suzuki India" },
  { s: "TITAN", n: "Titan Company Ltd" },
  { s: "ASIANPAINT", n: "Asian Paints Ltd" },
  { s: "NTPC", n: "NTPC Ltd" },
  { s: "M&M", n: "Mahindra & Mahindra" },
  { s: "POWERGRID", n: "Power Grid Corp" },
  { s: "HCLTECH", n: "HCL Technologies" },
  { s: "SUNPHARMA", n: "Sun Pharmaceutical" },
  { s: "ULTRACEMCO", n: "UltraTech Cement Ltd" },
  { s: "TATAMOTORS", n: "Tata Motors Ltd" },
  { s: "HINDUNILVR", n: "Hindustan Unilever" },
  { s: "ONGC", n: "Oil & Natural Gas Corp" },
  { s: "COALINDIA", n: "Coal India Ltd" },
  { s: "ADANIENT", n: "Adani Enterprises" },
  { s: "ADANIPORTS", n: "Adani Ports & SEZ" },
  { s: "EICHERMOT", n: "Eicher Motors Ltd" },
  { s: "JSWSTEEL", n: "JSW Steel Ltd" },
  { s: "TATASTEEL", n: "Tata Steel Ltd" },
  { s: "DRREDDY", n: "Dr Reddy's Laboratories" },
  { s: "CIPLA", n: "Cipla Ltd" },
  { s: "DIVISLAB", n: "Divi's Laboratories" },
  { s: "APOLLOHOSP", n: "Apollo Hospitals" },
  { s: "ZOMATO", n: "Zomato Ltd" },
  { s: "TRENT", n: "Trent Ltd" },
  { s: "NESTLEIND", n: "Nestle India" },
  { s: "BRITANNIA", n: "Britannia Industries" },
  { s: "DABUR", n: "Dabur India" },
];

const ALL_SYMBOLS = [
  // NASDAQ
  { s: "AAPL", n: "Apple Inc.", r: "nasdaq" },
  { s: "MSFT", n: "Microsoft Corp", r: "nasdaq" },
  { s: "GOOGL", n: "Alphabet Inc", r: "nasdaq" },
  { s: "AMZN", n: "Amazon.com Inc", r: "nasdaq" },
  { s: "META", n: "Meta Platforms Inc", r: "nasdaq" },
  { s: "TSLA", n: "Tesla Inc", r: "nasdaq" },
  { s: "NVDA", n: "NVIDIA Corp", r: "nasdaq" },
  { s: "AVGO", n: "Broadcom Inc", r: "nasdaq" },
  { s: "ORCL", n: "Oracle Corp", r: "nasdaq" },
  { s: "QCOM", n: "Qualcomm Inc", r: "nasdaq" },
  { s: "AMD", n: "Advanced Micro Devices", r: "nasdaq" },
  { s: "INTC", n: "Intel Corp", r: "nasdaq" },
  { s: "CSCO", n: "Cisco Systems", r: "nasdaq" },
  { s: "ADBE", n: "Adobe Inc", r: "nasdaq" },
  { s: "NFLX", n: "Netflix Inc", r: "nasdaq" },
  { s: "CRM", n: "Salesforce Inc", r: "nasdaq" },
  { s: "PYPL", n: "PayPal Holdings", r: "nasdaq" },
  { s: "ABNB", n: "Airbnb Inc", r: "nasdaq" },
  { s: "SBUX", n: "Starbucks Corp", r: "nasdaq" },
  { s: "COST", n: "Costco Wholesale", r: "nasdaq" },
  // NYSE
  { s: "JPM", n: "JPMorgan Chase & Co", r: "nyse" },
  { s: "BAC", n: "Bank of America Corp", r: "nyse" },
  { s: "WFC", n: "Wells Fargo & Co", r: "nyse" },
  { s: "GS", n: "Goldman Sachs Group", r: "nyse" },
  { s: "MS", n: "Morgan Stanley", r: "nyse" },
  { s: "C", n: "Citigroup Inc", r: "nyse" },
  { s: "BLK", n: "BlackRock Inc", r: "nyse" },
  { s: "AXP", n: "American Express Co", r: "nyse" },
  { s: "UNH", n: "UnitedHealth Group", r: "nyse" },
  { s: "JNJ", n: "Johnson & Johnson", r: "nyse" },
  { s: "MRK", n: "Merck & Co", r: "nyse" },
  { s: "ABBV", n: "AbbVie Inc", r: "nyse" },
  { s: "PFE", n: "Pfizer Inc", r: "nyse" },
  { s: "ABT", n: "Abbott Laboratories", r: "nyse" },
  { s: "WMT", n: "Walmart Inc", r: "nyse" },
  { s: "PG", n: "Procter & Gamble Co", r: "nyse" },
  { s: "KO", n: "Coca-Cola Co", r: "nyse" },
  { s: "PEP", n: "PepsiCo Inc", r: "nyse" },
  { s: "PM", n: "Philip Morris Intl", r: "nyse" },
  { s: "NKE", n: "Nike Inc", r: "nyse" },
  { s: "MCD", n: "McDonald's Corp", r: "nyse" },
  { s: "DIS", n: "Walt Disney Co", r: "nyse" },
  { s: "HD", n: "Home Depot Inc", r: "nyse" },
  { s: "MA", n: "Mastercard Inc", r: "nyse" },
  { s: "V", n: "Visa Inc", r: "nyse" },
  { s: "XOM", n: "Exxon Mobil Corp", r: "nyse" },
  { s: "CVX", n: "Chevron Corp", r: "nyse" },
  { s: "COP", n: "ConocoPhillips", r: "nyse" },
  { s: "CAT", n: "Caterpillar Inc", r: "nyse" },
  { s: "GE", n: "GE Aerospace", r: "nyse" },
  { s: "BA", n: "Boeing Co", r: "nyse" },
  { s: "HON", n: "Honeywell Intl", r: "nyse" },
  { s: "UPS", n: "United Parcel Service", r: "nyse" },
  { s: "RTX", n: "RTX Corp", r: "nyse" },
  { s: "LMT", n: "Lockheed Martin", r: "nyse" },
  { s: "FDX", n: "FedEx Corp", r: "nyse" },
  { s: "VZ", n: "Verizon Communications", r: "nyse" },
  { s: "T", n: "AT&T Inc", r: "nyse" },
  { s: "IBM", n: "IBM Corp", r: "nyse" },
  { s: "NEE", n: "NextEra Energy", r: "nyse" },
  { s: "NEM", n: "Newmont Corp", r: "nyse" },
  { s: "DOW", n: "Dow Inc", r: "nyse" },
  // BSE
  ...INDIAN_SYMBOLS.map(s => ({ ...s, r: "bse" as const })),
  // NSE (same symbols, different exchange)
  ...INDIAN_SYMBOLS.map(s => ({ ...s, r: "nse" as const })),
];

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPrice(n: number | null | undefined, region = "nasdaq") {
  if (n == null || isNaN(n)) return "—";
  const sym = (region === "bse" || region === "nse") ? "₹" : "$";
  return sym + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtLarge(n: number | null | undefined, region = "nasdaq") {
  if (n == null || isNaN(n)) return "—";
  const sym = (region === "bse" || region === "nse") ? "₹" : "$";
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

// --- Symbol dropdown component ---
function SymbolDropdown({ value, onChange, region }: { value: string; onChange: (v: string) => void; region: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const filtered = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toUpperCase();
    const list = ALL_SYMBOLS.filter(s => s.r === region || region === "all");
    return list.filter(s => s.s.includes(q) || s.n.toUpperCase().includes(q)).slice(0, 10);
  }, [input, region]);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (sym: string) => {
    setInput(sym);
    onChange(sym);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[highlightIdx]) { e.preventDefault(); select(filtered[highlightIdx].s); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <input value={input} onChange={e => { setInput(e.target.value.toUpperCase()); setOpen(true); setHighlightIdx(0); }}
        onFocus={() => { if (filtered.length) setOpen(true); }}
        onKeyDown={handleKey}
        placeholder={`Symbol (e.g. ${value})`}
        style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 10px", fontSize: 12, fontFamily: "monospace", width: 120, outline: "none" }} />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, marginTop: 2, maxHeight: 240, overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {filtered.map((item, i) => (
            <div key={item.s} onClick={() => select(item.s)}
              onMouseEnter={() => setHighlightIdx(i)}
              style={{ padding: "6px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: i === highlightIdx ? `${C.green}15` : "transparent", borderBottom: "1px solid #111" }}>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "monospace" }}>{item.s}</span>
              <span style={{ color: "#666", fontSize: 9, marginLeft: 8 }}>{item.n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LearnEntry {
  question: string;
  answer: string;
  level: string;
  timestamp: number;
}

function loadLearnHistory(): LearnEntry[] {
  try {
    const raw = localStorage.getItem("exchangescope-learn-history");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLearnHistory(entries: LearnEntry[]): void {
  try { localStorage.setItem("exchangescope-learn-history", JSON.stringify(entries)); } catch {}
}

export default function ResearchLab() {
  const { region, regionMeta, defaultSymbol } = useRegion();
  const [activeTab, setActiveTab] = useState("company");
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [research, setResearch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [learnQuestion, setLearnQuestion] = useState("");
  const [learnAnswer, setLearnAnswer] = useState<any>(null);
  const [learnLevel, setLearnLevel] = useState<"simple" | "intermediate" | "expert">("simple");
  const [explainPending, setExplainPending] = useState(false);
  const [thesisSymbol, setThesisSymbol] = useState("");
  const [thesisType, setThesisType] = useState("bull");
  const [thesisResult, setThesisResult] = useState<any>(null);
  const [thesisPending, setThesisPending] = useState(false);
  const [learnHistory, setLearnHistory] = useState<LearnEntry[]>(loadLearnHistory);
  const [showHistory, setShowHistory] = useState(false);

  const api = useCallback((path: string) => `/api${path}${path.includes("?") ? "&" : "?"}region=${region}`, [region]);

  const fetchResearch = useCallback(async (sym: string) => {
    setLoading(true);
    try {
      const res = await fetch(api(`/research/company/${sym}`));
      if (res.ok) setResearch(await res.json());
    } catch {}
    setLoading(false);
  }, [region]);

  useEffect(() => {
    setSymbol(defaultSymbol);
    setThesisSymbol(defaultSymbol);
  }, [region]);

  useEffect(() => {
    if (activeTab === "company") fetchResearch(symbol);
  }, [activeTab, symbol, region]);

  const handleLearn = async () => {
    if (!learnQuestion.trim()) return;
    setExplainPending(true);
    try {
      const res = await fetch("/api/research/learn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: learnQuestion, level: learnLevel }),
      });
      if (res.ok) {
        const data = await res.json();
        setLearnAnswer(data);
        const entry: LearnEntry = { question: learnQuestion, answer: data.explanation, level: learnLevel, timestamp: Date.now() };
        const updated = [entry, ...learnHistory].slice(0, 50);
        setLearnHistory(updated);
        saveLearnHistory(updated);
      }
    } catch {}
    setExplainPending(false);
  };

  const handleThesis = async () => {
    if (!thesisSymbol.trim()) return;
    setThesisPending(true);
    try {
      const res = await fetch(api("/research/thesis"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: thesisSymbol.toUpperCase(), thesisType, data: {} }),
      });
      if (res.ok) setThesisResult(await res.json());
    } catch {}
    setThesisPending(false);
  };

  const restoreLearnEntry = (entry: LearnEntry) => {
    setLearnQuestion(entry.question);
    setLearnLevel(entry.level as any);
    setLearnAnswer({ explanation: entry.answer });
    setShowHistory(false);
  };

  const renderThesisContent = (thesis: any) => {
    if (!thesis) return null;

    // If AI returned a parsed JSON object with structured fields
    if (typeof thesis === "object" && thesis.thesis) {
      const t = thesis;
      return (
        <div>
          <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8, marginBottom: 14, whiteSpace: "pre-wrap" }}>{t.thesis}</div>

          {t.rationale && t.rationale.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.purple, letterSpacing: "0.1em", marginBottom: 6 }}>RATIONALE</div>
              {t.rationale.map((r: string, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${C.purple}40` }}>{r}</div>
              ))}
            </div>
          )}

          {t.catalysts && t.catalysts.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.green, letterSpacing: "0.1em", marginBottom: 6 }}>CATALYSTS</div>
              {t.catalysts.map((c: string, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${C.green}40` }}>{c}</div>
              ))}
            </div>
          )}

          {t.risks && t.risks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.red, letterSpacing: "0.1em", marginBottom: 6 }}>RISKS</div>
              {t.risks.map((r: string, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${C.red}40` }}>{r}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#666" }}>
            {t.timeframe && <span>TIMEFRAME: {t.timeframe}</span>}
            {t.conviction && (
              <span>CONVICTION: <span style={{ color: t.conviction === "high" ? C.green : t.conviction === "medium" ? C.orange : C.red }}>{t.conviction.toUpperCase()}</span></span>
            )}
          </div>
        </div>
      );
    }

    // Fallback: show raw text
    return <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{typeof thesis === "string" ? thesis : JSON.stringify(thesis, null, 2)}</div>;
  };

  const renderCompanyResearch = () => (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <SymbolDropdown value={symbol} onChange={setSymbol} region={region} />
        <button onClick={() => fetchResearch(symbol)} disabled={loading} style={{
          padding: "6px 14px", background: `${C.green}10`, border: `1px solid ${C.green}`, borderRadius: 4,
          color: C.green, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em",
        }}>{loading ? "LOADING..." : "RESEARCH"}</button>
        <span style={{ fontSize: 9, color: "#555" }}>{regionMeta.exchange}</span>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div style={{ color: "#444", fontSize: 10 }}>Generating research report...</div>
        ) : research ? (
          <motion.div key={`${symbol}-${region}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {research.fundamentals && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{research.fundamentals.companyName ?? symbol}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{research.fundamentals.sector} · {research.fundamentals.industry} · {regionMeta.exchange}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {research.fundamentals.sector && badge(research.fundamentals.sector.toUpperCase(), C.blue)}
                    {research.fundamentals.peRatio && <span style={{ fontSize: 11, color: "#aaa" }}>P/E: {fmt(research.fundamentals.peRatio)}</span>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    ["Market Cap", fmtLarge(research.fundamentals.marketCap, region)],
                    ["Forward P/E", research.fundamentals.forwardPe != null ? fmt(research.fundamentals.forwardPe) : "—"],
                    ["EPS", fmtPrice(research.fundamentals.eps, region)],
                    ["Revenue", fmtLarge(research.fundamentals.revenue, region)],
                    ["Revenue Growth", research.fundamentals.revenueGrowth != null ? (research.fundamentals.revenueGrowth * 100).toFixed(1) + "%" : "—"],
                    ["Profit Margin", research.fundamentals.profitMargin != null ? (research.fundamentals.profitMargin * 100).toFixed(1) + "%" : "—"],
                    ["Beta", research.fundamentals.beta != null ? fmt(research.fundamentals.beta) : "—"],
                    ["D/E", research.fundamentals.debtToEquity != null ? fmt(research.fundamentals.debtToEquity) : "—"],
                    ["Dividend Yield", research.fundamentals.dividendYield != null ? (research.fundamentals.dividendYield * 100).toFixed(2) + "%" : "—"],
                    ["Free Cash Flow", fmtLarge(research.fundamentals.freeCashFlow, region)],
                    ["Insider Own.", research.fundamentals.insiderOwnership != null ? (research.fundamentals.insiderOwnership * 100).toFixed(1) + "%" : "—"],
                    ["Inst. Own.", research.fundamentals.institutionalOwnership != null ? (research.fundamentals.institutionalOwnership * 100).toFixed(1) + "%" : "—"],
                  ].map(([label, value]) => (
                    <div key={label as string} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 4, padding: "8px 10px" }}>
                      <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>{label as string}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }} className="num">{value as string}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {research.aiAnalysis && (
              <div style={{ background: `linear-gradient(135deg, ${C.card}, #0f1a14)`, border: `1px solid ${C.green}30`, borderRadius: 6, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.green, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>AI RESEARCH ANALYSIS · GROQ LLAMA 3.3</div>
                <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{(research.aiAnalysis.analysis || "").replace(/\*\*/g, "")}</div>
              </div>
            )}

            {research.news && research.news.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>RECENT NEWS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {research.news.slice(0, 10).map((item: any, i: number) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #111", textDecoration: "none" }}>
                      <span style={{ fontSize: 11, color: "#ccc", flex: 1 }}>{item.headline}</span>
                      <span style={{ fontSize: 9, color: "#555", minWidth: 80, textAlign: "right" }}>{item.source?.toUpperCase()}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {research.analystData && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>ANALYST CONSENSUS</div>
                {research.analystData.trends && research.analystData.trends.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {research.analystData.trends.slice(0, 4).map((t: any, i: number) => (
                      <div key={i} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 4, padding: "6px 10px", fontSize: 10 }}>
                        <div style={{ color: "#555", marginBottom: 2 }}>{t.period}</div>
                        <span style={{ color: C.green }}>B: {t.strongBuy + t.buy} </span>
                        <span style={{ color: C.orange }}>H: {t.hold} </span>
                        <span style={{ color: C.red }}>S: {t.strongSell + t.sell}</span>
                      </div>
                    ))}
                  </div>
                )}
                {research.analystData.ratings && research.analystData.ratings.slice(0, 10).map((r: any, i: number) => {
                  const ac = r.action === "upgrade" ? C.green : r.action === "downgrade" ? C.red : C.blue;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #111", fontSize: 10 }}>
                      <span style={{ color: "#888" }}>{r.firm}</span>
                      <span>{badge(r.action.toUpperCase(), ac)}</span>
                      <span style={{ color: "#aaa" }}>{r.ratingFrom ? `${r.ratingFrom} → ` : ""}{r.ratingTo}</span>
                      <span style={{ color: C.green }}>{r.targetTo ? fmtPrice(r.targetTo, region) : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <div style={{ color: "#555", fontSize: 11 }}>Enter a symbol and click Research to generate a comprehensive report</div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderThesis = () => (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <SymbolDropdown value={thesisSymbol} onChange={setThesisSymbol} region={region} />
        <select value={thesisType} onChange={e => setThesisType(e.target.value)} style={{
          background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 10px", fontSize: 11, fontFamily: "monospace", outline: "none",
        }}>
          <option value="bull">Bull Case</option>
          <option value="bear">Bear Case</option>
          <option value="balanced">Balanced</option>
        </select>
        <button onClick={handleThesis} disabled={thesisPending || !thesisSymbol} style={{
          padding: "6px 14px", background: `${C.purple}15`, border: `1px solid ${C.purple}`, borderRadius: 4,
          color: C.purple, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em",
        }}>{thesisPending ? "GENERATING..." : "GENERATE THESIS"}</button>
        <span style={{ fontSize: 9, color: "#555" }}>{regionMeta.exchange}</span>
      </div>

      <AnimatePresence>
        {thesisResult && (
          <motion.div key={`${thesisResult.symbol}-${thesisResult.thesisType}-${region}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{
            background: `linear-gradient(135deg, ${C.card}, #1a0f2a)`, border: `1px solid ${C.purple}30`, borderRadius: 6, padding: 18,
          }}>
            <div style={{ fontSize: 9, color: C.purple, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
              {thesisResult.symbol} · {thesisResult.thesisType?.toUpperCase()} THESIS · {regionMeta.exchange} · GROQ
            </div>
            {renderThesisContent(thesisResult.thesis?.thesis ?? thesisResult.thesis)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderLearn = () => (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", fontWeight: 700 }}>AI LEARNING ASSISTANT · ASK ANYTHING ABOUT FINANCE</div>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            padding: "3px 8px", background: showHistory ? `${C.blue}15` : "#111",
            border: `1px solid ${showHistory ? C.blue : "#2a2a2a"}`, borderRadius: 3,
            color: showHistory ? C.blue : "#666", cursor: "pointer", fontSize: 9, fontFamily: "monospace",
          }}>HISTORY ({learnHistory.length})</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {(["simple", "intermediate", "expert"] as const).map(l => (
            <button key={l} onClick={() => setLearnLevel(l)} style={{
              padding: "4px 10px", background: learnLevel === l ? `${C.blue}15` : "#111",
              border: `1px solid ${learnLevel === l ? C.blue : "#2a2a2a"}`, borderRadius: 3,
              color: learnLevel === l ? C.blue : "#666", cursor: "pointer", fontSize: 9, fontFamily: "monospace", textTransform: "capitalize",
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <textarea
            value={learnQuestion} onChange={e => setLearnQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleLearn())}
            placeholder="Ask about PE ratios, market cycles, technical analysis, options trading..."
            style={{
              background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff",
              padding: "8px 12px", fontSize: 12, fontFamily: "monospace", outline: "none", resize: "vertical", minHeight: 40,
            }}
          />
          <button onClick={handleLearn} disabled={explainPending || !learnQuestion.trim()} style={{
            padding: "8px 16px", background: `${C.blue}10`, border: `1px solid ${C.blue}`,
            borderRadius: 4, color: C.blue, cursor: "pointer", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.08em",
            alignSelf: "flex-start",
          }}>{explainPending ? "..." : "ASK"}</button>
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            "What is a PE ratio?",
            "How do interest rates affect stocks?",
            "Explain options trading",
            "What is market cap?",
            "How does inflation impact markets?",
            "What is technical analysis?",
          ].map(q => (
            <button key={q} onClick={() => { setLearnQuestion(q); }} style={{
              padding: "3px 8px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 3,
              color: "#555", cursor: "pointer", fontSize: 9, fontFamily: "monospace",
            }}>{q}</button>
          ))}
        </div>

        <AnimatePresence>
          {learnAnswer && (
            <motion.div key={learnAnswer.timestamp ?? Date.now()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{
              marginTop: 14, background: "#0f1a2a", border: `1px solid ${C.blue}30`, borderRadius: 4, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: C.blue, letterSpacing: "0.1em" }}>LLAMA 3.3 · {learnLevel.toUpperCase()}</div>
                <div style={{ fontSize: 9, color: "#555" }}>{new Date().toLocaleDateString()}</div>
              </div>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 8, fontStyle: "italic" }}>Q: {learnQuestion}</div>
              <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8 }}>{learnAnswer.explanation}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 280 }} exit={{ opacity: 0, width: 0 }} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", flexShrink: 0,
          }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #1a1a1a", fontSize: 9, color: "#555", letterSpacing: "0.1em", fontWeight: 700 }}>HISTORY ({learnHistory.length})</div>
            <div style={{ maxHeight: 400, overflow: "auto" }}>
              {learnHistory.length === 0 ? (
                <div style={{ padding: 14, fontSize: 10, color: "#555", textAlign: "center" }}>No conversations yet</div>
              ) : (
                learnHistory.map((entry, i) => (
                  <div key={entry.timestamp + i} onClick={() => restoreLearnEntry(entry)} style={{
                    padding: "8px 12px", borderBottom: "1px solid #111", cursor: "pointer",
                    transition: "background 0.15s",
                  }} onMouseEnter={e => e.currentTarget.style.background = "#151515"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>{entry.question}</div>
                    <div style={{ fontSize: 8, color: "#555", display: "flex", gap: 6 }}>
                      <span>{entry.level.toUpperCase()}</span>
                      <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const TABS = [
    { id: "company", label: "Company Research" },
    { id: "thesis", label: "Thesis Builder" },
    { id: "learn", label: "Learning Assistant" },
  ];

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>RESEARCH LAB</h1>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>{regionMeta.exchange} · {regionMeta.currency} · FUNDAMENTAL RESEARCH · AI-ENHANCED ANALYSIS · EDUCATION</div>
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
          {activeTab === "company" && renderCompanyResearch()}
          {activeTab === "thesis" && renderThesis()}
          {activeTab === "learn" && renderLearn()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
