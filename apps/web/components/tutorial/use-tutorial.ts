"use client";

import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useTutorial() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: state, isLoading } = useQuery(
    trpc.tutorial.getState.queryOptions()
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: trpc.tutorial.getState.queryKey(),
    });
  }, [queryClient, trpc]);

  const setStepMutation = useMutation(
    trpc.tutorial.setStep.mutationOptions({
      onSuccess: invalidate,
    })
  );

  const skipMutation = useMutation(
    trpc.tutorial.skip.mutationOptions({
      onSuccess: invalidate,
    })
  );

  const restartMutation = useMutation(
    trpc.tutorial.restart.mutationOptions({
      onSuccess: invalidate,
    })
  );

  const createDemoMutation = useMutation(
    trpc.tutorial.createDemoProject.mutationOptions({
      onSuccess: invalidate,
    })
  );

  const step = state?.tutorialStep ?? 0;
  const isCompleted = state?.tutorialCompleted ?? false;
  const demoProjectId = state?.demoProjectId ?? null;
  const isActive = step > 0 && !isCompleted;

  const nextStep = useCallback(() => {
    setStepMutation.mutate({ step: step + 1 });
  }, [setStepMutation, step]);

  const goToStep = useCallback(
    (s: number) => {
      setStepMutation.mutate({ step: s });
    },
    [setStepMutation]
  );

  const skip = useCallback(() => {
    skipMutation.mutate();
  }, [skipMutation]);

  const restart = useCallback(() => {
    restartMutation.mutate();
  }, [restartMutation]);

  const createDemoProject = useCallback(() => {
    return createDemoMutation.mutateAsync();
  }, [createDemoMutation]);

  return {
    step,
    isActive,
    isCompleted,
    isLoading,
    demoProjectId,
    nextStep,
    goToStep,
    skip,
    restart,
    createDemoProject,
    isCreatingDemo: createDemoMutation.isPending,
  };
}
