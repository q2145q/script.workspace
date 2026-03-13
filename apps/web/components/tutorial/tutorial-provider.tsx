"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps } from "react-joyride";
import { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useTutorial } from "./use-tutorial";
import { TutorialTooltip } from "./tutorial-tooltip";
import {
  ALL_TUTORIAL_STEPS,
  TOTAL_STEPS,
  logicalStepToJoyrideIndex,
} from "./tutorial-steps";

// Dynamically import react-joyride (client-only, avoids SSR issues)
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface TutorialProviderProps {
  children: React.ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { step, isActive, goToStep, skip } = useTutorial();
  const [ready, setReady] = useState(false);

  const stepIndex = useMemo(
    () => logicalStepToJoyrideIndex(step),
    [step]
  );

  // Wait for DOM to be fully rendered before starting joyride
  useEffect(() => {
    if (!isActive) {
      setReady(false);
      return;
    }

    const timer = setTimeout(() => {
      setReady(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isActive]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, type } = data;

      // Handle skip button
      if (action === ACTIONS.SKIP) {
        skip();
        return;
      }

      // Handle close button
      if (action === ACTIONS.CLOSE) {
        skip();
        return;
      }

      // Handle step navigation (next/prev)
      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          const nextStep = step + 1;
          if (nextStep > TOTAL_STEPS) {
            skip();
          } else {
            goToStep(nextStep);
          }
        } else if (action === ACTIONS.PREV) {
          goToStep(Math.max(1, step - 1));
        }
        return;
      }

      // Handle tour end
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        skip();
      }
    },
    [step, goToStep, skip]
  );

  return (
    <>
      {children}
      {isActive && ready && (
        <Joyride
          run={true}
          steps={ALL_TUTORIAL_STEPS}
          stepIndex={stepIndex}
          continuous
          showSkipButton
          disableOverlayClose
          disableCloseOnEsc={false}
          spotlightClicks={false}
          scrollToFirstStep
          callback={handleCallback}
          tooltipComponent={TutorialTooltip}
          locale={{
            back: "Назад",
            close: "Закрыть",
            last: "Завершить",
            next: "Далее",
            open: "Открыть",
            skip: "Пропустить",
          }}
          styles={{
            options: {
              arrowColor: "#18181b",
              backgroundColor: "#18181b",
              overlayColor: "rgba(0, 0, 0, 0.5)",
              primaryColor: "#f97316",
              zIndex: 10000,
            },
          }}
        />
      )}
    </>
  );
}
