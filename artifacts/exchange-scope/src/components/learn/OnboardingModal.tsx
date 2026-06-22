import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useLearn } from "@/context/LearnContext";
import type { ExperienceLevel } from "@/lib/curriculum";

const OPTIONS: { level: ExperienceLevel; title: string; desc: string }[] = [
  {
    level: "beginner",
    title: "I'm completely new",
    desc: "I've never bought a stock and don't know what an order book is. Start me from zero.",
  },
  {
    level: "intermediate",
    title: "I know the basics",
    desc: "I understand stocks and brokers, but I want to see how exchanges work internally.",
  },
  {
    level: "professional",
    title: "I work in finance",
    desc: "Show me microstructure, latency, and matching engine internals. Skip the hand-holding.",
  },
];

export function OnboardingModal() {
  const { onboarded, finishOnboarding } = useLearn();
  const [, setLocation] = useLocation();

  const handleSelect = (level: ExperienceLevel) => {
    finishOnboarding(level);
    if (level === "beginner") setLocation("/academy");
    else if (level === "professional") setLocation("/analytics");
    else setLocation("/academy");
  };

  return (
    <AnimatePresence>
      {!onboarded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "monospace",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#0D0D0D",
              border: "1px solid #00FF8840",
              borderRadius: 10,
              padding: "32px 28px",
            }}
          >
            <div style={{ fontSize: 10, color: "#00FF88", letterSpacing: "0.2em", marginBottom: 10 }}>
              WELCOME TO EXCHANGESCOPE
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>
              Learn how stock markets actually work
            </h2>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.65, marginBottom: 24 }}>
              This is not a trading app. It is an educational simulator that shows what happens
              inside an exchange when millions of orders collide — using a real matching engine.
              Tell us where to start:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OPTIONS.map(opt => (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => handleSelect(opt.level)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    background: "#111",
                    border: "1px solid #2a2a2a",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#00FF88"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            <p style={{ fontSize: 10, color: "#444", marginTop: 20, lineHeight: 1.5 }}>
              All prices and companies here are simulated. No real money is involved.
              You can change your level anytime from the Academy.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
