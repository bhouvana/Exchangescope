import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTradeReplay } from "@workspace/api-client-react";

const C = { green: "#00FF88", red: "#FF4444", card: "#151515", border: "#1f1f1f" };

const EVENT_COLORS: Record<string, string> = {
  order_submitted:  "#6B7280",
  order_queued:     "#6B7280",
  order_matched:    "#FFB800",
  order_filled:     C.green,
  order_partial:    "#FFB800",
  order_cancelled:  C.red,
  trade_executed:   C.green,
  market_control:   "#00BFFF",
};

const EVENT_LABELS: Record<string, string> = {
  order_submitted:  "ORDER IN",
  order_queued:     "QUEUED",
  order_matched:    "MATCHED",
  order_filled:     "FILLED",
  order_partial:    "PARTIAL",
  order_cancelled:  "CANCELLED",
  trade_executed:   "TRADE",
  market_control:   "CONTROL",
};

interface MarketEvent {
  id: string;
  type: string;
  symbol: string;
  timestamp: string;
  data: Record<string, any>;
}

function EventRow({ event, isActive, onClick }: { event: MarketEvent; isActive: boolean; onClick: () => void }) {
  const color = EVENT_COLORS[event.type] ?? "#555";
  const label = EVENT_LABELS[event.type] ?? event.type.toUpperCase();

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 70px 60px 1fr",
        padding: "5px 12px",
        gap: 10,
        cursor: "pointer",
        background: isActive ? `${color}0A` : "transparent",
        borderLeft: isActive ? `2px solid ${color}` : "2px solid transparent",
        borderBottom: "1px solid #111",
        alignItems: "center",
        transition: "background 0.1s",
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9, color, letterSpacing: "0.08em", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 10, color: "#888", fontWeight: 700 }}>{event.symbol}</span>
      <span style={{ fontSize: 9, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {new Date(event.timestamp).toLocaleTimeString("en-US", { hour12: false })} ·
        {event.data?.orderId ? ` order ${String(event.data.orderId).slice(0, 8)}` : ""}
        {event.data?.price ? ` @ $${Number(event.data.price).toFixed(2)}` : ""}
        {event.data?.action ? ` ${event.data.action}` : ""}
      </span>
    </motion.div>
  );
}

export default function Replay() {
  const { data: events, isLoading } = useGetTradeReplay(undefined as any, { query: {} });
  const [sliderPos, setSliderPos] = useState(100); // 0–100%
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);

  const allEvents: MarketEvent[] = events ?? [];

  const visibleCount = useMemo(() => {
    return Math.round((sliderPos / 100) * allEvents.length);
  }, [sliderPos, allEvents.length]);

  const visibleEvents = useMemo(() => allEvents.slice(0, visibleCount), [allEvents, visibleCount]);

  // Group events by type for summary
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleEvents.forEach(e => { counts[e.type] = (counts[e.type] ?? 0) + 1; });
    return counts;
  }, [visibleEvents]);

  const currentEvent = selectedEvent ?? visibleEvents[visibleEvents.length - 1] ?? null;

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: 2 }}>MARKET REPLAY</h1>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
          {allEvents.length > 0
            ? `${allEvents.length} EVENTS · DRAG TIMELINE TO REPLAY`
            : "SUBMIT ORDERS TO GENERATE EVENTS"}
        </div>
      </div>

      {/* Timeline slider */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>TIMELINE</div>
          <div style={{ fontSize: 11, color: "#fff" }}>
            <span style={{ color: C.green, fontWeight: 700 }} className="num">{visibleCount}</span>
            <span style={{ color: "#555" }}> / {allEvents.length} events</span>
          </div>
        </div>

        {/* Timeline track */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={e => setSliderPos(Number(e.target.value))}
            style={{
              width: "100%",
              appearance: "none",
              height: 4,
              background: `linear-gradient(to right, #00FF88 ${sliderPos}%, #1a1a1a ${sliderPos}%)`,
              borderRadius: 2,
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Event type summary pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(typeCounts).map(([type, count]) => {
            const color = EVENT_COLORS[type] ?? "#555";
            const label = EVENT_LABELS[type] ?? type;
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 3 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 9, color, letterSpacing: "0.06em" }}>{label}</span>
                <span style={{ fontSize: 9, color: "#777", fontWeight: 700 }} className="num">×{count}</span>
              </div>
            );
          })}
          {Object.keys(typeCounts).length === 0 && (
            <span style={{ fontSize: 10, color: "#444" }}>No events in view</span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        {/* Event log */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "auto 70px 60px 1fr", gap: 10, fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>
            <div style={{ width: 6 }} />
            <div>TYPE</div>
            <div>SYMBOL</div>
            <div>DETAIL</div>
          </div>
          <div style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ padding: 40, color: "#555", fontSize: 12, textAlign: "center" }}>Loading events...</div>
            ) : visibleEvents.length === 0 ? (
              <div style={{ padding: 40, color: "#555", fontSize: 12, textAlign: "center" }}>
                No events to display. Drag the slider or submit orders.
              </div>
            ) : (
              <AnimatePresence>
                {[...visibleEvents].reverse().map((event, i) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isActive={currentEvent?.id === event.id}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Event detail */}
        <div>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 10 }}>EVENT DETAIL</div>
          <AnimatePresence mode="wait">
            {currentEvent ? (
              <motion.div
                key={currentEvent.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLORS[currentEvent.type] ?? "#555" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: EVENT_COLORS[currentEvent.type] ?? "#555", letterSpacing: "0.1em" }}>
                    {EVENT_LABELS[currentEvent.type] ?? currentEvent.type.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>SYMBOL</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{currentEvent.symbol}</div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 3 }}>TIMESTAMP</div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {new Date(currentEvent.timestamp).toLocaleString("en-US", { hour12: false })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 6 }}>DATA</div>
                  <div style={{ background: "#111", borderRadius: 4, padding: 10 }}>
                    {Object.entries(currentEvent.data ?? {}).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10 }}>
                        <span style={{ color: "#555", letterSpacing: "0.05em" }}>{k}</span>
                        <span style={{ color: "#ccc", fontFamily: "monospace" }}>
                          {typeof v === "number" ? v.toLocaleString() : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 40, textAlign: "center", color: "#555", fontSize: 11 }}
              >
                Click an event to see details
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
