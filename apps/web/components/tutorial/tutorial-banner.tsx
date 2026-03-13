"use client";

import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useTutorial } from "./use-tutorial";

/**
 * Banner shown on the dashboard for users who haven't started or completed the tutorial.
 * Clicking "Start" creates the demo project and redirects to it.
 */
export function TutorialBanner() {
  const router = useRouter();
  const {
    step,
    isCompleted,
    isLoading,
    demoProjectId,
    createDemoProject,
    isCreatingDemo,
    skip,
  } = useTutorial();

  // Don't show if loading, already completed, or already active
  if (isLoading || isCompleted || step > 0) return null;

  const handleStart = async () => {
    try {
      const result = await createDemoProject();
      if (result.projectId && result.documentId) {
        router.push(`/project/${result.projectId}/script/${result.documentId}`);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleResume = () => {
    if (demoProjectId) {
      router.push(`/project/${demoProjectId}`);
    }
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5 p-4">
      <button
        onClick={() => skip()}
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
          <Sparkles className="h-5 w-5 text-orange-500" />
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Добро пожаловать в Script!
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Пройдите интерактивный туториал — мы покажем все возможности редактора на примере
            сценария фильма «Начало» Кристофера Нолана.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleStart}
              disabled={isCreatingDemo}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {isCreatingDemo ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Создаём проект...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Начать туториал
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
