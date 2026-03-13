"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps } from "react-joyride";
import { STATUS } from "react-joyride";
import { useTutorial } from "./use-tutorial";
import { TutorialTooltip } from "./tutorial-tooltip";
import {
  ALL_TUTORIAL_STEPS,
  logicalStepToJoyrideIndex,
} from "./tutorial-steps";

// Dynamically import react-joyride (client-only, avoids SSR issues)
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface TutorialProviderProps {
  children: React.ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { step, isActive, goToStep, skip } = useTutorial();

  const stepIndex = useMemo(
    () => logicalStepToJoyrideIndex(step),
    [step]
  );

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, type } = data;

      // Handle skip
      if (action === "skip") {
        skip();
        return;
      }

      // Handle step change
      if (type === "step:after") {
        if (action === "next") {
          goToStep(step + 1);
        } else if (action === "prev") {
          goToStep(step - 1);
        }
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
      {isActive && (
        <Joyride
          key={step}
          steps={ALL_TUTORIAL_STEPS}
          stepIndex={stepIndex}
          continuous
          showSkipButton
          disableOverlayClose
          disableCloseOnEsc={false}
          spotlightClicks={false}
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
              overlayColor: "rgba(0, 0, 0, 0.6)",
              primaryColor: "#f97316",
              zIndex: 10000,
            },
          }}
        />
      )}
    </>
  );
}
