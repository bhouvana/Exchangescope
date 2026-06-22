import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLearn } from "@/context/LearnContext";
import { getLesson, getNextLesson } from "@/lib/curriculum";

export function GuidedBanner() {
  const { activeLessonId, completeLesson, clearActiveLesson } = useLearn();
  const lesson = activeLessonId ? getLesson(activeLessonId) : null;
  const next = activeLessonId ? getNextLesson(activeLessonId) : null;

  if (!lesson) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(90deg, rgba(0,255,136,0.08), rgba(0,255,136,0.02))",
        border: "1px solid #00FF8830",
        borderRadius: 6,
        padding: "12px 16px",
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        fontFamily: "monospace",
      }}
    >
      <div>
        <div style={{ fontSize: 9, color: "#00FF88", letterSpacing: "0.12em", marginBottom: 4 }}>
          LESSON {lesson.number} IN PROGRESS
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{lesson.title}</div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{lesson.subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/academy">
          <button type="button" style={{
            padding: "6px 12px", fontSize: 10, fontWeight: 700,
            background: "#111", border: "1px solid #333", borderRadius: 4, color: "#aaa", cursor: "pointer",
          }}>
            VIEW STEPS
          </button>
        </Link>
        <button
          type="button"
          onClick={() => {
            completeLesson(lesson.id);
            if (next) {
              // parent should start next via academy; just clear for now
              clearActiveLesson();
            } else {
              clearActiveLesson();
            }
          }}
          style={{
            padding: "6px 12px", fontSize: 10, fontWeight: 700,
            background: "rgba(0,255,136,0.1)", border: "1px solid #00FF88", borderRadius: 4, color: "#00FF88", cursor: "pointer",
          }}
        >
          MARK COMPLETE
        </button>
      </div>
    </motion.div>
  );
}
