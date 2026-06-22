import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useListTrades, useListStocks } from "@workspace/api-client-react";
import { useRegion } from "@/context/RegionContext";
import { useSimulatedTraders } from "@/context/SimulatedTradersContext";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f", greenDim: "#00FF8840", redDim: "#FF444440" };

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBig(n: number, cs = "$") {
  if (n >= 1e9) return `${cs}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${cs}${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${cs}${(n / 1e3).toFixed(1)}K`;
  return `${cs}${n.toFixed(0)}`;
}

let simTradeUid = 0;
function generateSimTrade(symbols: string[], traderIds: string[], regionKey: string): any {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const side = Math.random() > 0.5 ? "buy" : "sell";
  const quantity = Math.floor(Math.random() * 500) + 50;
  const price = 50 + Math.random() * 950;
  const id = `sim-${regionKey}-${++simTradeUid}`;
  const buyerId = side === "buy" ? traderIds[Math.floor(Math.random() * traderIds.length)] : "";
  const sellerId = side === "sell" ? traderIds[Math.floor(Math.random() * traderIds.length)] : "";
  return {
    id,
    symbol,
    side,
    price: Math.round(price * 100) / 100,
    quantity,
    buyTraderId: side === "buy" ? buyerId : "",
    sellTraderId: side === "sell" ? sellerId : "",
    timestamp: new Date().toISOString(),
    buyOrderId: `sim-bo-${id}`,
    sellOrderId: `sim-so-${id}`,
  };
}

function generateSimTradeBatch(symbols: string[], traderIds: string[], count: number, regionKey: string): any[] {
  return Array.from({ length: count }, () => generateSimTrade(symbols, traderIds, regionKey));
}

