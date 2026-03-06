"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export function useChatStream(projectId: string) {
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<ChatMessage | null>(null);
  const [overrideProvider, setOverrideProvider] = useState<string | null>(null);
  const [overrideModel, setOverrideModel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Load history — increased limit for full context
  const { data: historyData } = useQuery(
    trpc.chat.list.queryOptions({ projectId, limit: 100 })
  );

  // Chat status (has provider)
  const { data: statusData } = useQuery(
    trpc.chat.status.queryOptions({ projectId })
  );

  // Clear mutation
  const clearMutation = useMutation(
    trpc.chat.clear.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.list.queryKey({ projectId, limit: 100 }),
        });
      },
    })
  );

  // Build messages list
  const messages: ChatMessage[] = [
    ...(historyData?.messages?.map((m) => ({
      id: m.id,
      role: m.role as "USER" | "ASSISTANT",
      content: m.content,
      createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
    })) ?? []),
    ...(optimisticUserMsg ? [optimisticUserMsg] : []),
    ...(isStreaming
      ? [
          {
            id: "streaming",
            role: "ASSISTANT" as const,
            content: streamingContent,
            createdAt: new Date().toISOString(),
            isStreaming: true,
          },
        ]
      : []),
  ];

  const sendMessage = useCallback(
    async (content: string, editorContext?: { currentSceneText?: string; adjacentScenesText?: string; documentSummary?: string }) => {
      setOptimisticUserMsg({
        id: `optimistic-${Date.now()}`,
        role: "USER",
        content,
        createdAt: new Date().toISOString(),
      });

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            content,
            editorContext,
            overrideProvider: overrideProvider || undefined,
            overrideModel: overrideModel || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullText += data.token;
                  setStreamingContent(fullText);
                }
                if (data.done) {
                  setOptimisticUserMsg(null);
                  queryClient.invalidateQueries({
                    queryKey: trpc.chat.list.queryKey({ projectId, limit: 100 }),
                  });
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Chat stream error:", err);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        setOptimisticUserMsg(null);
        abortRef.current = null;
      }
    },
    [projectId, queryClient, trpc, overrideProvider, overrideModel]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearHistory = useCallback(() => {
    clearMutation.mutate({ projectId });
  }, [clearMutation, projectId]);

  const setModelOverride = useCallback((provider: string | null, model: string | null) => {
    setOverrideProvider(provider);
    setOverrideModel(model);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
    clearHistory,
    hasProvider: statusData?.hasProvider ?? false,
    overrideProvider,
    overrideModel,
    setModelOverride,
  };
}
