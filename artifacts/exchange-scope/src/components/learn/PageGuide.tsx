import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useLearn } from "@/context/LearnContext";
import { PAGE_GUIDES } from "@/lib/pageGuides";
import { getLesson } from "@/lib/curriculum";

interface PageGuideProps {
  pageId: keyof typeof PAGE_GUIDES;
}

export function PageGuide({ pageId }: PageGuideProps) {
  const { guideOpen, setGuideOpen, showProfessionalLayer, toggleProfessionalLayer, activeLessonId } = useLearn();
  const guide = PAGE_GUIDES[pageId];
  const activeLesson = activeLessonId ? getLesson(activeLessonId) : null;

  if (!guide) return null;

  const layer = showProfessionalLayer ? guide.professional : guide.beginner;

  return (
    <>
      {/* Toggle tab on right edge */}
      <button
        type="button"
        onClick={() => setGuideOpen(!guideOpen)}
        style={{
          position: "fixed",
          right: guideOpen ? 300 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 40,
          writingMode: "vertical-rl",
          padding: "12px 8px",
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRight: guideOpen ? "none" : "1px solid #2a2a2a",
          borderRadius: guideOpen ? "6px 0 0 6px" : "6px 0 0 6px",
          color: "#00FF88",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          cursor: "pointer",
          fontFamily: "monospace",
          transition: "right 0.25s ease",
        }}
      >
        {guideOpen ? "HIDE GUIDE" : "LEARN"}
      </button>

      <AnimatePresence>
        {guideOpen && (
          <motion.aside
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: 300,
              zIndex: 39,
              background: "#0D0D0D",
              borderLeft: "1px solid #1a1a1a",
              overflowY: "auto",
              fontFamily: "monospace",
            }}
          >
            <div style={{ padding: "16px 14px" }}>
              <div style={{ fontSize: 9, color: "#00FF88", letterSpacing: "0.15em", marginBottom: 6 }}>
                LEARNING GUIDE
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{guide.title}</h3>

              {activeLesson && (
                <div style={{
                  background: "rgba(0,255,136,0.06)",
                  border: "1px solid #00FF8830",
                  borderRadius: 6,
                  padding: "10px 12px",
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 9, color: "#00FF88", marginBottom: 4 }}>ACTIVE LESSON</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                    {activeLesson.number}. {activeLesson.title}
                  </div>
                  <Link href="/academy">
                    <span style={{ fontSize: 10, color: "#666", cursor: "pointer", marginTop: 4, display: "block" }}>
                      View lesson steps →
                    </span>
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={toggleProfessionalLayer}
                style={{
                  width: "100%",
                  marginBottom: 14,
                  padding: "6px 10px",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  background: showProfessionalLayer ? "rgba(0,191,255,0.1)" : "#111",
                  border: `1px solid ${showProfessionalLayer ? "#00BFFF" : "#2a2a2a"}`,
                  borderRadius: 4,
                  color: showProfessionalLayer ? "#00BFFF" : "#666",
                  cursor: "pointer",
                }}
              >
                {showProfessionalLayer ? "PROFESSIONAL VIEW" : "BEGINNER VIEW"} — TAP TO SWITCH
              </button>

              <div style={{ fontSize: 12, fontWeight: 700, color: showProfessionalLayer ? "#00BFFF" : "#fff", marginBottom: 10, lineHeight: 1.4 }}>
                {layer.headline}
              </div>

              {layer.paragraphs.map((p, i) => (
                <p key={i} style={{ fontSize: 11, color: "#999", lineHeight: 1.7, marginBottom: 12 }}>{p}</p>
              ))}

              {"lookFor" in layer && layer.lookFor && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>LOOK FOR</div>
                  {(layer.lookFor as string[]).map((item, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid #00FF8840" }}>
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {"terms" in layer && layer.terms && (layer.terms as { term: string; definition: string }[]).length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>TERMINOLOGY</div>
                  {(layer.terms as { term: string; definition: string }[]).map(t => (
                    <div key={t.term} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#00BFFF" }}>{t.term}</div>
                      <div style={{ fontSize: 10, color: "#777", lineHeight: 1.5 }}>{t.definition}</div>
                    </div>
                  ))}
                </div>
              )}

              <Link href="/academy">
                <div style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#00FF88",
                  cursor: "pointer",
                  textAlign: "center",
                  fontWeight: 700,
                }}>
                  OPEN FULL ACADEMY →
                </div>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
