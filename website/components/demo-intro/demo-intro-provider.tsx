"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const FEATURE_PROMPT =
  "Build an app that adds a follow-up button to the navbar. Clicking it opens a modal form with a CRM contact (auto-selected on contact pages), title, and due date. Save the follow-up as a CRM task.";

export type IntroStep = "messages" | "stripe" | "agent" | null;

const DemoIntroContext = createContext<{
  step: IntroStep;
  setStep: (step: IntroStep) => void;
  dismiss: () => void;
  replay: () => void;
} | null>(null);

export function useDemoIntro() {
  const intro = useContext(DemoIntroContext);
  if (!intro) throw new Error("Demo introduction requires DemoIntroProvider");
  return intro;
}

export function DemoIntroProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const [step, setStep] = useState<IntroStep>(null);
  const storageKey = `patchsmith:demo-intro:v2:${workspaceId}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "dismissed") setStep("messages");
    } catch {
      // The introduction still works when browser storage is unavailable.
      setStep("messages");
    }
  }, [storageKey]);

  function dismiss() {
    setStep(null);
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // Dismiss for this visit even if the browser cannot remember it.
    }
  }

  return (
    <DemoIntroContext.Provider
      value={{ step, setStep, dismiss, replay: () => setStep("messages") }}
    >
      {children}
    </DemoIntroContext.Provider>
  );
}
