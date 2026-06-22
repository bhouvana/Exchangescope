import { useState, useCallback } from "react";
import type { Drawing, DrawingPoint, ToolId } from "./types";
import { DRAW_COLORS } from "./constants";

let drawId = 0;
function nextId() { return `draw_${++drawId}`; }

export function useDrawings(initialDrawings: Drawing[] = []) {
  const [activeTool, setActiveTool] = useState<ToolId>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>(initialDrawings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<DrawingPoint | null>(null);

  const startDrawing = useCallback((tool: ToolId) => {
    setActiveTool(tool);
    setPendingPoint(null);
  }, []);

  const addPoint = useCallback((point: DrawingPoint) => {
    if (activeTool === "cursor") return;
    const color = DRAW_COLORS[drawings.length % DRAW_COLORS.length];

    if (activeTool === "horizontal" || activeTool === "vertical") {
      setDrawings(prev => [...prev, { id: nextId(), tool: activeTool, points: [point], color }]);
      setPendingPoint(null);
      return;
    }

    if (activeTool === "free") {
      setDrawings(prev => [...prev, { id: nextId(), tool: "free", points: [point], color }]);
      setPendingPoint(null);
      return;
    }

    if (pendingPoint) {
      setDrawings(prev => [...prev, { id: nextId(), tool: activeTool, points: [pendingPoint, point], color }]);
      setPendingPoint(null);
    } else {
      setPendingPoint(point);
    }
  }, [activeTool, pendingPoint, drawings.length]);

  const addFreePoint = useCallback((point: DrawingPoint) => {
    if (activeTool !== "free") return;
    setDrawings(prev => {
      const last = prev[prev.length - 1];
      if (last && last.tool === "free") {
        const updated = { ...last, points: [...last.points, point] };
        return [...prev.slice(0, -1), updated];
      }
      return prev;
    });
  }, [activeTool]);

  const selectDrawing = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const updateDrawing = useCallback((id: string, points: DrawingPoint[]) => {
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, points } : d));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setDrawings(prev => prev.filter(d => d.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const clearAll = useCallback(() => {
    setDrawings([]);
    setSelectedId(null);
  }, []);

  return {
    activeTool, setActiveTool: startDrawing,
    drawings, setDrawings,
    selectedId, selectDrawing,
    pendingPoint, addPoint, addFreePoint,
    updateDrawing, deleteSelected, clearAll,
  };
}
