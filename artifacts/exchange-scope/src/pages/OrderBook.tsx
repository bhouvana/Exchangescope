import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useGetOrderBook, useListStocks, useListTrades } from "@workspace/api-client-react";
import { useRegion } from "@/context/RegionContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

interface Level { price: number; quantity: number; orderCount: number }

function DepthRow({
  level, maxQty, side, flash,
}: {
  level: Level; maxQty: number; side: "bid" | "ask"; flash: boolean;
}) {
  const pct = maxQty > 0 ? (level.quantity / maxQty) * 100 : 0;
  const color = side === "bid" ? C.green : C.red;
  return (
    <motion.div
      className={flash ? (side === "bid" ? "flash-green" : "flash-red") : ""}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        padding: "3px 12px",
        fontSize: 11,
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, bottom: 0,
          [side === "bid" ? "right" : "left"]: 0,
          width: `${pct}%`,
          background: side === "bid" ? "rgba(0,255,136,0.07)" : "rgba(255,68,68,0.07)",
          transition: "width 0.3s ease",
        }}
      />
      {side === "bid" ? (
        <>
          <span style={{ color: "#888" }} className="num">{level.orderCount}</span>
          <span style={{ color: "#ccc" }} className="num">{fmt(level.quantity, 0)}</span>
          <span style={{ color, fontWeight: 700 }} className="num">{fmt(level.price)}</span>
        </>
      ) : (
        <>
          <span style={{ color, fontWeight: 700 }} className="num">{fmt(level.price)}</span>
          <span style={{ color: "#ccc" }} className="num">{fmt(level.quantity, 0)}</span>
          <span style={{ color: "#888" }} className="num">{level.orderCount}</span>
        </>
      )}
    </motion.div>
  );
}

