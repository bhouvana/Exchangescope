import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useRegion } from "@/context/RegionContext";
import { ExplainTip } from "@/components/Explain";
import { useQuery } from "@tanstack/react-query";

// ─── palette ──────────────────────────────────────────────────────────────────
const C = {
  green:  "#00FF88",
  red:    "#FF4444",
  yellow: "#FFB800",
  card:   "#111111",
  border: "#1e1e1e",
  text:   "#cccccc",
  muted:  "#666666",
  dim:    "#333333",
};

// ─── types ────────────────────────────────────────────────────────────────────
type Stock = {
  symbol: string; name: string; price: number; change: number;
  changePercent: number; volume: number; marketCap: number | null; sector?: string;
};
type SectorPerf = {
  sector: string; count: number; totalCap: number; avgChange: number; capWeighted: number;
};
type Overview = {
  totalCompanies: number; pricedCompanies?: number;
  advancing: number; declining: number; unchanged: number;
  sectorPerformance: SectorPerf[];
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function pct(n: number) { return `${n >= 0 ? "+" : ""}${fmt(n)}%`; }
function fmtCap(n: number | null | undefined, cs = "$") {
  if (!n) return "—";
  if (n >= 1e12) return `${cs}${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `${cs}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `${cs}${(n / 1e6).toFixed(0)}M`;
  return `${cs}${n.toFixed(0)}`;
}
function fmtVol(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}
function heatBg(chg: number, maxAbs: number): string {
  const t = Math.max(-1, Math.min(1, chg / Math.max(maxAbs, 0.5)));
  if (t >= 0) {
    const g = Math.round(65 + t * 190);
    const b = Math.round(50 + t * 80);
    return `rgb(0,${g},${b})`;
  }
  const r = Math.round(65 + Math.abs(t) * 190);
  return `rgb(${r},15,15)`;
}

// ─── data hooks ───────────────────────────────────────────────────────────────
function useOverview() {
  return useQuery<Overview>({
    queryKey: ["market-overview"],
    queryFn: async () => { const r = await fetch("/api/market/overview"); if (!r.ok) throw new Error("fail"); return r.json(); },
    refetchInterval: 15_000,
  });
}
function useSectorStocks(sector: string, exchange: string, limit: number) {
  return useQuery({
    queryKey: ["sector-stocks", sector, exchange, limit],
    queryFn: async () => {
      const r = await fetch(`/api/companies?sector=${encodeURIComponent(sector)}&exchange=${exchange}&pageSize=${limit}&sortBy=marketCap&sortDir=desc`);
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    enabled: !!sector && !!exchange,
    staleTime: 12_000,
  });
}

// ─── StockTile ────────────────────────────────────────────────────────────────
function StockTile({ stock, flex, maxAbs, showLabel, isHovered, onHover, onLeave }: {
  stock: Stock; flex: number; maxAbs: number; showLabel: boolean;
  isHovered: boolean; onHover: (s: Stock) => void; onLeave: () => void;
}) {
  return (
    <Link href={`/orderbook?symbol=${stock.symbol}`}>
      <div
        onMouseEnter={() => onHover(stock)}
        onMouseLeave={onLeave}
        title={`${stock.symbol} ${pct(stock.changePercent)}`}
        style={{
          flex: Math.max(flex, 0.1),
          minHeight: showLabel ? 22 : 3,
          background: heatBg(stock.changePercent, maxAbs),
          border: isHovered ? "1px solid rgba(255,255,255,0.9)" : "1px solid rgba(0,0,0,0.2)",
          borderRadius: 2,
          cursor: "pointer",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: showLabel ? "2px 5px" : 0,
          boxSizing: "border-box",
          transition: "border-color 0.08s",
        }}
      >
        {showLabel && (
          <>
            <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(0,0,0,0.85)", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {stock.symbol}
            </span>
            <span style={{ fontSize: 7, color: "rgba(0,0,0,0.65)", lineHeight: 1.1 }}>
              {pct(stock.changePercent)}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

// ─── SectorColumn ─────────────────────────────────────────────────────────────
function SectorColumn({ sector, region, maxAbs, isCapWeighted, colFlex, totalColFlex, selected, onSelect, hoveredStock, onHover, onLeave, cs, tileLimit, tileAreaH }: {
  sector: SectorPerf; region: string; maxAbs: number;
  isCapWeighted: boolean; colFlex: number; totalColFlex: number;
  selected: string | null; onSelect: (s: string | null) => void;
  hoveredStock: Stock | null; onHover: (s: Stock) => void; onLeave: () => void;
  cs: string; tileLimit: number; tileAreaH: number;
}) {
  const isSelected = selected === sector.sector;
  const isDimmed   = selected !== null && !isSelected;

  // widthPct drives label visibility — uses the pre-computed balanced column flex
  const widthPct = totalColFlex > 0 ? (colFlex / totalColFlex) * 100 : 0;

  const { data, isLoading } = useSectorStocks(sector.sector, region, isSelected ? 240 : tileLimit);
  const stocks = (data?.data ?? []) as Stock[];
  const sorted = useMemo(() => [...stocks].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)), [stocks]);
  const maxAbsStock = useMemo(() => Math.max(...stocks.map(s => Math.abs(s.changePercent)), 0.5), [stocks]);

  // Total flex across all tiles — used to estimate each tile's rendered height
  const totalTileFlex = useMemo(
    () => sorted.reduce((s, x) => s + (isCapWeighted && (x.marketCap ?? 0) > 0 ? x.marketCap! : 1), 0) || sorted.length || 1,
    [sorted, isCapWeighted],
  );

  // Per-tile: estimate rendered height from its flex proportion, then decide if label fits
  const tileFlexOf  = (s: Stock) => isCapWeighted && (s.marketCap ?? 0) > 0 ? s.marketCap! : 1;
  const labelFitsFor = (s: Stock) =>
    (tileFlexOf(s) / totalTileFlex) * tileAreaH > 16 && widthPct > 3;

  const headerBg = heatBg(sector.capWeighted, maxAbs);
  const showSubtitle = widthPct > 4 || isSelected;

  return (
    <div style={{
      flex: Math.max(colFlex, 1),
      minWidth: isSelected ? undefined : 50,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      opacity: isDimmed ? 0.25 : 1,
      transition: "opacity 0.2s, flex 0.25s",
      overflow: "hidden",
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => onSelect(isSelected ? null : sector.sector)}
        style={{
          background: headerBg,
          border: isSelected ? "2px solid #fff" : "1px solid rgba(0,0,0,0.3)",
          borderRadius: 4,
          padding: "5px 7px",
          cursor: "pointer",
          textAlign: "left",
          flexShrink: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 8, fontWeight: 900, color: "rgba(0,0,0,0.9)", letterSpacing: "0.04em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {sector.sector.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#000", lineHeight: 1.3 }}>
          {pct(sector.capWeighted)}
        </div>
        {showSubtitle && (
          <div style={{ fontSize: 7.5, color: "rgba(0,0,0,0.6)", lineHeight: 1.2, marginTop: 1 }}>
            {sector.count}{isCapWeighted ? ` · ${fmtCap(sector.totalCap, cs)}` : " stocks"}
          </div>
        )}
      </button>

      {/* Tiles */}
      {(!selected || isSelected) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 2, opacity: 0.3 }} />
          ) : sorted.map(s => (
            <StockTile
              key={s.symbol}
              stock={s}
              flex={tileFlexOf(s)}
              maxAbs={maxAbsStock}
              showLabel={isSelected ? labelFitsFor(s) && widthPct > 4 : labelFitsFor(s)}
              isHovered={hoveredStock?.symbol === s.symbol}
              onHover={onHover}
              onLeave={onLeave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar sub-components ───────────────────────────────────────────────────
function StockDetail({ stock, cs }: { stock: Stock; cs: string }) {
  const color = stock.changePercent >= 0 ? C.green : C.red;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{stock.symbol}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct(stock.changePercent)}</span>
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stock.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
        {[
          { l: "PRICE",   v: `${cs}${fmt(stock.price)}` },
          { l: "CHANGE",  v: `${stock.change >= 0 ? "+" : ""}${fmt(stock.change)}` },
          { l: "MKT CAP", v: fmtCap(stock.marketCap, cs) },
          { l: "VOLUME",  v: fmtVol(stock.volume) },
        ].map(({ l, v }) => (
          <div key={l} style={{ background: "#0a0a0a", borderRadius: 4, padding: "5px 8px" }}>
            <div style={{ fontSize: 7, color: C.dim, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
      <Link href={`/orderbook?symbol=${stock.symbol}`}>
        <button type="button" style={{ padding: "5px 10px", fontSize: 8, fontWeight: 700, background: "rgba(0,255,136,0.08)", border: `1px solid ${C.green}`, borderRadius: 3, color: C.green, cursor: "pointer" }}>
          OPEN ORDER BOOK →
        </button>
      </Link>
    </div>
  );
}

function SectorDetail({ sector, totalCap, isCapWeighted, cs }: { sector: SectorPerf; totalCap: number; isCapWeighted: boolean; cs: string }) {
  const color = sector.capWeighted >= 0 ? C.green : C.red;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{sector.sector}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 10 }}>
        {pct(sector.capWeighted)}
        <span style={{ fontSize: 9, color: C.muted, fontWeight: 400, marginLeft: 5 }}>{isCapWeighted ? "cap-wtd" : "avg"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {([
          { l: "STOCKS",     v: String(sector.count) },
          { l: "AVG RETURN", v: pct(sector.avgChange) },
          ...(isCapWeighted ? [
            { l: "MKT CAP",  v: fmtCap(sector.totalCap, cs) },
            { l: "INDEX WT", v: totalCap > 0 ? `${((sector.totalCap / totalCap) * 100).toFixed(1)}%` : "—" },
          ] : []),
        ] as { l: string; v: string }[]).map(({ l, v }) => (
          <div key={l} style={{ background: "#0a0a0a", borderRadius: 4, padding: "5px 8px" }}>
            <div style={{ fontSize: 7, color: C.dim, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SectorHeatmap() {
  const { region, regionMeta } = useRegion();
  const cs = regionMeta.currencySymbol ?? "$";
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredStock,   setHoveredStock]   = useState<Stock | null>(null);

  const { data: overview, isLoading } = useOverview();

  const sectors = useMemo(
    () => (overview?.sectorPerformance ?? []).slice().sort((a, b) =>
      a.totalCap !== b.totalCap ? b.totalCap - a.totalCap : b.count - a.count
    ),
    [overview],
  );
  const totalMarketCap = useMemo(() => sectors.reduce((s, x) => s + x.totalCap, 0), [sectors]);
  const totalCount     = useMemo(() => sectors.reduce((s, x) => s + x.count, 0), [sectors]);
  // "Cap-weighted" only when at least half the sectors have real cap data loaded
  const sectorsWithCap = useMemo(() => sectors.filter(s => s.totalCap > 0), [sectors]);
  const isCapWeighted  = sectorsWithCap.length >= Math.ceil(sectors.length * 0.5);

  // For sectors that haven't loaded cap data yet, estimate from average cap-per-stock
  // so their column doesn't collapse to flex:1 against a 100B-cap neighbour.
  const avgCapPerStock = useMemo(() => {
    const stocksWithCap = sectorsWithCap.reduce((s, x) => s + x.count, 0);
    return stocksWithCap > 0 ? totalMarketCap / stocksWithCap : 0;
  }, [sectorsWithCap, totalMarketCap]);

  const colFlexOf = (sec: SectorPerf): number => {
    if (!isCapWeighted) return sec.count;
    if (sec.totalCap > 0) return sec.totalCap;
    return avgCapPerStock > 0 ? Math.round(sec.count * avgCapPerStock) : sec.count;
  };
  const totalColFlex = useMemo(() => sectors.reduce((s, x) => s + colFlexOf(x), 0), [sectors, isCapWeighted, avgCapPerStock]);

  const maxAbsChange = useMemo(
    () => Math.max(...sectors.map(s => Math.abs(s.capWeighted)), 0.5),
    [sectors],
  );

  const breadth = useMemo(() => {
    if (!overview) return null;
    const priced = overview.pricedCompanies ?? overview.totalCompanies;
    const avg = sectors.length ? sectors.reduce((s, x) => s + x.avgChange, 0) / sectors.length : 0;
    const capW = isCapWeighted
      ? sectors.reduce((s, x) => s + x.capWeighted * x.totalCap, 0) / totalMarketCap
      : avg;
    const ranked = [...sectors].sort((a, b) => b.capWeighted - a.capWeighted);
    return {
      advancing: overview.advancing,
      declining: overview.declining,
      pricedCount: priced,
      capWeighted: capW,
      best:  ranked[0]  ?? null,
      worst: ranked[ranked.length - 1] ?? null,
    };
  }, [overview, sectors, totalMarketCap, isCapWeighted]);

  const activeSector   = selectedSector ? sectors.find(s => s.sector === selectedSector) ?? null : null;
  const displaySectors = selectedSector ? sectors.filter(s => s.sector === selectedSector) : sectors;

  // Show up to 200 tiles per sector (API cap is 250).
  // Large-cap tiles get labels from per-tile height estimation; tiny tiles are just colored stripes.
  const tileLimit = 200;

  // Estimated height available for the tile area (viewport - overhead)
  // Used to decide whether tile labels are tall enough to show
  const tileAreaH = typeof window !== "undefined" ? Math.max(window.innerHeight - 310, 300) : 480;

  const kpis = breadth ? [
    { label: "ADVANCING",    val: breadth.advancing, fmt: "int",  sub: `${breadth.pricedCount ? Math.round(breadth.advancing / breadth.pricedCount * 100) : 0}% of priced`, color: C.green },
    { label: "DECLINING",    val: breadth.declining, fmt: "int",  sub: `${breadth.pricedCount ? Math.round(breadth.declining / breadth.pricedCount * 100) : 0}% of priced`, color: C.red },
    { label: isCapWeighted ? "CAP-WTD RETURN" : "AVG RETURN", val: pct(breadth.capWeighted), fmt: "str", sub: isCapWeighted ? "market-cap weighted" : "equal-weight avg", color: breadth.capWeighted >= 0 ? C.green : C.red },
    { label: "LEADING SECTOR", val: breadth.best?.sector ?? "—",  fmt: "str", sub: breadth.best  ? pct(breadth.best.capWeighted)  : "", color: C.green },
    { label: "LAGGING SECTOR", val: breadth.worst?.sector ?? "—", fmt: "str", sub: breadth.worst ? pct(breadth.worst.capWeighted) : "", color: C.red },
  ] as const : [];

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      padding: "14px 20px 10px",
      boxSizing: "border-box",
      fontFamily: "monospace",
      background: "#0a0a0a",
    }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "0.08em", margin: 0, lineHeight: 1.3 }}>
              SECTOR HEATMAP
            </h1>
            <div style={{ fontSize: 9.5, color: C.muted, letterSpacing: "0.05em", marginTop: 2, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span>{regionMeta.exchange}</span>
              <span style={{ color: C.dim }}>·</span>
              <span style={{ color: isCapWeighted ? C.green : C.yellow, fontWeight: 700 }}>
                {isCapWeighted ? "MARKET-CAP WEIGHTED" : "EQUAL-WEIGHT MODE"}
              </span>
              <span style={{ color: C.dim }}>·</span>
              <span>{sectors.length} SECTORS</span>
              <ExplainTip term="SECTOR ROTATION" explanation="Sector rotation tracks capital movement between industries. US exchanges use market-cap weighting (larger companies have more index influence). Indian exchanges show equal-weight since live market-cap is unavailable for NSE/BSE here." />
            </div>
            {!isCapWeighted && (
              <div style={{ fontSize: 8, color: "#906020", marginTop: 4, background: "#181000", border: "1px solid #3a2800", borderRadius: 3, padding: "2px 7px", display: "inline-block" }}>
                ⚠ Column width = stock count · tile sizes equal · % = simple avg
              </div>
            )}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, paddingTop: 2 }}>
            <span style={{ fontSize: 8, color: C.red }}>{pct(-maxAbsChange)}</span>
            <div style={{ width: 80, height: 7, borderRadius: 2, background: `linear-gradient(to right, ${C.red}, #2a2a2a 50%, ${C.green})` }} />
            <span style={{ fontSize: 8, color: C.green }}>+{fmt(maxAbsChange)}%</span>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      {breadth && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, flexShrink: 0, marginBottom: 8 }}>
          {kpis.map(({ label, val, fmt: f, sub, color }) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 7, color: C.dim, letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: f === "int" ? 19 : (label.includes("SECTOR") ? 11 : 14), fontWeight: 800, color, lineHeight: 1.2 }}>
                {f === "int" ? (val as number).toLocaleString() : val}
              </div>
              {sub && <div style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Sector filter pills ── */}
      <div style={{ flexShrink: 0, display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {[
          { key: null, label: `ALL (${totalCount})` },
          ...sectors.map(s => ({ key: s.sector, label: `${s.sector} (${s.count})` })),
        ].map(({ key, label }) => {
          const active = key === null ? !selectedSector : selectedSector === key;
          return (
            <button
              key={key ?? "__all"}
              type="button"
              onClick={() => setSelectedSector(key === null ? null : (selectedSector === key ? null : key))}
              style={{
                padding: "2px 8px", fontSize: 8.5, fontWeight: 700, borderRadius: 3, cursor: "pointer",
                background: active ? "rgba(0,255,136,0.09)" : "#111",
                border:     `1px solid ${active ? C.green : "#252525"}`,
                color:      active ? C.green : "#555",
              }}
            >{label}</button>
          );
        })}
      </div>

      {/* ── Main grid (fills remaining viewport height) ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 250px", gap: 10, minHeight: 0 }}>

        {/* Treemap panel */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.08em", marginBottom: 6, flexShrink: 0 }}>
            {selectedSector ? `${selectedSector.toUpperCase()} — DRILL-DOWN` : "FULL MARKET VIEW"}
            {" · SIZE = "}{isCapWeighted ? "MARKET CAP" : "STOCK COUNT"}{" · COLOR = CHANGE %"}
          </div>

          {isLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 12 }}>
              Loading market data…
            </div>
          ) : sectors.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 11 }}>
              No sector data available.
            </div>
          ) : (
            /* Sector columns flex row — fills all remaining height */
            <div style={{ flex: 1, display: "flex", gap: 2, minHeight: 0, overflow: "hidden" }}>
              {displaySectors.map(sec => (
                <SectorColumn
                  key={sec.sector}
                  sector={sec}
                  region={region}
                  maxAbs={maxAbsChange}
                  isCapWeighted={isCapWeighted}
                  colFlex={colFlexOf(sec)}
                  totalColFlex={totalColFlex}
                  selected={selectedSector}
                  onSelect={setSelectedSector}
                  hoveredStock={hoveredStock}
                  onHover={setHoveredStock}
                  onLeave={() => setHoveredStock(null)}
                  cs={cs}
                  tileLimit={tileLimit}
                  tileAreaH={tileAreaH}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflowY: "auto" }}>

          {/* Stock / sector detail card */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 13, flexShrink: 0 }}>
            <div style={{ fontSize: 7.5, color: C.dim, letterSpacing: "0.1em", marginBottom: 8 }}>
              {hoveredStock ? "STOCK DETAIL" : activeSector ? "SECTOR DETAIL" : "HOVER A TILE"}
            </div>
            {hoveredStock ? (
              <StockDetail stock={hoveredStock} cs={cs} />
            ) : activeSector ? (
              <SectorDetail sector={activeSector} totalCap={totalMarketCap} isCapWeighted={isCapWeighted} cs={cs} />
            ) : (
              <p style={{ fontSize: 10, color: C.muted, lineHeight: 1.8, margin: 0 }}>
                Hover any coloured tile to see stock details.<br />
                Click a sector header to drill down.
              </p>
            )}
          </div>

          {/* Rotation rank */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 13px", borderBottom: `1px solid ${C.border}`, fontSize: 7.5, color: C.dim, letterSpacing: "0.1em", flexShrink: 0 }}>
              ROTATION RANK · {isCapWeighted ? "CAP-WEIGHTED" : "AVG CHANGE"}
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {[...sectors].sort((a, b) => b.capWeighted - a.capWeighted).map((sec, i) => {
                const active  = selectedSector === sec.sector;
                const barW    = maxAbsChange > 0 ? Math.abs(sec.capWeighted) / maxAbsChange * 100 : 0;
                const barClr  = sec.capWeighted >= 0 ? "rgba(0,255,136,0.07)" : "rgba(255,68,68,0.07)";
                return (
                  <button
                    key={sec.sector}
                    type="button"
                    onClick={() => setSelectedSector(active ? null : sec.sector)}
                    style={{
                      display: "flex", alignItems: "center", width: "100%",
                      padding: "7px 13px",
                      background: active ? "rgba(0,255,136,0.05)" : "transparent",
                      border: "none", borderBottom: `1px solid #0e0e0e`,
                      cursor: "pointer", textAlign: "left", gap: 7, position: "relative",
                    }}
                  >
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barW}%`, background: barClr, pointerEvents: "none" }} />
                    <span style={{ fontSize: 8, color: C.dim, width: 14, flexShrink: 0, textAlign: "right" }}>{i + 1}</span>
                    <span style={{ fontSize: 9.5, color: C.text, flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sec.sector}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: sec.capWeighted >= 0 ? C.green : C.red, flexShrink: 0 }}>{pct(sec.capWeighted)}</span>
                    <span style={{ fontSize: 8, color: C.dim, width: 26, textAlign: "right", flexShrink: 0 }}>{sec.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
