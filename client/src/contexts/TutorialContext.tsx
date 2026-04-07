/**
 * TutorialContext
 *
 * Globaler State für das Demo-Tutorial.
 * Wird in main.tsx als Provider eingebunden, damit der Tutorial-State
 * über Seitenwechsel hinweg erhalten bleibt.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const TUTORIAL_SEEN_KEY = "demo_tutorial_seen";
const TUTORIAL_AUTOSTART_KEY = "demo_tutorial_autostart";

interface TutorialContextValue {
  open: boolean;
  step: number;
  openTutorial: (fromStep?: number) => void;
  closeTutorial: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  totalSteps: number;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

// Gesamtzahl der Schritte – muss mit STEPS in DemoTutorial.tsx übereinstimmen
const TOTAL_STEPS = 9;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStepState] = useState(0);

  // Autostart-Flag beim ersten Laden prüfen
  useEffect(() => {
    const flag = localStorage.getItem(TUTORIAL_AUTOSTART_KEY);
    if (flag === "1") {
      localStorage.removeItem(TUTORIAL_AUTOSTART_KEY);
      // Kurzes Delay damit die App fertig geladen ist
      const timer = setTimeout(() => {
        setStepState(0);
        setOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const openTutorial = useCallback((fromStep = 0) => {
    setStepState(fromStep);
    setOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    setOpen(false);
  }, []);

  const setStep = useCallback((s: number) => {
    setStepState(Math.max(0, Math.min(TOTAL_STEPS - 1, s)));
  }, []);

  const nextStep = useCallback(() => {
    setStepState((s) => {
      if (s >= TOTAL_STEPS - 1) {
        // Letzter Schritt → Tutorial schließen
        localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
        setOpen(false);
        return s;
      }
      return s + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setStepState((s) => Math.max(0, s - 1));
  }, []);

  return (
    <TutorialContext.Provider
      value={{ open, step, openTutorial, closeTutorial, setStep, nextStep, prevStep, totalSteps: TOTAL_STEPS }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}

/** Setzt den Tutorial-Status zurück (für erneutes Anzeigen). */
export function resetTutorial(): void {
  localStorage.removeItem(TUTORIAL_SEEN_KEY);
}
