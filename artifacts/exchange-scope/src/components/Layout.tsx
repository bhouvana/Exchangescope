import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useListStocks } from "@workspace/api-client-react";
import { useLearn } from "@/context/LearnContext";
import { useRegion, type Region } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { PageGuide } from "@/components/learn/PageGuide";
import { GuidedBanner } from "@/components/learn/GuidedBanner";
import { useState, useEffect, useRef } from "react";

type NavItem = { path: string; label: string; icon: React.FC<{ active: boolean }> };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Learn",
    items: [
      { path: "/academy", label: "Academy", icon: AcademyIcon },
    ],
  },
  {
    title: "Market",
    items: [
      { path: "/market", label: "Market Overview", icon: BarChartIcon },
      { path: "/sectors", label: "Sector Heatmap", icon: GridIcon },
      { path: "/tape", label: "Trade Tape", icon: ListIcon },
    ],
  },
  {
    title: "Trading",
    items: [
      { path: "/orderbook", label: "Order Book", icon: BookIcon },
      { path: "/pipeline", label: "Matching Engine", icon: CpuIcon },
      { path: "/reports", label: "Matching Engine Reports", icon: ReportIcon },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { path: "/intelligence", label: "Market Intelligence", icon: IntelligenceIcon },
    ],
  },
  {
    title: "Research",
    items: [
      { path: "/research", label: "Research Lab", icon: ResearchIcon },
    ],
  },
  {
    title: "System",
    items: [
      { path: "/control", label: "Control Center", icon: SlidersIcon },
      { path: "/traders", label: "AI Traders", icon: BotIcon },
      { path: "/analytics", label: "Analytics", icon: ActivityIcon },
      { path: "/replay", label: "Market Replay", icon: PlayIcon },
    ],
  },
];

const EXCHANGE_CARDS: { id: Region; label: string; country: string; currency: string; symbol: string; count: string; color: string; gradient: string }[] = [
  { id: "nasdaq", label: "NASDAQ", country: "United States", currency: "USD", symbol: "$", count: "3,300+", color: "#3B82F6", gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" },
  { id: "nyse",   label: "NYSE",   country: "United States", currency: "USD", symbol: "$", count: "2,300+", color: "#00FF88", gradient: "linear-gradient(135deg, #00FF88 0%, #00cc6a 100%)" },
  { id: "nse",    label: "NSE",    country: "India",         currency: "INR", symbol: "\u20B9", count: "2,700+", color: "#FF9933", gradient: "linear-gradient(135deg, #FF9933 0%, #CC7A00 100%)" },
  { id: "bse",    label: "BSE",    country: "India",         currency: "INR", symbol: "\u20B9", count: "5,500+", color: "#FF9933", gradient: "linear-gradient(135deg, #FF9933 0%, #CC7A00 100%)" },
];

function AcademyIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  );
}
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function BarChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/>
    </svg>
  );
}
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
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
function BotIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
    </svg>
  );
}
function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function ReportIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
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
function IntelligenceIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z"/><path d="M10 14h4v2a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-2z"/><path d="M12 22v-4"/>
    </svg>
  );
}
function ResearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#00FF88" : "currentColor"} strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>
    </svg>
  );
}

const ROUTE_TO_GUIDE: Record<string, string> = {
  "/market": "market",
  "/sectors": "sectors",
  "/tape": "tape",
  "/orderbook": "orderbook",
  "/pipeline": "pipeline",
  "/control": "control",
  "/traders": "traders",
  "/analytics": "analytics",
  "/replay": "replay",
  "/reports": "reports",
  "/academy": "academy",
  "/intelligence": "intelligence",
  "/research": "research",
};

const EXCHANGE_IMAGES: Record<Region, string> = {
  nasdaq: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231a365d' rx='8'/%3E%3Ctext x='20' y='26' text-anchor='middle' fill='%233B82F6' font-size='14' font-weight='bold' font-family='monospace'%3EN%3C/text%3E%3C/svg%3E",
  nyse: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%230a2e1a' rx='8'/%3E%3Ctext x='20' y='26' text-anchor='middle' fill='%2300FF88' font-size='14' font-weight='bold' font-family='monospace'%3EY%3C/text%3E%3C/svg%3E",
  nse: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23332200' rx='8'/%3E%3Ctext x='20' y='26' text-anchor='middle' fill='%23FF9933' font-size='14' font-weight='bold' font-family='monospace'%3EN%3C/text%3E%3C/svg%3E",
  bse: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23332200' rx='8'/%3E%3Ctext x='20' y='26' text-anchor='middle' fill='%23FF9933' font-size='14' font-weight='bold' font-family='monospace'%3EB%3C/text%3E%3C/svg%3E",
};

