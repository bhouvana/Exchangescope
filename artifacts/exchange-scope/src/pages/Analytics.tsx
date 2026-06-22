import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetMarketStats } from "@workspace/api-client-react";
import { useRegion } from "@/context/RegionContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

interface HistoryPoint {
  idx: number;
  latency: number;
  ordersPs: number;
  tradesPs: number;
  queue: number;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function LatencyWaterfall({ gateway, queue, matching, total }: {
  gateway: number; queue: number; matching: number; total: number;
}) {
  if (total <= 0) return <div style={{ color: "#444", fontSize: 12 }}>Waiting for engine data…</div>;

  const segments = [
    { label: "Gateway", us: gateway, color: "#00FF88" },
    { label: "Queue", us: queue, color: "#A855F7" },
    { label: "Matching", us: matching, color: "#FFB800" },
  ];

  return (
    <div>
      <div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", background: "#0a0a0a", marginBottom: 10 }}>
        {segments.map(seg => (
          <div
            key={seg.label}
            style={{
              width: `${(seg.us / total) * 100}%`,
              background: seg.color,
              opacity: 0.85,
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: seg.us / total > 0.12 ? undefined : 0,
            }}
          >
            {seg.us / total > 0.12 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#000", letterSpacing: "0.04em" }}>{seg.label}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ fontSize: 10, color: "#666" }}>
            <span style={{ color: seg.color, fontWeight: 700 }}>{seg.label}</span>
            {" "}<span className="num">{seg.us}µs</span>
            <span style={{ color: "#444" }}> ({Math.round((seg.us / total) * 100)}%)</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>
          E2E <span className="num" style={{ color: C.green, fontWeight: 700 }}>{total}µs</span>
          <span style={{ color: "#444" }}> · {(total / 1000).toFixed(3)}ms</span>
        </div>
      </div>
    </div>
  );
}

function OutcomeBar({ filled, partial, rejected, queued }: {
  filled: number; partial: number; rejected: number; queued: number;
}) {
  const total = filled + partial + rejected + queued;
  if (total === 0) return <div style={{ color: "#444", fontSize: 12 }}>No orders processed yet</div>;

  const segments = [
    { label: "Filled", count: filled, color: C.green },
    { label: "Partial", count: partial, color: "#FFB800" },
    { label: "Queued", count: queued, color: "#555" },
    { label: "Rejected", count: rejected, color: C.red },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div style={{ display: "flex", height: 24, borderRadius: 4, overflow: "hidden", background: "#0a0a0a", marginBottom: 10 }}>
        {segments.map(seg => (
          <div
            key={seg.label}
            style={{ width: `${(seg.count / total) * 100}%`, background: seg.color, opacity: seg.label === "Queued" ? 0.5 : 0.85 }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ fontSize: 10 }}>
            <span style={{ color: seg.color, fontWeight: 700 }}>{seg.label}</span>
            {" "}<span className="num" style={{ color: "#aaa" }}>{seg.count.toLocaleString()}</span>
            <span style={{ color: "#444" }}> ({Math.round((seg.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { regionMeta } = useRegion();
  const { data: stats, isLoading, isError } = useGetMarketStats({ query: { refetchInterval: 1000 } } as any);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    if (!stats) return;
    setHistory(h => [
      ...h.slice(-59),
      {
        idx: h.length,
        latency: stats.latency?.totalUs ?? 0,
        ordersPs: stats.ordersPerSecond ?? 0,
        tradesPs: stats.tradesPerSecond ?? 0,
        queue: stats.queueDepth ?? 0,
      },
    ]);
  }, [stats]);

  const outcomes = useMemo(() => {
    if (!stats) return { filled: 0, partial: 0, rejected: 0, queued: 0, fillRate: 0 };
    const filled = stats.ordersFilled ?? 0;
    const partial = stats.partialFills ?? 0;
    const rejected = stats.ordersRejected ?? 0;
    const received = stats.ordersReceived ?? 0;
    const queued = Math.max(0, received - filled - partial - rejected);
    const fillRate = received > 0 ? Math.round(((filled + partial) / received) * 100) : 0;
    return { filled, partial, rejected, queued, fillRate };
  }, [stats]);

  const latency = stats?.latency ?? { gatewayUs: 0, queueUs: 0, matchingUs: 0, totalUs: 0 };

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", fontFamily: "monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>ENGINE ANALYTICS</h1>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
            {regionMeta.exchange} · C++ MATCHING ENGINE · LIVE OBSERVABILITY · SESSION METRICS
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isError ? C.red : C.green,
            boxShadow: `0 0 8px ${isError ? C.red : C.green}`,
          }} />
          <span style={{ fontSize: 10, color: isError ? C.red : C.green, fontWeight: 700, textTransform: "uppercase" }}>
            {isError ? "DISCONNECTED" : stats?.marketState ?? (isLoading ? "LOADING" : "—")}
          </span>
          <span style={{ fontSize: 10, color: "#444" }}>· uptime {fmtTime(stats?.uptime ?? 0)}</span>
        </div>
      </div>

      {/* Key metrics — each shows something distinct from the sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "SESSION ORDERS", val: stats?.ordersReceived, sub: "all participants", color: "#fff" },
          { label: "FILL RATE", val: `${outcomes.fillRate}%`, sub: `${outcomes.filled + outcomes.partial} matched`, color: C.green },
          { label: "AVG MATCH µs", val: stats?.latency?.matchingUs, sub: "from C++ engine", color: "#FFB800" },
          { label: "E2E LATENCY", val: stats?.latency?.totalUs, sub: "gateway+queue+match", color: C.green },
          { label: "EST. QUEUE DEPTH", val: stats?.queueDepth, sub: "λ × processing time", color: "#A855F7" },
        ].map(({ label, val, sub, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 8, color: "#444", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 800, color }}>
              {typeof val === "number" ? val.toLocaleString() : (val ?? "—")}
            </div>
            <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Latency + outcomes */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 14 }}>LATENCY BUDGET (µs)</div>
          <LatencyWaterfall
            gateway={latency.gatewayUs}
            queue={latency.queueUs}
            matching={latency.matchingUs}
            total={latency.totalUs}
          />
          <div style={{ marginTop: 14, padding: "10px 12px", background: "#0a0a0a", borderRadius: 4, fontSize: 10, color: "#555", lineHeight: 1.6 }}>
            Matching latency is measured from the C++ engine (<span className="num">avgLatUs</span>).
            Gateway and queue are ingress estimates. Compare with the{" "}
            <Link href="/pipeline" style={{ color: C.green }}>Matching Engine pipeline</Link> for per-order traces.
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 14 }}>ORDER OUTCOMES (SESSION)</div>
          <OutcomeBar
            filled={outcomes.filled}
            partial={outcomes.partial}
            rejected={outcomes.rejected}
            queued={outcomes.queued}
          />
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Trades executed", val: outcomes.filled, color: C.green },
              { label: "Resting in book", val: outcomes.queued, color: "#666" },
              { label: "Partial fills", val: outcomes.partial, color: "#FFB800" },
              { label: "Rejected", val: outcomes.rejected, color: C.red },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "#0a0a0a", borderRadius: 4, padding: "8px 10px" }}>
                <div style={{ fontSize: 8, color: "#444", marginBottom: 2 }}>{label.toUpperCase()}</div>
                <div className="num" style={{ fontSize: 16, fontWeight: 700, color }}>{val.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time series — the unique value vs sidebar snapshot */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, height: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>THROUGHPUT (LAST 60s)</div>
            <div style={{ fontSize: 9, color: "#555" }}>
              now: <span className="num" style={{ color: C.green }}>{stats?.ordersPerSecond ?? 0}</span> ord/s
              {" · "}<span className="num" style={{ color: "#00BFFF" }}>{stats?.tradesPerSecond ?? 0}</span> trd/s
            </div>
          </div>
          {history.length < 2 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 11 }}>
              Collecting samples…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={history}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis dataKey="idx" hide />
                <YAxis tick={{ fontSize: 9, fill: "#555" }} width={40} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", fontSize: 10 }}
                  formatter={(v: number, name: string) => [
                    v.toLocaleString(),
                    name === "ordersPs" ? "Orders/s" : "Trades/s",
                  ]}
                />
                <Line type="monotone" dataKey="ordersPs" stroke={C.green} strokeWidth={1.5} dot={false} name="ordersPs" />
                <Line type="monotone" dataKey="tradesPs" stroke="#00BFFF" strokeWidth={1.5} dot={false} name="tradesPs" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, height: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>LATENCY & QUEUE (LAST 60s)</div>
            <div style={{ fontSize: 9, color: "#555" }}>
              now: <span className="num" style={{ color: "#FFB800" }}>{stats?.latency?.totalUs ?? 0}</span>µs
              {" · "}depth <span className="num" style={{ color: "#A855F7" }}>{stats?.queueDepth ?? 0}</span>
            </div>
          </div>
          {history.length < 2 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 11 }}>
              Collecting samples…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={history}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis dataKey="idx" hide />
                <YAxis yAxisId="lat" tick={{ fontSize: 9, fill: "#555" }} width={45} />
                <YAxis yAxisId="q" orientation="right" tick={{ fontSize: 9, fill: "#555" }} width={35} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", fontSize: 10 }}
                  formatter={(v: number, name: string) => [
                    name === "latency" ? `${v}µs` : v.toLocaleString(),
                    name === "latency" ? "E2E latency" : "Queue depth",
                  ]}
                />
                <Line yAxisId="lat" type="monotone" dataKey="latency" stroke="#FFB800" strokeWidth={1.5} dot={false} name="latency" />
                <Line yAxisId="q" type="monotone" dataKey="queue" stroke="#A855F7" strokeWidth={1.5} dot={false} name="queue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
