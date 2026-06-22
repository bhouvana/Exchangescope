import { motion, AnimatePresence } from "framer-motion";
import { C } from "./constants";

interface Props {
  expanded: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ExpandedChartModal({ expanded, onClose, children }: Props) {
  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1400px, 98vw)", height: "min(850px, 94vh)",
              background: C.bg, border: `1px solid ${C.selection}30`, borderRadius: 8,
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.9)", fontFamily: "monospace",
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