function ExchangeCard({ ex, isActive, onClick, disabled }: {
  ex: typeof EXCHANGE_CARDS[0];
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: "100%",
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: isActive
          ? `linear-gradient(135deg, ${ex.color}15, ${ex.color}08)`
          : isHovered ? "#111" : "transparent",
        border: `1px solid ${isActive ? ex.color : "#1a1a1a"}`,
        borderRadius: 6,
        cursor: disabled ? "wait" : "pointer",
        transition: "all 0.2s",
        opacity: disabled ? 0.6 : 1,
        textAlign: "left",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
        background: isActive ? ex.gradient : "#151515",
        border: `1px solid ${isActive ? ex.color : "#2a2a2a"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: isActive ? "#000" : "#555",
        fontFamily: "monospace",
        overflow: "hidden",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#000" : "#555"} strokeWidth="2.5">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? ex.color : "#bbb", letterSpacing: "0.04em" }}>
          {ex.label}
        </div>
        <div style={{ fontSize: 9, color: "#555", display: "flex", gap: 4, alignItems: "center" }}>
          <span>{ex.country === "India" ? "\u{1F1EE}\u{1F1F3}" : "\u{1F1FA}\u{1F1F8}"}</span>
          <span>{ex.country}</span>
          <span>·</span>
          <span>{ex.currency}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? ex.color : "#666" }}>
          {ex.symbol}
        </span>
        <span style={{ fontSize: 8, color: "#444" }}>
          {ex.count}
        </span>
      </div>
    </motion.button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stocks } = useListStocks({ query: { refetchInterval: 10_000 } } as any);
  const { guideOpen } = useLearn();
  const { region, regionMeta, setRegion, isSwitching } = useRegion();
  const { user, logout } = useAuth();
  const pageId = ROUTE_TO_GUIDE[location] ?? null;
  const [showSelector, setShowSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowSelector(false);
      }
    }
    if (showSelector) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSelector]);

  const isActive = (path: string) =>
    location === path || (path !== "/" && location.startsWith(path));

  const currentEx = EXCHANGE_CARDS.find(e => e.id === region)!;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <div style={{
        width: 220, minWidth: 220,
        background: "#0D0D0D",
        borderRight: "1px solid #1a1a1a",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Brand header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #1a1a1a" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
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
              </div>
            </div>
          </Link>
        </div>

        {/* Exchange selector as dropdown */}
        <div ref={selectorRef} style={{ position: "relative", padding: "6px 8px", borderBottom: "1px solid #1a1a1a" }}>
          <button
            type="button"
            onClick={() => setShowSelector(!showSelector)}
            style={{
              width: "100%",
              padding: "8px 10px",
              display: "flex", alignItems: "center", gap: 10,
              background: `linear-gradient(135deg, ${currentEx.color}15, ${currentEx.color}08)`,
              border: `1px solid ${currentEx.color}40`,
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 6, flexShrink: 0,
              background: currentEx.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#000",
              fontFamily: "monospace",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: currentEx.color, letterSpacing: "0.04em" }}>
                {currentEx.label}
              </div>
              <div style={{ fontSize: 8, color: "#555", display: "flex", gap: 3 }}>
                <span>{currentEx.country}</span>
                <span>·</span>
                <span>{currentEx.currency}</span>
                <span>·</span>
                <span>{currentEx.count} co.</span>
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={currentEx.color} strokeWidth="2" style={{ transform: showSelector ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <AnimatePresence>
            {showSelector && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute", top: "100%", left: 8, right: 8, zIndex: 100,
                  background: "#0D0D0D", border: "1px solid #2a2a2a", borderRadius: 6,
                  overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  {EXCHANGE_CARDS.map(ex => (
                    <ExchangeCard
                      key={ex.id}
                      ex={ex}
                      isActive={ex.id === region}
                      onClick={() => { setRegion(ex.id); setShowSelector(false); }}
                      disabled={isSwitching}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav style={{ flex: 1, padding: "6px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          <Link href="/">
            <motion.div whileHover={{ x: 2 }} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px", borderRadius: 6, cursor: "pointer",
              color: location === "/" ? "#00FF88" : "#666",
              fontSize: 11, marginBottom: 2,
            }}>
              <HomeIcon active={location === "/"} />
              Home
            </motion.div>
          </Link>

          {NAV_SECTIONS.map(section => (
            <div key={section.title} style={{ marginTop: 4 }}>
              <div style={{ fontSize: 8, color: "#333", letterSpacing: "0.14em", padding: "4px 10px 4px", fontWeight: 700 }}>
                {section.title.toUpperCase()}
              </div>
              {section.items.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <Link key={path} href={path}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "7px 10px", borderRadius: 6, cursor: "pointer",
                        background: active ? "rgba(0,255,136,0.08)" : "transparent",
                        borderLeft: active ? "2px solid #00FF88" : "2px solid transparent",
                        color: active ? "#00FF88" : "#777",
                        fontSize: 11,
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
            </div>
          ))}
        </nav>

        {user && (
          <div style={{ padding: "8px 12px", borderTop: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
            {user.picture && <img src={user.picture} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />}
            <div style={{ flex: 1, minWidth: 0, fontSize: 10, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </div>
            <button onClick={logout} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 9, padding: 2 }}>✕</button>
          </div>
        )}
      </div>

      <div style={{ marginLeft: 220, marginRight: guideOpen ? 300 : 0, flex: 1, minHeight: "100vh", background: "#0A0A0A", transition: "margin-right 0.25s ease" }}>
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ minHeight: "100vh" }}
        >
          <GuidedBanner />
          {children}
        </motion.div>
      </div>
      {pageId && <PageGuide pageId={pageId as any} />}
    </div>
  );
}