export default function TradeTape() {
  const { region: currentRegion, regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol;
  const { data: trades, isLoading } = useListTrades({ limit: 500 } as any, { query: { refetchInterval: 1000 } } as any);
  const { data: stocks } = useListStocks({ query: { refetchInterval: 30000 } } as any) as any;
  const { allTraders } = useSimulatedTraders();
  const [filterSymbol, setFilterSymbol] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  // Generate simulated trades for the current region
  const [simTrades, setSimTrades] = useState<any[]>([]);

  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;
  const tradersRef = useRef(allTraders);
  tradersRef.current = allTraders;

  useEffect(() => {
    simTradeUid = 0;
    const symbols = ((stocks ?? []).length ? (stocks as any[]) : [
      currentRegion === "nasdaq"
        ? ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","GOOG","AMD","INTC","QCOM","ADBE","CRM","ORCL","AVGO"]
        : ["RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","HINDUNILVR","ITC","SBIN","BHARTIARTL","KOTAKBANK","BAJFINANCE","LT","WIPRO","AXISBANK"],
    ].flat()).map((s: any) => (typeof s === "string" ? s : s.symbol));

    setSimTrades(generateSimTradeBatch(symbols, tradersRef.current.map(t => t.id), 80, currentRegion));

    const interval = setInterval(() => {
      const liveStocks = stocksRef.current;
      const liveSymbols = (liveStocks ?? []).length
        ? (liveStocks as any[]).map(s => s.symbol)
        : symbols;
      const liveTraderIds = tradersRef.current.map(t => t.id);
      setSimTrades(prev => {
        const batchSize = 3 + Math.floor(Math.random() * 5);
        const newTrades = generateSimTradeBatch(liveSymbols, liveTraderIds, batchSize, currentRegion);
        return [...newTrades, ...prev].slice(0, 300);
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [currentRegion]);

  // Merge real and simulated trades, filter to region symbols
  const allTrades = useMemo(() => {
    const real = ((trades ?? []) as any[]).filter((t: any) => t.symbol);
    const combined = [...simTrades, ...real];
    const symbols = new Set((stocks ?? []).map((s: any) => s.symbol));
    if (symbols.size) return combined.filter((t: any) => symbols.has(t.symbol));
    return combined;
  }, [trades, simTrades, stocks]);

  // Compute stats
  const stats = useMemo(() => {
    const list = allTrades;
    if (!list.length) return null;
    const totalVolume = list.reduce((s, t) => s + t.quantity, 0);
    const totalValue = list.reduce((s, t) => s + t.price * t.quantity, 0);
    const buyTrades = list.filter(t => t.side === "buy");
    const sellTrades = list.filter(t => t.side === "sell");
    const buyVolume = buyTrades.reduce((s, t) => s + t.quantity, 0);
    const sellVolume = sellTrades.reduce((s, t) => s + t.quantity, 0);
    const vwap = totalVolume > 0 ? totalValue / totalVolume : 0;
    const avgTradeSize = totalVolume / list.length;
    const largestTrade = list.reduce((max, t) => t.quantity > max.quantity ? t : max, list[0]);
    const ratio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume;
    return {
      totalTrades: list.length,
      totalVolume,
      totalValue,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
      buyVolume,
      sellVolume,
      vwap,
      avgTradeSize,
      largestTrade,
      buySellRatio: ratio,
    };
  }, [allTrades]);

  // Top symbols by trade count
  const topSymbols = useMemo(() => {
    const list = allTrades;
    const counts = new Map<string, { count: number; volume: number; value: number; buys: number; sells: number }>();
    for (const t of list) {
      const prev = counts.get(t.symbol) ?? { count: 0, volume: 0, value: 0, buys: 0, sells: 0 };
      prev.count++;
      prev.volume += t.quantity;
      prev.value += t.price * t.quantity;
      if (t.side === "buy") prev.buys++; else prev.sells++;
      counts.set(t.symbol, prev);
    }
    return Array.from(counts.entries())
      .map(([symbol, d]) => ({ symbol, ...d, avgPrice: d.volume > 0 ? d.value / d.volume : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [allTrades]);

  // Volume buckets (time-based)
  const volumeBuckets = useMemo(() => {
    const list = allTrades;
    if (!list.length) return [];
    const sorted = [...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const bucketCount = 20;
    const first = new Date(sorted[0].timestamp).getTime();
    const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const range = last - first || 1;
    const bucketSize = range / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      time: new Date(first + i * bucketSize).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      buyVol: 0, sellVol: 0, total: 0,
    }));
    for (const t of sorted) {
      const idx = Math.min(Math.floor((new Date(t.timestamp).getTime() - first) / bucketSize), bucketCount - 1);
      buckets[idx].total += t.quantity;
      if (t.side === "buy") buckets[idx].buyVol += t.quantity;
      else buckets[idx].sellVol += t.quantity;
    }
    return buckets;
  }, [allTrades]);

  // Filtered trades
  const filtered = useMemo(() => {
    if (!filterSymbol) return allTrades;
    return allTrades.filter((t: any) => t.symbol === filterSymbol);
  }, [allTrades, filterSymbol]);

  const maxQty = useMemo(() => {
    if (!filtered.length) return 1;
    return Math.max(...filtered.map(t => t.quantity));
  }, [filtered]);

  return (
    <div style={{ padding: "20px 24px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>TRADE TAPE</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
            {regionMeta.exchange} - LIVE EXECUTIONS - DEPTH ANALYSIS
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setShowFilter(!showFilter)} style={{
            padding: "5px 12px", fontSize: 10, background: filterSymbol ? "rgba(0,255,136,0.1)" : "#111",
            border: `1px solid ${filterSymbol ? C.green : "#2a2a2a"}`, borderRadius: 4,
            color: filterSymbol ? C.green : "#555", cursor: "pointer", fontFamily: "monospace",
          }}>
            {filterSymbol || "ALL SYMBOLS"}
          </button>
          {filterSymbol && (
            <button type="button" onClick={() => setFilterSymbol("")} style={{
              padding: "5px 8px", fontSize: 10, background: "#111", border: "1px solid #333",
              borderRadius: 4, color: "#666", cursor: "pointer",
            }}>CLEAR</button>
          )}
        </div>
      </div>

      {/* Symbol filter dropdown */}
      {showFilter && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 8,
          marginBottom: 12, maxHeight: 200, overflowY: "auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 4,
        }}>
          {topSymbols.map(s => (
            <button key={s.symbol} type="button" onClick={() => { setFilterSymbol(s.symbol); setShowFilter(false); }} style={{
              padding: "4px 8px", fontSize: 10, background: filterSymbol === s.symbol ? "rgba(0,255,136,0.12)" : "#0D0D0D",
              border: `1px solid ${filterSymbol === s.symbol ? C.green : "#1a1a1a"}`, borderRadius: 3,
              color: filterSymbol === s.symbol ? C.green : "#888", cursor: "pointer", textAlign: "left", fontFamily: "monospace",
            }}>
              {s.symbol} <span style={{ color: "#444", fontSize: 9 }}>({s.count})</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Stats Panel */}
      {stats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard label="TOTAL TRADES" value={stats.totalTrades.toString()} color="#fff" />
          <StatCard label="TOTAL VOLUME" value={fmtBig(stats.totalVolume, "")} color="#fff" />
          <StatCard label="TOTAL VALUE" value={fmtBig(stats.totalValue, cs)} color="#fff" />
          <StatCard label="VWAP" value={`${cs}${fmt(stats.vwap)}`} color="#FFaa00" />
          <StatCard label="BUY / SELL" value={`${stats.buyCount} / ${stats.sellCount}`} sub={`Ratio: ${stats.buySellRatio.toFixed(2)}`} color={stats.buySellRatio >= 1 ? C.green : C.red} />
          <StatCard label="AVG TRADE SIZE" value={fmt(stats.avgTradeSize, 0)} sub={`Largest: ${fmt(stats.largestTrade?.quantity ?? 0, 0)}`} color="#888" />
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        {/* Main trade table */}
        <div style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 180px)" }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(60px,1.2fr) 44px minmax(72px,1fr) minmax(50px,0.7fr) minmax(72px,1fr) minmax(58px,0.9fr) minmax(58px,0.9fr) minmax(58px,0.9fr)",
            padding: "7px 12px", fontSize: 9, color: "#444", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            {["SYMBOL", "SIDE", "PRICE", "QTY", "VALUE", "BUYER", "SELLER", "TIME"].map(h => <div key={h}>{h}</div>)}
          </div>

          {isLoading && !simTrades.length ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Loading trade tape...</div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.slice(0, 80).map((t: any, i: number) => {
                const isBuy = t.side === "buy";
                const value = t.price * t.quantity;
                const sizeRatio = maxQty > 0 ? t.quantity / maxQty : 0;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.003, 0.15) }}
                    style={{
                      display: "grid", gridTemplateColumns: "minmax(60px,1.2fr) 44px minmax(72px,1fr) minmax(50px,0.7fr) minmax(72px,1fr) minmax(58px,0.9fr) minmax(58px,0.9fr) minmax(58px,0.9fr)",
                      padding: "5px 12px", fontSize: 10, borderBottom: "1px solid #111",
                      position: "relative", alignItems: "center",
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 0, bottom: 0, left: 0,
                      width: `${sizeRatio * 100}%`,
                      background: isBuy ? "rgba(0,255,136,0.04)" : "rgba(255,68,68,0.04)",
                      zIndex: 0,
                    }} />
                    <Link href={`/orderbook?symbol=${t.symbol}`}>
                      <span style={{ color: "#00FF88", fontWeight: 700, cursor: "pointer", position: "relative", zIndex: 1 }}>{t.symbol}</span>
                    </Link>
                    <span style={{ color: isBuy ? C.green : C.red, fontWeight: 700, textTransform: "uppercase", fontSize: 9, position: "relative", zIndex: 1 }}>
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <span className="num" style={{ color: "#fff", fontWeight: 600, position: "relative", zIndex: 1 }}>{cs}{fmt(t.price)}</span>
                    <span className="num" style={{ color: "#aaa", position: "relative", zIndex: 1 }}>{fmt(t.quantity, 0)}</span>
                    <span className="num" style={{ color: "#888", position: "relative", zIndex: 1 }}>{cs}{fmt(value, value >= 1000 ? 0 : 2)}</span>
                    <span style={{ color: "#555", fontSize: 9, position: "relative", zIndex: 1 }}>{t.buyTraderId ? `#${t.buyTraderId.slice(0, 6)}` : "—"}</span>
                    <span style={{ color: "#555", fontSize: 9, position: "relative", zIndex: 1 }}>{t.sellTraderId ? `#${t.sellTraderId.slice(0, 6)}` : "—"}</span>
                    <span style={{ color: "#444", fontSize: 9, position: "relative", zIndex: 1 }}>
                      {new Date(t.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!isLoading && !filtered.length && (
            <div style={{ padding: 40, textAlign: "center", color: "#444", fontSize: 12 }}>
              No trades yet.
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280, flexShrink: 0 }}>
          {/* Volume profile chart */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 8 }}>VOLUME PROFILE</div>
            <div style={{ height: 120 }}>
              {volumeBuckets.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeBuckets} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 7, fill: "#444" }} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 4, fontSize: 9, fontFamily: "monospace" }}
                      formatter={(v: number, name: string) => {
                        if (name === "buyVol") return [fmt(v, 0), "Buy Vol"];
                        if (name === "sellVol") return [fmt(v, 0), "Sell Vol"];
                        return [v, name];
                      }}
                    />
                    <Bar dataKey="buyVol" stackId="vol" fill={C.greenDim} isAnimationActive={false} />
                    <Bar dataKey="sellVol" stackId="vol" fill={C.redDim} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 10 }}>No data</div>
              )}
            </div>
          </div>

          {/* Buy/Sell volume bar */}
          {stats && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 6 }}>BUY / SELL PRESSURE</div>
              <div style={{ display: "flex", height: 18, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ flex: stats.buyVolume, background: C.green, opacity: 0.6 }} />
                <div style={{ flex: stats.sellVolume, background: C.red, opacity: 0.6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                <span style={{ color: C.green }}>BUY {fmtBig(stats.buyVolume, "")}</span>
                <span style={{ color: C.red }}>SELL {fmtBig(stats.sellVolume, "")}</span>
              </div>
            </div>
          )}

          {/* Top traded symbols */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 8 }}>TOP TRADED SYMBOLS</div>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 50px 40px", gap: 2, fontSize: 9 }}>
              <div style={{ color: "#333", fontWeight: 700 }}>SYMBOL</div>
              <div style={{ color: "#333", fontWeight: 700 }}>VALUE</div>
              <div style={{ color: "#333", fontWeight: 700, textAlign: "right" }}>VOL</div>
              <div style={{ color: "#333", fontWeight: 700, textAlign: "right" }}>B/S</div>
              {topSymbols.map(s => (
                <button key={s.symbol} type="button" onClick={() => setFilterSymbol(s.symbol)} style={{
                  display: "contents", cursor: "pointer", background: "none", border: "none", padding: 0,
                }}>
                  <div style={{ color: C.green, fontWeight: 700, padding: "3px 0" }}>{s.symbol}</div>
                  <div className="num" style={{ color: "#aaa", padding: "3px 0" }}>{cs}{fmtBig(s.value, "")}</div>
                  <div className="num" style={{ color: "#666", padding: "3px 0", textAlign: "right" }}>{fmt(s.volume, 0)}</div>
                  <div style={{ color: s.buys > s.sells ? C.green : C.red, padding: "3px 0", textAlign: "right", fontSize: 8 }}>
                    {s.buys}/{s.sells}
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SizeDistribution({ trades }: { trades: any[] }) {
  const buckets = useMemo(() => {
    if (!trades.length) return [];
    const maxQty = Math.max(...trades.map(t => t.quantity));
    const bucketCount = 8;
    const step = maxQty / bucketCount || 1;
    const result = Array.from({ length: bucketCount }, (_, i) => ({
      label: `${fmt(i * step, 0)}`,
      count: 0,
      buyCount: 0,
    }));
    for (const t of trades) {
      const idx = Math.min(Math.floor(t.quantity / step), bucketCount - 1);
      result[idx].count++;
      if (t.side === "buy") result[idx].buyCount++;
    }
    return result;
  }, [trades]);

  if (!buckets.length) return <div style={{ color: "#333", fontSize: 10 }}>No trades</div>;

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 50 }}>
      {buckets.map((b, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{
            width: "100%", borderRadius: 2,
            height: `${(b.count / maxCount) * 36}px`,
            background: b.buyCount > b.count / 2 ? C.greenDim : C.redDim,
            minHeight: b.count > 0 ? 3 : 0,
            transition: "height 0.3s",
          }} />
          <div style={{ fontSize: 7, color: "#333" }}>{b.count}</div>
        </div>
      ))}
    </div>
  );
}
