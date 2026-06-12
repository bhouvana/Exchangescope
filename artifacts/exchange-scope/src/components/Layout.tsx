import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetMarketStats } from "@workspace/api-client-react";
import { useMarketSocket } from "@/hooks/useMarketSocket";

const NAV = [
  { path: "/", label: "Market Overview", icon: BarChartIcon },
  { path: "/orderbook", label: "Order Book", icon: BookIcon },
  { path: "/pipeline", label: "Matching Engine", icon: CpuIcon },
  { path: "/control", label: "Control Center", icon: SlidersIcon },
  { path: "/replay", label: "Market Replay", icon: PlayIcon },
];

function BarChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/>
    </svg>
  );
}
function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function CpuIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <path d="M9 2v2m6-2v2M9 20v2m6-2v2M2 9h2m-2 6h2m18-6h-2m2 6h-2"/>
    </svg>
  );
}
function SlidersIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  );
}
function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stats } = useGetMarketStats({ query: { refetchInterval: 1000 } });
  const { isConnected } = useMarketSocket();

  const stateColors: Record<string, string> = {
    running: "#00FF88",
    paused: "#FFB800",
    flash_crash: "#FF4444",
    bull: "#00FF88",
    bear: "#FF4444",
    volatile: "#FFB800",
  };
  const stateColor = stateColors[stats?.marketState ?? "running"] ?? "#00FF88";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      {/* Sidebar */}
      <div style={{
        width: 220,
        minWidth: 220,
        background: "#0D0D0D",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #00FF88, #00cc6a)",
              borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
                ExchangeScope
              </div>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Market Lab
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = location === path || (path !== "/" && location.startsWith(path));
            return (
              <Link key={path} href={path}>
                <motion.div
                  whileHover={{ x: 2 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: active ? "rgba(0,255,136,0.08)" : "transparent",
                    borderLeft: active ? "2px solid #00FF88" : "2px solid transparent",
                    color: active ? "#00FF88" : "#777",
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    transition: "all 0.15s",
                    letterSpacing: "0.02em",
                  }}
                >
                  <Icon active={active} />
                  {label}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Live stats footer */}
        <div style={{ padding: "12px 12px", borderTop: "1px solid #1a1a1a", fontSize: 10, color: "#555" }}>
          {/* WS connection */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div
              className={isConnected ? "pulse-dot" : ""}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isConnected ? stateColor : "#444",
                flexShrink: 0,
              }}
            />
            <span style={{ color: isConnected ? stateColor : "#444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {isConnected ? (stats?.marketState ?? "running") : "offline"}
            </span>
          </div>

          {stats && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>orders/s</span>
                <span style={{ color: "#00FF88", fontWeight: 600 }} className="num">
                  {stats.ordersPerSecond?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>trades/s</span>
                <span style={{ color: "#00FF88", fontWeight: 600 }} className="num">
                  {stats.tradesPerSecond?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>latency</span>
                <span style={{ color: "#FFB800", fontWeight: 600 }} className="num">
                  {stats.latency?.totalUs ? `${stats.latency.totalUs}µs` : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh", background: "#0A0A0A" }}>
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ minHeight: "100vh" }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
