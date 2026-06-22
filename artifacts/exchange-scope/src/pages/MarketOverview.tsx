import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useRegion } from "@/context/RegionContext";
import { ExplainTip, InfoBox } from "@/components/Explain";
import { StockChart } from "@/components/StockChart";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBig(n: number | null | undefined, cs = "$") {
  if (n == null || n === 0) return "—";
  if (n >= 1e12) return `${cs}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${cs}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${cs}${(n / 1e6).toFixed(2)}M`;
  return `${cs}${n.toFixed(0)}`;
}

function useMarketOverview(exchange: string) {
  return useQuery({
    queryKey: ["market-overview", exchange],
    queryFn: async () => {
      const res = await fetch("/api/market/overview");
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
    refetchInterval: 15_000,
  });
}

function useCompanies(params: {
  page: number;
  pageSize: number;
  search: string;
  sector: string;
  sortBy: string;
  sortDir: string;
  exchange: string;
}) {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.search,
    sector: params.sector,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    exchange: params.exchange,
  });
  return useQuery({
    queryKey: ["companies", qs.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/companies?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
}

function useSectors(exchange: string) {
  return useQuery({
    queryKey: ["sectors", exchange],
    queryFn: async () => {
      const res = await fetch(`/api/companies/sectors?exchange=${exchange}`);
      if (!res.ok) throw new Error("Failed to fetch sectors");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export default function MarketOverview() {
  const { region, regionMeta, defaultSymbol, isSwitching } = useRegion();
  const cs = regionMeta.currencySymbol;
  const [selected, setSelected] = useState(defaultSymbol);
  const [sector, setSector] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("marketCap");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => { setSelected(defaultSymbol); }, [defaultSymbol]);
  useEffect(() => { setPage(0); setSector(""); setSearch(""); setDebouncedSearch(""); }, [region]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(0); }, [debouncedSearch, sector, sortBy, sortDir, pageSize]);

  const { data: overview, isLoading: overviewLoading } = useMarketOverview(region);
  const { data: sectorsData } = useSectors(region);
  const { data: companyData, isLoading: companiesLoading, isFetching: companiesFetching } = useCompanies({
    page,
    pageSize,
    search: debouncedSearch,
    sector,
    sortBy,
    sortDir,
    exchange: region,
  });

  const SECTORS = sectorsData || [];
  const companies = companyData?.data || [];
  const total = companyData?.total || 0;
  const totalPages = companyData?.totalPages || 1;

  const selectedStock = useMemo(() => {
    // 1. Check current page results
    const fromPage = companies.find((s: any) => s.symbol === selected);
    if (fromPage) return fromPage;

    // 2. Check market overview highlight cards (top gainers/losers/active/largest caps)
    //    These are always loaded and include the stocks shown in the header cards.
    const highlights: any[] = [
      ...(overview?.topGainers   ?? []),
      ...(overview?.topLosers    ?? []),
      ...(overview?.mostActive   ?? []),
      ...(overview?.largestCaps  ?? []),
    ];
    const fromHighlights = highlights.find((s: any) => s.symbol === selected);
    if (fromHighlights) return fromHighlights;

    // 3. Fall back to first stock on page
    return companies[0] ?? null;
  }, [companies, selected, overview]);

  const exchangeColor = region === "nasdaq" ? C.green : region === "nyse" ? "#00FF88" : "#FF9933";

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(0);
  }

  return (
    <div style={{ padding: "20px 28px", minHeight: "100vh", position: "relative" }}>
      {isSwitching && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: exchangeColor, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
              SWITCHING TO {regionMeta.exchange}
            </div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em" }}>Loading market data…</div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>MARKET OVERVIEW</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: exchangeColor, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: exchangeColor, boxShadow: `0 0 6px ${exchangeColor}` }} />
              {regionMeta.exchange}
            </span>
            <span>·</span>
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
            <span>·</span>
            <span style={{ color: exchangeColor }}>
              {(overview?.totalCompanies ?? companyData?.total ?? 0).toLocaleString()} COMPANIES
              {overview?.pricedCompanies != null && overview.pricedCompanies !== overview.totalCompanies &&
                <span style={{ color: "#555", fontWeight: 400 }}> · {overview.pricedCompanies.toLocaleString()} PRICED</span>
              }
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ExplainTip term="PRICE DISCOVERY" explanation="The process by which stock prices are determined through the interaction of millions of buy and sell orders." />
          <ExplainTip term="BID-ASK SPREAD" explanation="The difference between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask)." />
        </div>
      </div>

      {/* Market movers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { label: "TOP GAINER", stock: overview?.topGainers?.[0],  color: C.green, valKey: "changePercent", valFmt: (v: number) => `${v >= 0 ? "+" : ""}${fmt(v)}%` },
          { label: "TOP LOSER",  stock: overview?.topLosers?.[0],   color: C.red,   valKey: "changePercent", valFmt: (v: number) => `${v >= 0 ? "+" : ""}${fmt(v)}%` },
          { label: "HIGH VOLUME",stock: overview?.mostActive?.[0],  color: "#FFB800", valKey: "volume", valFmt: (v: number) => `${(v / 1e6).toFixed(1)}M` },
          { label: "LARGEST CAP",stock: overview?.largestCaps?.[0], color: "#00BFFF", valKey: "marketCap", valFmt: (v: number) => fmtBig(v, cs) },
        ].map(({ label, stock, color, valKey, valFmt }) => (
          <motion.div key={label} whileHover={{ scale: 1.02 }} onClick={() => stock && setSelected(stock.symbol)}
            style={{ background: C.card, border: `1px solid ${color}20`, borderRadius: 6, padding: "12px 14px", cursor: "pointer" }}
          >
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.12em", marginBottom: 5 }}>{label}</div>
            {stock ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, color }}>{stock.symbol}</div>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{(stock.name || "").split(" ").slice(0, 2).join(" ")}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }} className="num">{cs}{fmt(stock.price)}</span>
                  <span style={{ fontSize: 11, color, fontWeight: 600 }} className="num">
                    {valFmt(stock[valKey] ?? 0)}
                  </span>
                </div>
              </>
            ) : <div style={{ height: 48, background: "#111", borderRadius: 4 }} />}
          </motion.div>
        ))}
      </div>

      {/* Breadth stats */}
      {(() => {
        const priced = overview?.pricedCompanies ?? overview?.advancing ?? 0;
        const base = priced || 1;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "ADVANCING", val: overview?.advancing ?? 0, pct: Math.round(((overview?.advancing ?? 0) / base) * 100), color: C.green },
              { label: "DECLINING", val: overview?.declining ?? 0, pct: Math.round(((overview?.declining ?? 0) / base) * 100), color: C.red },
              { label: "UNCHANGED", val: overview?.unchanged ?? 0, pct: Math.round(((overview?.unchanged ?? 0) / base) * 100), color: "#888" },
              { label: "TOTAL", val: overview?.totalCompanies ?? 0, pct: 100, color: "#fff" },
            ].map(({ label, val, pct, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{val.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: "#555" }}>{pct}% of market</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        {/* Left: Table */}
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search symbol or name..."
              style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#fff", padding: "6px 10px", fontSize: 11, fontFamily: "monospace", width: 200 }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button onClick={() => { setSector(""); setPage(0); }} style={{
                padding: "4px 8px", fontSize: 9, fontFamily: "monospace",
                background: sector === "" ? "rgba(0,255,136,0.1)" : "#111",
                border: `1px solid ${sector === "" ? "#00FF88" : "#2a2a2a"}`,
                borderRadius: 3, color: sector === "" ? "#00FF88" : "#666",
                cursor: "pointer", letterSpacing: "0.05em",
              }}>ALL</button>
              {SECTORS.slice(0, 20).map((s: string) => (
                <button key={s} onClick={() => { setSector(s); setPage(0); }} style={{
                  padding: "4px 8px", fontSize: 9, fontFamily: "monospace",
                  background: sector === s ? "rgba(0,255,136,0.1)" : "#111",
                  border: `1px solid ${sector === s ? "#00FF88" : "#2a2a2a"}`,
                  borderRadius: 3, color: sector === s ? "#00FF88" : "#666",
                  cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap",
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#555", marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              {total.toLocaleString()} results
              {companiesFetching && !companiesLoading && (
                <span style={{ fontSize: 8, color: "#333", letterSpacing: "0.08em" }}>UPDATING</span>
              )}
            </span>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 90px 110px 100px 70px", padding: "7px 14px", fontSize: 9, color: "#444", letterSpacing: "0.1em", borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: "SYMBOL", key: "symbol" },
                { label: "NAME", key: null },
                { label: "PRICE", key: "price" },
                { label: "CHANGE %", key: "changePercent" },
                { label: "VOLUME", key: "volume" },
                { label: "MKT CAP", key: "marketCap" },
                { label: "P/E", key: null },
              ].map(({ label, key }) => (
                <div key={label} onClick={() => key && toggleSort(key)} style={{ cursor: key ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3 }}>
                  {label}
                  {key && sortBy === key && <span style={{ color: "#00FF88" }}>{sortDir === "desc" ? "↓" : "↑"}</span>}
                </div>
              ))}
            </div>

            {companiesLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 12 }}>Loading companies...</div>
            ) : (
              <AnimatePresence>
                {companies.map((s: any, i: number) => {
                  const isUp = (s.changePercent ?? 0) >= 0;
                  const isSel = s.symbol === selected;
                  return (
                    <motion.div key={s.id || s.symbol} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.2) }}
                      onClick={() => setSelected(s.symbol)}
                      style={{
                        display: "grid", gridTemplateColumns: "80px 1fr 90px 90px 110px 100px 70px",
                        padding: "9px 14px", fontSize: 11, borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer", background: isSel ? "rgba(0,255,136,0.04)" : "transparent",
                        borderLeft: isSel ? "2px solid #00FF88" : "2px solid transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: isSel ? C.green : "#fff", fontSize: 12 }}>{s.symbol}</div>
                      <div style={{ color: "#666", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{s.name}</div>
                      <div className="num" style={{ color: "#fff", fontWeight: 600 }}>{cs}{fmt(s.price)}</div>
                      <div className="num" style={{ color: isUp ? C.green : C.red, fontWeight: 600 }}>{isUp ? "+" : ""}{fmt(s.changePercent)}%</div>
                      <div className="num" style={{ color: "#777", fontSize: 10 }}>{(s.volume ?? 0).toLocaleString()}</div>
                      <div className="num" style={{ color: "#777", fontSize: 10 }}>{fmtBig(s.marketCap ?? 0, cs)}</div>
                      <div className="num" style={{ color: (s.peRatio ?? 0) > 0 ? "#777" : "#555", fontSize: 10 }}>{(s.peRatio ?? 0) > 0 ? fmt(s.peRatio, 1) : "—"}</div>
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
                  {page + 1} / {totalPages} · {total.toLocaleString()} companies
                </span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page === totalPages - 1}
                  style={{ padding: "3px 10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 3, color: page === totalPages - 1 ? "#333" : "#888", cursor: "pointer", fontSize: 10 }}>
                  NEXT
                </button>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                  style={{ marginLeft: 8, padding: "3px 6px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 3, color: "#888", fontSize: 10, cursor: "pointer" }}>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
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
                    <div style={{ fontSize: 20, fontWeight: 800, color: exchangeColor }}>{selectedStock.symbol}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{selectedStock.name}</div>
                    <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.08em", marginTop: 2 }}>{selectedStock.sector || selectedStock.exchange}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }} className="num">{cs}{fmt(selectedStock.price)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: (selectedStock.changePercent ?? 0) >= 0 ? C.green : C.red }} className="num">
                      {(selectedStock.changePercent ?? 0) >= 0 ? "+" : ""}{fmt(selectedStock.changePercent)}%
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "0 8px 8px" }}>
                <StockChart symbol={selected} />
              </div>
              <div style={{ padding: "0 14px 10px", display: "flex", gap: 8 }}>
                <Link href={`/orderbook?symbol=${selected}`}>
                  <button type="button" style={{ flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: "rgba(0,255,136,0.08)", border: "1px solid #00FF8840", borderRadius: 4, color: "#00FF88", cursor: "pointer" }}>VIEW ORDER BOOK</button>
                </Link>
                <Link href={`/pipeline?symbol=${selected}`}>
                  <button type="button" style={{ flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, color: "#888", cursor: "pointer" }}>SUBMIT ORDER</button>
                </Link>
              </div>
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "VOLUME", val: (selectedStock.volume ?? 0).toLocaleString() },
                  { label: "MKT CAP", val: fmtBig(selectedStock.marketCap ?? 0, cs) },
                  { label: "52W HIGH", val: `${cs}${fmt(selectedStock.week52High)}` },
                  { label: "52W LOW",  val: `${cs}${fmt(selectedStock.week52Low)}` },
                  { label: "P/E RATIO", val: (selectedStock.peRatio ?? 0) > 0 ? fmt(selectedStock.peRatio, 1) : "N/A" },
                  { label: "DAY CHANGE", val: `${cs}${fmt(selectedStock.change)}` },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }} className="num">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <InfoBox title="WHAT IS A STOCK?" color="#00FF88" collapsible>A stock represents ownership in a company. When you buy shares, you own a fraction of that company.</InfoBox>
          <InfoBox title="WHAT IS MARKET CAP?" color="#00BFFF" collapsible>Market capitalization = share price × total shares outstanding. It measures the total value of a company.</InfoBox>
          <InfoBox title="WHAT IS P/E RATIO?" color="#FFB800" collapsible>Price-to-Earnings ratio = share price ÷ earnings per share. It shows how much investors pay for each dollar of profit.</InfoBox>

          {/* Sector breakdown */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 10 }}>SECTORS</div>
            {(overview?.sectorPerformance || []).slice(0, 25).map((sec: any) => {
              const isUp = sec.capWeighted >= 0;
              return (
                <div key={sec.sector} onClick={() => { setSector(sec.sector); setPage(0); }} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "4px 0", cursor: "pointer", borderBottom: "1px solid #111",
                }}>
                  <span style={{ fontSize: 10, color: sector === sec.sector ? "#00FF88" : "#777" }}>{sec.sector}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#444" }}>{sec.count}</span>
                    <span style={{ fontSize: 10, color: isUp ? C.green : C.red, fontWeight: 600 }} className="num">
                      {isUp ? "+" : ""}{fmt(sec.capWeighted)}%
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
