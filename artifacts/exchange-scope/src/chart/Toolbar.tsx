import type { ToolId } from "./types";
import { DRAW_TOOLS, C } from "./constants";

interface Props {
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
  onClearAll: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Toolbar({ activeTool, onToolChange, onClearAll, collapsed, onToggleCollapse }: Props) {
  if (collapsed) {
    return (
      <div style={{
        width: 28, borderRight: `1px solid ${C.border}`, background: C.card,
        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4,
        flexShrink: 0,
      }}>
        <button type="button" onClick={onToggleCollapse}
          style={{
            width: 22, height: 22, fontSize: 10, lineHeight: 1,
            background: "transparent", border: "none", borderRadius: 2,
            color: C.textMuted, cursor: "pointer", padding: 0,
          }} title="Expand toolbar">
          ▶
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: 36, borderRight: `1px solid ${C.border}`, background: C.card,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "4px 0", gap: 1, flexShrink: 0,
    }}>
      <button type="button" onClick={onToggleCollapse}
        style={{
          width: 28, height: 22, fontSize: 10, lineHeight: 1,
          background: "transparent", border: "none", borderRadius: 2,
          color: C.textMuted, cursor: "pointer", marginBottom: 4,
        }} title="Collapse toolbar">
        ◀
      </button>

      {DRAW_TOOLS.map(t => (
        <button key={t.id} type="button" onClick={() => onToolChange(t.id)}
          style={{
            width: 28, height: 24, padding: 0, fontSize: 12, lineHeight: 1,
            background: activeTool === t.id ? "#222" : "transparent",
            border: activeTool === t.id ? `1px solid #444` : "1px solid transparent",
            borderRadius: 3, color: activeTool === t.id ? "#fff" : C.textMuted,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}
          title={`${t.label} (${t.shortcut})`}>
          {t.icon}
        </button>
      ))}

      <div style={{ width: 20, height: 1, background: C.border, margin: "4px 0" }} />

      <button type="button" onClick={onClearAll}
        style={{
          width: 28, height: 24, padding: 0, fontSize: 9,
          background: "transparent", border: "1px solid transparent",
          borderRadius: 3, color: C.textMuted, cursor: "pointer",
        }} title="Clear all drawings">
        ✕
      </button>
    </div>
  );
}
