import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ExplainProps {
  term: string;
  explanation: string;
  children?: React.ReactNode;
}

export function ExplainTip({ term, explanation, children }: ExplainProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {children ?? (
            <span
              style={{
                color: "#00FF88",
                borderBottom: "1px dashed #00FF8866",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {term}
            </span>
          )}
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "#666",
              fontSize: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            ?
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        style={{
          width: 300,
          background: "#1a1a1a",
          border: "1px solid #00FF8840",
          borderRadius: 6,
          padding: "12px 14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: "#00FF88", marginBottom: 6, letterSpacing: "0.05em" }}>
          {term}
        </div>
        <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.65 }}>{explanation}</div>
      </PopoverContent>
    </Popover>
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
