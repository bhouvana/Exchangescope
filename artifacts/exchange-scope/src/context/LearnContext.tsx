import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ExperienceLevel } from "@/lib/curriculum";

const STORAGE_KEY = "exchangescope-learn";

interface LearnState {
  onboarded: boolean;
  level: ExperienceLevel;
  completedLessons: string[];
  activeLessonId: string | null;
  guideOpen: boolean;
  showProfessionalLayer: boolean;
}

interface LearnContextValue extends LearnState {
  setLevel: (level: ExperienceLevel) => void;
  completeLesson: (id: string) => void;
  startLesson: (id: string) => void;
  clearActiveLesson: () => void;
  finishOnboarding: (level: ExperienceLevel) => void;
  setGuideOpen: (open: boolean) => void;
  toggleProfessionalLayer: () => void;
  isLessonComplete: (id: string) => boolean;
}

const defaultState: LearnState = {
  onboarded: false,
  level: "beginner",
  completedLessons: [],
  activeLessonId: null,
  guideOpen: true,
  showProfessionalLayer: false,
};

const LearnContext = createContext<LearnContextValue | null>(null);

function loadState(): LearnState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function saveState(state: LearnState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function LearnProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setLevel = useCallback((level: ExperienceLevel) => {
    setState(s => ({ ...s, level, showProfessionalLayer: level === "professional" }));
  }, []);

  const completeLesson = useCallback((id: string) => {
    setState(s => ({
      ...s,
      completedLessons: s.completedLessons.includes(id) ? s.completedLessons : [...s.completedLessons, id],
    }));
  }, []);

  const startLesson = useCallback((id: string) => {
    setState(s => ({ ...s, activeLessonId: id, guideOpen: true }));
  }, []);

  const clearActiveLesson = useCallback(() => {
    setState(s => ({ ...s, activeLessonId: null }));
  }, []);

  const finishOnboarding = useCallback((level: ExperienceLevel) => {
    setState(s => ({
      ...s,
      onboarded: true,
      level,
      showProfessionalLayer: level === "professional",
      activeLessonId: level === "beginner" ? "what-is-a-stock" : null,
    }));
  }, []);

  const setGuideOpen = useCallback((open: boolean) => {
    setState(s => ({ ...s, guideOpen: open }));
  }, []);

  const toggleProfessionalLayer = useCallback(() => {
    setState(s => ({ ...s, showProfessionalLayer: !s.showProfessionalLayer }));
  }, []);

  const isLessonComplete = useCallback(
    (id: string) => state.completedLessons.includes(id),
    [state.completedLessons],
  );

  return (
    <LearnContext.Provider
      value={{
        ...state,
        setLevel,
        completeLesson,
        startLesson,
        clearActiveLesson,
        finishOnboarding,
        setGuideOpen,
        toggleProfessionalLayer,
        isLessonComplete,
      }}
    >
      {children}
    </LearnContext.Provider>
  );
}

export function useLearn() {
  const ctx = useContext(LearnContext);
  if (!ctx) throw new Error("useLearn must be used within LearnProvider");
  return ctx;
}
