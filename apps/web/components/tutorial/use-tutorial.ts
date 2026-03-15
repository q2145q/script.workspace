"use client";

/**
 * Tutorial hook — DISABLED.
 * The tutorial router is commented out in packages/api/src/root.ts.
 * This stub returns inactive state so all importing components compile.
 * Re-enable by uncommenting the router and restoring the real implementation.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const noopAsync = () => Promise.resolve({ projectId: "", documentId: "" });

export function useTutorial() {
  return {
    step: 0,
    isActive: false,
    isCompleted: true,
    isLoading: false,
    demoProjectId: null,
    nextStep: noop,
    goToStep: noop as (s: number) => void,
    skip: noop,
    restart: noop,
    createDemoProject: noopAsync,
    isCreatingDemo: false,
  };
}
