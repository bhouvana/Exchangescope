import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLearn } from "@/context/LearnContext";
import { CURRICULUM, getLesson, type Lesson } from "@/lib/curriculum";
import type { ExperienceLevel } from "@/lib/curriculum";

const C = { green: "#00FF88", card: "#151515", border: "#1f1f1f" };

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  professional: "Professional",
};

function LessonDetail({ lesson, onStart, onComplete, isComplete }: {
  lesson: Lesson;
  onStart: () => void;
  onComplete: () => void;
  isComplete: boolean;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = lesson.steps[stepIdx];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.green, letterSpacing: "0.12em", marginBottom: 6 }}>
          LESSON {lesson.number} · {LEVEL_LABELS[lesson.level].toUpperCase()} · {lesson.duration}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{lesson.title}</h2>
        <p style={{ fontSize: 13, color: "#666" }}>{lesson.subtitle}</p>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {lesson.steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStepIdx(i)}
              style={{
                width: 28, height: 28, borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: i === stepIdx ? "rgba(0,255,136,0.15)" : "#111",
                border: `1px solid ${i === stepIdx ? C.green : "#2a2a2a"}`,
                color: i === stepIdx ? C.green : "#555",
                cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <motion.div key={stepIdx} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{step.title}</h3>
          <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.75, marginBottom: 14 }}>{step.body}</p>
          {step.realWorld && (
            <div style={{
              background: "rgba(0,191,255,0.06)",
              border: "1px solid #00BFFF25",
              borderRadius: 6,
              padding: "12px 14px",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 9, color: "#00BFFF", letterSpacing: "0.1em", marginBottom: 6 }}>IN THE REAL WORLD</div>
              <p style={{ fontSize: 12, color: "#999", lineHeight: 1.65, margin: 0 }}>{step.realWorld}</p>
            </div>
          )}
          {step.action && (
            <Link href={step.action.path}>
              <button type="button" onClick={onStart} style={{
                padding: "8px 16px", fontSize: 11, fontWeight: 700,
                background: "rgba(0,255,136,0.1)", border: `1px solid ${C.green}`,
                borderRadius: 4, color: C.green, cursor: "pointer", marginBottom: 14,
              }}>
                {step.action.label} →
              </button>
            </Link>
          )}
        </motion.div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx(i => i - 1)}
            style={{
              padding: "6px 14px", fontSize: 10, background: "#111", border: "1px solid #2a2a2a",
              borderRadius: 4, color: stepIdx === 0 ? "#333" : "#888", cursor: stepIdx === 0 ? "default" : "pointer",
            }}
          >
            PREVIOUS
          </button>
          {stepIdx < lesson.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIdx(i => i + 1)}
              style={{
                padding: "6px 14px", fontSize: 10, fontWeight: 700,
                background: "rgba(0,255,136,0.1)", border: `1px solid ${C.green}`,
                borderRadius: 4, color: C.green, cursor: "pointer",
              }}
            >
              NEXT STEP
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={lesson.practicePath}>
                <button type="button" onClick={onStart} style={{
                  padding: "6px 14px", fontSize: 10, fontWeight: 700,
                  background: "rgba(0,255,136,0.1)", border: `1px solid ${C.green}`,
                  borderRadius: 4, color: C.green, cursor: "pointer",
                }}>
                  {lesson.practiceLabel} →
                </button>
              </Link>
              {!isComplete && (
                <button type="button" onClick={onComplete} style={{
                  padding: "6px 14px", fontSize: 10, fontWeight: 700,
                  background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", cursor: "pointer",
                }}>
                  COMPLETE LESSON
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, padding: "10px 12px", background: "#0a0a0a", borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 4 }}>KEY TAKEAWAY</div>
          <div style={{ fontSize: 12, color: C.green, lineHeight: 1.6 }}>{lesson.keyTakeaway}</div>
        </div>
      </div>
    </div>
  );
}

export default function Academy() {
  const { level, setLevel, completedLessons, completeLesson, startLesson, isLessonComplete } = useLearn();
  const [selectedId, setSelectedId] = useState<string | null>(
    completedLessons.length === 0 ? "what-is-a-stock" : null,
  );

  const selected = selectedId ? getLesson(selectedId) : null;
  const progress = Math.round((completedLessons.length / CURRICULUM.length) * 100);

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", fontFamily: "monospace" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: C.green, letterSpacing: "0.15em", marginBottom: 6 }}>EXCHANGESCOPE ACADEMY</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Learn the stock market from zero</h1>
        <p style={{ fontSize: 13, color: "#666", maxWidth: 640, lineHeight: 1.7 }}>
          Eight structured lessons from "what is a stock?" to matching engine microstructure.
          Each lesson connects to a live page in this simulator — not slides, not fake charts.
        </p>
      </div>

      {/* Progress + level */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginBottom: 6 }}>
            <span>YOUR PROGRESS</span>
            <span>{completedLessons.length} / {CURRICULUM.length} lessons · {progress}%</span>
          </div>
          <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: C.green, transition: "width 0.4s" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["beginner", "intermediate", "professional"] as ExperienceLevel[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              style={{
                padding: "5px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                background: level === l ? "rgba(0,255,136,0.1)" : "#111",
                border: `1px solid ${level === l ? C.green : "#2a2a2a"}`,
                borderRadius: 4, color: level === l ? C.green : "#555", cursor: "pointer",
              }}
            >
              {LEVEL_LABELS[l].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "280px 1fr" : "1fr", gap: 16 }}>
        {/* Lesson list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CURRICULUM.map(lesson => {
            const done = isLessonComplete(lesson.id);
            const active = selectedId === lesson.id;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setSelectedId(lesson.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  background: active ? "rgba(0,255,136,0.06)" : C.card,
                  border: `1px solid ${active ? C.green : C.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: done ? C.green : "#444" }}>
                    {done ? "COMPLETE" : `LESSON ${lesson.number}`}
                  </span>
                  <span style={{ fontSize: 9, color: "#444" }}>{lesson.duration}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.green : "#fff" }}>{lesson.title}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{lesson.subtitle}</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <LessonDetail
            key={selected.id}
            lesson={selected}
            isComplete={isLessonComplete(selected.id)}
            onStart={() => startLesson(selected.id)}
            onComplete={() => {
              completeLesson(selected.id);
              const next = CURRICULUM.find(l => l.number === selected.number + 1);
              if (next) setSelectedId(next.id);
            }}
          />
        )}
      </div>

      {!selected && (
        <div style={{ textAlign: "center", padding: 60, color: "#444", fontSize: 13 }}>
          Select a lesson from the list to begin
        </div>
      )}
    </div>
  );
}
