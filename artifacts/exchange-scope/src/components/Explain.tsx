import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExplainProps {
  term: string;
  explanation: string;
  children?: React.ReactNode;
}

export function ExplainTip({ term, explanation, children }: ExplainProps) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children ?? <span style={{ color: "#00FF88", borderBottom: "1px dashed #00FF8866", cursor: "help" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>{term}</span>}
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          width: 14, height: 14, borderRadius: "50%",
          background: "#1a1a1a",
          border: "1px solid #333",
          color: "#666",
          fontSize: 9,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "help", flexShrink: 0, fontWeight: 700,
        }}
      >?</span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              width: 260,
              background: "#1a1a1a",
              border: "1px solid #00FF8840",
              borderRadius: 6,
              padding: "10px 12px",
              zIndex: 9999,
              pointerEvents: "none",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00FF88", marginBottom: 4, letterSpacing: "0.05em" }}>
              {term}
            </div>
            <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.6 }}>{explanation}</div>
            {/* Arrow */}
            <div style={{
              position: "absolute",
              bottom: -5, left: "50%", transform: "translateX(-50%)",
              width: 8, height: 8,
              background: "#1a1a1a",
              border: "1px solid #00FF8840",
              borderTop: "none", borderLeft: "none",
              rotate: "45deg",
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

interface InfoBoxProps {
  title: string;
  children: React.ReactNode;
  color?: string;
  collapsible?: boolean;
}

export function InfoBox({ title, children, color = "#00FF88", collapsible = false }: InfoBoxProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <div
        onClick={() => collapsible && setCollapsed(c => !c)}
        style={{
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: collapsible ? "pointer" : "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 12, background: color, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.08em" }}>{title}</span>
        </div>
        {collapsible && (
          <span style={{ fontSize: 10, color: "#555" }}>{collapsed ? "SHOW" : "HIDE"}</span>
        )}
      </div>
      {!collapsed && (
        <div style={{ padding: "0 12px 10px 12px", fontSize: 11, color: "#aaa", lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
}