function DepthChart({ bids, asks, cs }: { bids: Level[]; asks: Level[]; cs?: string }) {
  const bData: { price: number; bid: number }[] = [];
  let cumBid = 0;
  [...bids].reverse().forEach(l => { cumBid += l.quantity; bData.push({ price: l.price, bid: cumBid }); });

  const aData: { price: number; ask: number }[] = [];
  let cumAsk = 0;
  asks.forEach(l => { cumAsk += l.quantity; aData.push({ price: l.price, ask: cumAsk }); });

  const combined = [
    ...bData.map(d => ({ price: d.price, bid: d.bid, ask: 0 })),
    ...aData.map(d => ({ price: d.price, bid: 0, ask: d.ask })),
  ].sort((a, b) => a.price - b.price);

  return (
    <div style={{ height: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={combined} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.green} stopOpacity={0.3}/>
              <stop offset="100%" stopColor={C.green} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.red} stopOpacity={0.3}/>
              <stop offset="100%" stopColor={C.red} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="price" tickFormatter={(v) => `${cs ?? "$"}${v.toFixed(0)}`} tick={{ fontSize: 9, fill: "#555" }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 10 }}
            formatter={(v: number, n: string) => [v.toLocaleString(), n === "bid" ? "Cum Bid" : "Cum Ask"]}
          />
          <Area type="stepAfter" dataKey="bid" stroke={C.green} strokeWidth={1} fill="url(#bidGrad)" dot={false} animationDuration={300} />
          <Area type="stepAfter" dataKey="ask" stroke={C.red}   strokeWidth={1} fill="url(#askGrad)" dot={false} animationDuration={300} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function getSymbolFromUrl(fallback = "AAPL"): string {
  return new URLSearchParams(window.location.search).get("symbol")?.toUpperCase() ?? fallback;
}

export default function OrderBook() {
  const [, setLocation] = useLocation();
  const { regionMeta, defaultSymbol } = useRegion();
  const cs = regionMeta.currencySymbol;
  const { data: stocks } = useListStocks({ query: { refetchInterval: 5000 } } as any) as any;
  const [symbol, setSymbolState] = useState(() => getSymbolFromUrl(defaultSymbol));
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const setSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    setSymbolState(upper);
    setLocation(`/orderbook?symbol=${upper}`);
    setPickerOpen(false);
    setSearch("");
  };

  useEffect(() => {
    setSymbolState(getSymbolFromUrl(defaultSymbol));
  }, [defaultSymbol]);

  useEffect(() => {
    const onPop = () => setSymbolState(getSymbolFromUrl(defaultSymbol));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [defaultSymbol]);

  const { data: ob, isLoading } = useGetOrderBook(symbol, { query: { refetchInterval: 800 } } as any);
  const { data: trades } = useListTrades({ symbol, limit: 20 } as any, { query: { refetchInterval: 1200 } } as any);

  const prevBids = useRef<Record<number, number>>({});
  const prevAsks = useRef<Record<number, number>>({});
  const [flashedBids, setFlashedBids] = useState<Set<number>>(new Set());
  const [flashedAsks, setFlashedAsks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!ob?.bids) return;
    const newFlash = new Set<number>();
    ob.bids.forEach((l: Level) => {
      const prev = prevBids.current[l.price];
      if (prev !== undefined && prev !== l.quantity) newFlash.add(l.price);
    });
    ob.bids.forEach((l: Level) => { prevBids.current[l.price] = l.quantity; });
    if (newFlash.size > 0) {
      setFlashedBids(newFlash);
      setTimeout(() => setFlashedBids(new Set()), 600);
    }
  }, [ob?.bids]);

  useEffect(() => {
    if (!ob?.asks) return;
    const newFlash = new Set<number>();
    ob.asks.forEach((l: Level) => {
      const prev = prevAsks.current[l.price];
      if (prev !== undefined && prev !== l.quantity) newFlash.add(l.price);
    });
    ob.asks.forEach((l: Level) => { prevAsks.current[l.price] = l.quantity; });
    if (newFlash.size > 0) {
      setFlashedAsks(newFlash);
      setTimeout(() => setFlashedAsks(new Set()), 600);
    }
  }, [ob?.asks]);

  const filteredStocks = useMemo(() => {
    if (!stocks) return [];
    const q = search.toUpperCase();
    return stocks
      .filter((s: any) => !q || s.symbol.includes(q) || s.name?.toUpperCase().includes(q))
      .slice(0, 50);
  }, [stocks, search]);

  const popular = useMemo(() => {
    if (!stocks) return [];
    return [...stocks].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 12);
  }, [stocks]);

  const selectedStock = stocks?.find((s: any) => s.symbol === symbol);
  const bids: Level[] = ob?.bids?.slice(0, 15) ?? [];
  const asks: Level[] = ob?.asks?.slice(0, 15) ?? [];
  const maxBidQty = Math.max(...bids.map(l => l.quantity), 1);
  const maxAskQty = Math.max(...asks.map(l => l.quantity), 1);

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread  = bestBid && bestAsk ? bestAsk - bestBid : null;
  const lastPrice = ob?.lastTradePrice ?? selectedStock?.price ?? 0;

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>ORDER BOOK</h1>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
                PRICE-TIME PRIORITY · LIVE · {stocks?.length ?? 0} COMPANIES
              </div>
            </div>
          </div>

          {/* Symbol picker */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setPickerOpen(o => !o)}
                style={{
                  padding: "8px 14px",
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: "monospace",
                  background: "rgba(0,255,136,0.1)",
                  border: "1px solid #00FF88",
                  borderRadius: 4,
                  color: "#00FF88",
                  cursor: "pointer",
                  minWidth: 100,
                }}
              >
                {symbol} ▾
              </button>
              {selectedStock && (
                <span style={{ fontSize: 11, color: "#666" }}>{selectedStock.name}</span>
              )}
            </div>

            {pickerOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 100,
                width: 360,
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                overflow: "hidden",
              }}>
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search all companies..."
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#0a0a0a", border: "none", borderBottom: "1px solid #222",
                    color: "#fff", padding: "10px 12px", fontSize: 11, fontFamily: "monospace",
                  }}
                />
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {(search ? filteredStocks : popular).map((s: any) => (
                    <button
                      key={s.symbol}
                      type="button"
                      onClick={() => setSymbol(s.symbol)}
                      style={{
                        display: "flex", justifyContent: "space-between", width: "100%",
                        padding: "8px 12px", background: s.symbol === symbol ? "rgba(0,255,136,0.06)" : "transparent",
                        border: "none", borderBottom: "1px solid #151515", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.symbol === symbol ? "#00FF88" : "#fff" }}>{s.symbol}</span>
                      <span style={{ fontSize: 10, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{s.name}</span>
                    </button>
                  ))}
                  {!search && (
                    <div style={{ padding: "8px 12px", fontSize: 9, color: "#444", letterSpacing: "0.08em" }}>
                      TOP BY VOLUME — search for any of {stocks?.length ?? 0} companies
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick picks */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {popular.slice(0, 10).map(s => (
              <button
                key={s.symbol}
                type="button"
                onClick={() => setSymbol(s.symbol)}
                style={{
                  padding: "3px 8px", fontSize: 10, fontFamily: "monospace",
                  background: symbol === s.symbol ? "rgba(0,255,136,0.12)" : "#151515",
                  border: `1px solid ${symbol === s.symbol ? "#00FF88" : "#1f1f1f"}`,
                  borderRadius: 3, color: symbol === s.symbol ? "#00FF88" : "#666", cursor: "pointer",
                }}
              >{s.symbol}</button>
            ))}
          </div>
        </div>

        <div style={{
          background: "#151515", border: "1px solid #1f1f1f", borderRadius: 6,
          padding: "10px 16px", marginBottom: 12, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>LAST TRADE</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }} className="num">{cs}{fmt(lastPrice)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>SPREAD</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFB800" }} className="num">
              {spread != null ? `${cs}${fmt(spread, 3)}` : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>BEST BID</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.green }} className="num">{cs}{fmt(bestBid)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>BEST ASK</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.red }} className="num">{cs}{fmt(bestAsk)}</div>
          </div>
        </div>

        <div style={{ background: "#151515", border: "1px solid #1f1f1f", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", padding: "6px 12px", borderBottom: "1px solid #1a1a1a" }}>
            {["ORDERS","QTY","BID PRICE","ASK PRICE","QTY","ORDERS"].map((h, i) => (
              <div key={i} style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", textAlign: i < 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 12 }}>Seeding liquidity for {symbol}...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ borderRight: "1px solid #1a1a1a" }}>
                <AnimatePresence>
                  {bids.map(level => (
                    <DepthRow key={`bid-${level.price}`} level={level} maxQty={maxBidQty} side="bid" flash={flashedBids.has(level.price)} />
                  ))}
                  {bids.length === 0 && (
                    <div style={{ padding: "20px 12px", color: "#444", fontSize: 11, textAlign: "center" }}>
                      Loading bids for {symbol}...
                    </div>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <AnimatePresence>
                  {asks.map(level => (
                    <DepthRow key={`ask-${level.price}`} level={level} maxQty={maxAskQty} side="ask" flash={flashedAsks.has(level.price)} />
                  ))}
                  {asks.length === 0 && (
                    <div style={{ padding: "20px 12px", color: "#444", fontSize: 11, textAlign: "center" }}>
                      Loading asks for {symbol}...
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {bids.length > 0 && asks.length > 0 && (
          <div style={{ background: "#151515", border: "1px solid #1f1f1f", borderRadius: 6, padding: "8px 8px 4px" }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", padding: "0 8px 6px" }}>CUMULATIVE DEPTH</div>
            <DepthChart bids={bids} asks={asks} cs={cs} />
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 10, paddingTop: 4 }}>RECENT TRADES · {symbol}</div>
        <div style={{ background: "#151515", border: "1px solid #1f1f1f", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 12px", borderBottom: "1px solid #1a1a1a" }}>
            {["PRICE","QTY","TIME"].map(h => (
              <div key={h} style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>{h}</div>
            ))}
          </div>
          <AnimatePresence>
            {trades?.slice(0, 30).map((t, i) => {
              const isBuy = t.side === "buy";
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "4px 12px", fontSize: 11, borderBottom: "1px solid #111" }}
                >
                  <span style={{ color: isBuy ? C.green : C.red, fontWeight: 600 }} className="num">{cs}{fmt(t.price)}</span>
                  <span style={{ color: "#888" }} className="num">{fmt(t.quantity, 0)}</span>
                  <span style={{ color: "#555", fontSize: 10 }}>
                    {new Date(t.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </motion.div>
              );
            })}
            {!trades?.length && (
              <div style={{ padding: 20, color: "#444", fontSize: 11, textAlign: "center" }}>
                No trades yet for {symbol}.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  );
}
