import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListStocks, useGetStockHistory } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ExplainTip, InfoBox } from "@/components/Explain";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

const SECTORS = ["All", "Technology", "Financials", "Healthcare", "Consumer", "Consumer Staples", "Energy", "Industrials", "Materials", "Utilities", "Real Estate", "Communications"];

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBig(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function PriceChart({ symbol }: { symbol: string }) {
  const { data, isLoading } = useGetStockHistory(symbol, "1d", { query: { staleTime: 30000 } });
  if (isLoading) return <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 11 }}>Loading chart...</div>;
  if (!data?.length) return null;
  const first = data[0]?.close ?? 0;
  const isUp = (data[data.length - 1]?.close ?? 0) >= first;
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? C.green : C.red} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isUp ? C.green : C.red} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis domain={["auto","auto"]} hide />
          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 10 }}
            formatter={(v: number) => [`$${fmt(v)}`, "Close"]}
            labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
          <Area type="monotone" dataKey="close" stroke={isUp ? C.green : C.red} strokeWidth={1.5} fill="url(#cg)" dot={false} animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MarketOverview() {
  const { data: stocks, isLoading } = useListStocks({ query: { refetchInterval: 2000 } });
  const [selected, setSelected] = useState("AAPL");
  const [sector, setSector] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"changePercent" | "volume" | "price" | "marketCap">("changePercent");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const filtered = useMemo(() => {
    if (!stocks) return [];
    return stocks
      .filter(s => (sector === "All" || (s as any).sector === sector || (sector === "Consumer" && ((s as any).sector === "Consumer" || (s as any).sector === "Consumer Discretionary")))
        && (!search || s.symbol.includes(search.toUpperCase()) || s.name?.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => ((a as any)[sortBy] ?? 0) < ((b as any)[sortBy] ?? 0) ? sortDir : -sortDir);
  }, [stocks, sector, search, sortBy, sortDir]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const topGainer = useMemo(() => stocks ? [...stocks].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0] : null, [stocks]);
  const topLoser  = useMemo(() => stocks ? [...stocks].sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))[0] : null, [stocks]);
  const topVolume = useMemo(() => stocks ? [...stocks].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0] : null, [stocks]);
  const topMktCap = useMemo(() => stocks ? [...stocks].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))[0] : null, [stocks]);

  const selectedStock = stocks?.find(s => s.symbol === selected);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortBy(col); setSortDir(-1); }
    setPage(0);
  }

  return (
    <div style={{ padding: "20px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>MARKET OVERVIEW</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
            LIVE · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ·&nbsp;
            <span style={{ color: "#00FF88" }}>{stocks?.length ?? 0} COMPANIES</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ExplainTip
            term="PRICE DISCOVERY"
            explanation="The process by which stock prices are determined through the interaction of millions of buy and sell orders. There is no central authority setting prices — they emerge from supply and demand in the order book."
          />
          <ExplainTip
            term="BID-ASK SPREAD"
            explanation="The difference between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask). Tight spreads = liquid market. Wide spreads = illiquid market or high volatility."
          />
        </div>
      </div>

      {/* Market movers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { label: "TOP GAINER", stock: topGainer,  color: C.green },
          { label: "TOP LOSER",  stock: topLoser,   color: C.red },
          { label: "HIGH VOLUME",stock: topVolume,  color: "#FFB800" },
          { label: "LARGEST CAP",stock: topMktCap,  color: "#00BFFF" },
        ].map(({ label, stock, color }) => (
          <motion.div key={label} whileHover={{ scale: 1.02 }} onClick={() => stock && setSelected(stock.symbol)}
            style={{ background: C.card, border: `1px solid ${color}20`, borderRadius: 6, padding: "12px 14px", cursor: "pointer" }}
          >
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.12em", marginBottom: 5 }}>{label}</div>
            {stock ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, color }}>{stock.symbol}</div>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{stock.name?.split(" ").slice(0, 2).join(" ")}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }} className="num">${fmt(stock.price)}</span>
                  <span style={{ fontSize: 11, color, fontWeight: 600 }} className="num">
                    {label === "HIGH VOLUME" ? `${((stock.volume ?? 0) / 1e6).toFixed(1)}M` :
                     label === "LARGEST CAP" ? fmtBig(stock.marketCap ?? 0) :
                     `${(stock.changePercent ?? 0) >= 0 ? "+" : ""}${fmt(stock.changePercent)}%`}
                  </span>
                </div>
              </>
            ) : <div style={{ height: 48, background: "#111", borderRadius: 4 }} />}
          </motion.div>
        ))}
      </div>

      {/* Main layout: chart + table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

        {/* Left: Table */}
        <div>
          {/* Filters row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search symbol or name..."
              style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 10px", fontSize: 11, fontFamily: "monospace", width: 200 }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SECTORS.map(s => (
                <button key={s} onClick={() => { setSector(s); setPage(0); }} style={{
                  padding: "4px 8px", fontSize: 9, fontFamily: "monospace",
                  background: sector === s ? "rgba(0,255,136,0.1)" : "#111",
                  border: `1px solid ${sector === s ? "#00FF88" : "#2a2a2a"}`,
                  borderRadius: 3, color: sector === s ? "#00FF88" : "#666",
                  cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap",
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#555", marginLeft: "auto" }}>
              {filtered.length} results
            </span>
          </div>

          {/* Table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 90px 110px 100px 70px", padding: "7px 14px", fontSize: 9, color: "#444", letterSpacing: "0.1em", borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: "SYMBOL", key: null },
                { label: "NAME", key: null },
                { label: "PRICE", key: "price" as const },
                { label: "CHANGE %", key: "changePercent" as const },
                { label: "VOLUME", key: "volume" as const },
                { label: "MKT CAP", key: "marketCap" as const },
                { label: "P/E", key: null },
              ].map(({ label, key }) => (
                <div key={label} onClick={() => key && toggleSort(key)} style={{ cursor: key ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3 }}>
                  {label}
                  {key && sortBy === key && <span style={{ color: "#00FF88" }}>{sortDir === -1 ? "↓" : "↑"}</span>}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 12 }}>Loading {stocks?.length ?? 0} companies...</div>
            ) : (
              <AnimatePresence>
                {paginated.map((s, i) => {
                  const isUp = (s.changePercent ?? 0) >= 0;
                  const isSel = s.symbol === selected;
                  return (
                    <motion.div
                      key={s.symbol}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => setSelected(s.symbol)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 90px 90px 110px 100px 70px",
                        padding: "9px 14px",
                        fontSize: 11,
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        background: isSel ? "rgba(0,255,136,0.04)" : "transparent",
                        borderLeft: isSel ? "2px solid #00FF88" : "2px solid transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: isSel ? C.green : "#fff", fontSize: 12 }}>{s.symbol}</div>
                      <div style={{ color: "#666", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{s.name}</div>
                      <div className="num" style={{ color: "#fff", fontWeight: 600 }}>${fmt(s.price)}</div>
                      <div className="num" style={{ color: isUp ? C.green : C.red, fontWeight: 600 }}>
                        {isUp ? "+" : ""}{fmt(s.changePercent)}%
                      </div>
                      <div className="num" style={{ color: "#777", fontSize: 10 }}>{(s.volume ?? 0).toLocaleString()}</div>
                      <div className="num" style={{ color: "#777", fontSize: 10 }}>{fmtBig(s.marketCap ?? 0)}</div>
                      <div className="num" style={{ color: (s.peRatio ?? 0) > 0 ? "#777" : "#555", fontSize: 10 }}>
                        {(s.peRatio ?? 0) > 0 ? fmt(s.peRatio, 1) : "—"}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                <button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}
                  style={{ padding: "3px 10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 3, color: page === 0 ? "#333" : "#888", cursor: "pointer", fontSize: 10 }}>
                  PREV
                </button>
                <span style={{ fontSize: 10, color: "#555" }}>
                  {page + 1} / {totalPages} · {filtered.length} companies
                </span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page === totalPages - 1}
                  style={{ padding: "3px 10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 3, color: page === totalPages - 1 ? "#333" : "#888", cursor: "pointer", fontSize: 10 }}>
                  NEXT
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: selected stock detail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedStock && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{selectedStock.symbol}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{selectedStock.name}</div>
                    <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.08em", marginTop: 2 }}>{(selectedStock as any).sector}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }} className="num">
                      ${fmt(selectedStock.price)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: (selectedStock.changePercent ?? 0) >= 0 ? C.green : C.red }} className="num">
                      {(selectedStock.changePercent ?? 0) >= 0 ? "+" : ""}{fmt(selectedStock.changePercent)}%
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 0 8px" }}>
                <PriceChart symbol={selected} />
              </div>

              <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "VOLUME", val: (selectedStock.volume ?? 0).toLocaleString() },
                  { label: "MKT CAP", val: fmtBig(selectedStock.marketCap ?? 0) },
                  { label: "52W HIGH", val: `$${fmt(selectedStock.week52High)}` },
                  { label: "52W LOW",  val: `$${fmt(selectedStock.week52Low)}` },
                  { label: "P/E RATIO", val: (selectedStock.peRatio ?? 0) > 0 ? fmt(selectedStock.peRatio, 1) : "N/A" },
                  { label: "DAY CHANGE", val: `$${fmt(selectedStock.change)}` },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }} className="num">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info boxes */}
          <InfoBox title="WHAT IS A STOCK?" color="#00FF88" collapsible>
            A stock (or share) represents a small ownership stake in a company. When you buy 1 share of Apple,
            you own 1/15,000,000,000th of the company. Companies issue stock to raise capital for growth.
          </InfoBox>

          <InfoBox title="WHAT IS MARKET CAP?" color="#00BFFF" collapsible>
            Market capitalization = share price × total shares outstanding. It measures how much the public
            currently values a company. Apple at $3.25 trillion has more value than many countries' entire economies.
          </InfoBox>

          <InfoBox title="WHAT IS P/E RATIO?" color="#FFB800" collapsible>
            Price-to-Earnings ratio = share price ÷ earnings per share. A P/E of 25 means investors pay $25
            for every $1 of profit. High P/E = high growth expectations. Negative P/E = company is losing money.
          </InfoBox>

          {/* Sector breakdown */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 10 }}>SECTORS</div>
            {SECTORS.filter(s => s !== "All").map(sec => {
              const count = stocks?.filter((s: any) => s.sector === sec || (sec === "Consumer" && s.sector === "Consumer")).length ?? 0;
              const avgChange = stocks?.filter((s: any) => s.sector === sec).reduce((sum, s) => sum + (s.changePercent ?? 0), 0) / Math.max(count, 1);
              const isUp = avgChange >= 0;
              return (
                <div key={sec} onClick={() => { setSector(sec); setPage(0); }} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "4px 0", cursor: "pointer", borderBottom: "1px solid #111",
                }}>
                  <span style={{ fontSize: 10, color: sector === sec ? "#00FF88" : "#777" }}>{sec}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#444" }}>{count}</span>
                    <span style={{ fontSize: 10, color: isUp ? C.green : C.red, fontWeight: 600 }} className="num">
                      {isUp ? "+" : ""}{fmt(avgChange)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
