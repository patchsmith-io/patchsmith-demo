"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { Driver } from "driver.js";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDemoIntro } from "./demo-intro-provider";

export function DemoIntroTour({
  ready,
  hasStripe,
  docked,
  onUseExample,
}: {
  ready: boolean;
  hasStripe: boolean;
  docked: boolean;
  onUseExample: () => void;
}) {
  const { step, setStep, dismiss } = useDemoIntro();
  const [loadFailed, setLoadFailed] = useState(false);
  const finish = useEffectEvent(dismiss);
  const next = useEffectEvent(() => {
    if (step === "messages") setStep("stripe");
    else if (step === "agent") {
      dismiss();
      onUseExample();
    } else setStep("agent");
  });

  useEffect(() => {
    if (!ready || !step) return;
    let cancelled = false;
    let tour: Driver | undefined;

    const content = {
      messages: {
        element: '[data-demo="apps-panel"]',
        title: "Integrations in a panel",
        description:
          "Patchsmith adds features to existing apps. This panel shows messaging and billing integrations; you choose how to display them in your product.",
        progress: "1 of 3",
      },
      stripe: {
        element: hasStripe ? '[data-demo="app-page-surface"]' : '[data-demo="apps-panel"]',
        title: "Features as full pages",
        description: hasStripe
          ? "Here, we use Patchsmith to add Stripe billing analytics as a full page in the CRM. You choose which features to add and where they appear."
          : "Patchsmith can add full-page features to your app, such as billing analytics. The Stripe example is unavailable right now.",
        progress: "2 of 3",
      },
      agent: {
        element: '[data-demo="agent-composer"]',
        title: "Build a feature",
        description:
          "Next asks the agent to use Patchsmith to add a follow-up button and task form to this existing CRM.",
        progress: "3 of 3",
      },
    }[step];

    setLoadFailed(false);
    void import("driver.js")
      .then(({ driver }) => {
        if (cancelled) return;
        tour = driver({
          animate: false,
          overlayOpacity: 0.35,
          overlayClickBehavior: "close",
          popoverClass: "demo-tour-popover",
          stagePadding: 5,
          stageRadius: 12,
          showButtons: ["next"],
          showProgress: true,
          progressText: content.progress,
          doneBtnText: "Next",
          // Arrow keys inside Messages or the composer belong to those controls.
          allowKeyboardControl: false,
          onDoneClick: () => next(),
          onDestroyed: (_element, _step, { reason }) => {
            if (!cancelled && reason !== "api") finish();
          },
          onPopoverRender: ({ nextButton }) => {
            nextButton.focus();
          },
          steps: [
            {
              element: content.element,
              waitForElement: 3000,
              popover: {
                title: content.title,
                description: content.description,
                side: docked && step !== "stripe" ? "left" : "top",
                align: "start",
              },
            },
          ],
        });
        tour.drive();
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish();
      }
    }
    document.addEventListener("keydown", onEscape, true);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onEscape, true);
      tour?.destroy();
    };
  }, [ready, step, hasStripe, docked]);

  return loadFailed && step ? (
    <Alert className="m-2 w-auto">
      <AlertDescription>The introduction couldn’t load. You can keep exploring.</AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Dismiss
        </Button>
      </AlertAction>
    </Alert>
  ) : null;
}
