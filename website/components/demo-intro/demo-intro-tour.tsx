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
    let cleanupPopover: (() => void) | undefined;

    const content = {
      messages: {
        element: '[data-demo="apps-panel"]',
        title: "Installed extensions",
        description: "Extensions add UI anywhere in your app, like this side panel.",
        progress: "1 of 3",
      },
      stripe: {
        element: hasStripe ? '[data-demo="app-page-surface"]' : '[data-demo="apps-panel"]',
        title: "Let apps extend your UI",
        description: hasStripe
          ? "Apps add UI where you allow, like this full-screen page."
          : "Features can also fill a page. This example is unavailable right now.",
        progress: "2 of 3",
      },
      agent: {
        element: '[data-demo="agent-composer"]',
        title: "Build a feature",
        description: "Next asks the agent to add a follow-up button and task form to this app.",
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
          onPopoverRender: ({ wrapper, nextButton }, { state }) => {
            const surface = state.activeElement;
            if (
              step === "stripe" &&
              hasStripe &&
              surface?.matches('[data-demo="app-page-surface"]')
            ) {
              // Keep the full page highlighted. Driver's outside placement falls
              // back to bottom-center when a surface fills the viewport.
              wrapper.classList.add("demo-tour-page-popover");
              const positionPopover = () => {
                const bounds = surface.getBoundingClientRect();
                const left = Math.max(
                  12,
                  Math.min(bounds.left + 16, window.innerWidth - wrapper.offsetWidth - 12),
                );
                const top = Math.max(
                  12,
                  Math.min(bounds.top + 16, window.innerHeight - wrapper.offsetHeight - 12),
                );
                wrapper.style.setProperty("--demo-tour-left", `${left}px`);
                wrapper.style.setProperty("--demo-tour-top", `${top}px`);
              };
              positionPopover();
              const observer = new ResizeObserver(positionPopover);
              observer.observe(surface);
              observer.observe(wrapper);
              window.addEventListener("resize", positionPopover);
              window.addEventListener("scroll", positionPopover, true);
              cleanupPopover = () => {
                observer.disconnect();
                window.removeEventListener("resize", positionPopover);
                window.removeEventListener("scroll", positionPopover, true);
              };
            }
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
      cleanupPopover?.();
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
