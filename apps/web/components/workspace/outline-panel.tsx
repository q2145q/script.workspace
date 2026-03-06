"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { LayoutList, GripVertical, Sparkles, Loader2 } from "lucide-react";
import type { Editor, JSONContent } from "@script/editor";
import { useEditorState } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface OutlinePanelProps {
  editor: Editor | null;
  documentId: string;
  projectId: string;
}

interface SceneCard {
  index: number;
  heading: string;
  preview: string;
  pos: number;
}

function extractScenes(editor: Editor): SceneCard[] {
  const scenes: SceneCard[] = [];
  let sceneIndex = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading") {
      const heading = node.textContent || `Scene ${sceneIndex + 1}`;

      let preview = "";
      const nextPos = pos + node.nodeSize;
      if (nextPos < editor.state.doc.content.size) {
        const $next = editor.state.doc.resolve(nextPos);
        const nextNode = $next.nodeAfter;
        if (nextNode && nextNode.type.name !== "sceneHeading") {
          preview = nextNode.textContent.slice(0, 120);
        }
      }

      scenes.push({ index: sceneIndex, heading, preview, pos });
      sceneIndex++;
    }
  });

  return scenes;
}

function extractSceneText(editor: Editor, scene: SceneCard): string {
  const doc = editor.state.doc;
  let endPos = doc.content.size;

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" && pos > scene.pos && endPos === doc.content.size) {
      endPos = pos;
    }
  });

  return doc.textBetween(scene.pos, endPos, "\n");
}

export function OutlinePanel({ editor, documentId, projectId }: OutlinePanelProps) {
  const t = useTranslations("Outline");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const [generatingScene, setGeneratingScene] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const scenes = useEditorState({
    editor: editor as Editor,
    selector: (ctx) => extractScenes(ctx.editor),
  }) as SceneCard[] | null;

  // Load saved synopses from document metadata
  const { data: docData } = useQuery(
    trpc.document.getById.queryOptions({ id: documentId })
  );

  const savedSynopses: Record<string, string> =
    (docData?.metadata as Record<string, unknown> | null)?.sceneSynopses as Record<string, string> ?? {};

  const saveMutation = useMutation(
    trpc.document.save.mutationOptions({
      onError: (err) => toast.error(t("failedSave", { message: err.message })),
    })
  );

  const createDraftMutation = useMutation(
    trpc.draft.create.mutationOptions({
      onError: () => {},
    })
  );

  const saveMetadataMutation = useMutation(
    trpc.document.saveMetadata.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const sceneSynopsisMutation = useMutation(
    trpc.ai.generateSceneSynopsis.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const allSynopsesMutation = useMutation(
    trpc.ai.generateAllSceneSynopses.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleGenerateSynopsis = async (scene: SceneCard) => {
    if (!editor) return;
    setGeneratingScene(scene.heading);

    try {
      const sceneText = extractSceneText(editor, scene);
      const result = await sceneSynopsisMutation.mutateAsync({
        projectId,
        sceneHeading: scene.heading,
        sceneText,
      });

      const updated = { ...savedSynopses, [scene.heading]: result.synopsis };
      await saveMetadataMutation.mutateAsync({
        id: documentId,
        metadata: { sceneSynopses: updated },
      });

      queryClient.invalidateQueries({
        queryKey: trpc.document.getById.queryKey({ id: documentId }),
      });
    } finally {
      setGeneratingScene(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!editor || !scenes || scenes.length === 0) return;
    setIsGeneratingAll(true);

    try {
      const scenesWithText = scenes.map((scene) => ({
        heading: scene.heading,
        text: extractSceneText(editor, scene),
      }));

      const result = await allSynopsesMutation.mutateAsync({
        projectId,
        scenes: scenesWithText,
      });

      await saveMetadataMutation.mutateAsync({
        id: documentId,
        metadata: { sceneSynopses: result.synopses },
      });

      queryClient.invalidateQueries({
        queryKey: trpc.document.getById.queryKey({ id: documentId }),
      });

      const count = Object.values(result.synopses).filter(Boolean).length;
      toast.success(t("generatedSynopses", { count }));
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const reorderScenes = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!editor || !scenes || fromIndex === toIndex) return;

      const doc = editor.state.doc;

      const sceneBlocks: JSONContent[][] = [];
      const preSceneNodes: JSONContent[] = [];
      let currentBlock: JSONContent[] | null = null;

      doc.forEach((node) => {
        const json = node.toJSON();
        if (node.type.name === "sceneHeading") {
          if (currentBlock) {
            sceneBlocks.push(currentBlock);
          }
          currentBlock = [json];
        } else if (currentBlock) {
          currentBlock.push(json);
        } else {
          preSceneNodes.push(json);
        }
      });
      if (currentBlock) {
        sceneBlocks.push(currentBlock);
      }

      if (sceneBlocks.length <= 1) return;

      const [moved] = sceneBlocks.splice(fromIndex, 1);
      sceneBlocks.splice(toIndex, 0, moved);

      const newContent: JSONContent = {
        type: "doc",
        content: [
          ...preSceneNodes,
          ...sceneBlocks.flat(),
        ],
      };

      createDraftMutation.mutate({
        documentId,
        name: t("autoReorderDraft"),
      });

      editor.commands.setContent(newContent);
      saveMutation.mutate({ id: documentId, content: newContent });

      toast.success(t("scenesReordered"));
    },
    [editor, scenes, documentId, saveMutation, createDraftMutation]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      if (e.currentTarget) {
        dragNodeRef.current = e.currentTarget;
        requestAnimationFrame(() => {
          if (dragNodeRef.current) {
            dragNodeRef.current.style.opacity = "0.4";
          }
        });
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault();
      const sourceIndex = dragIndex;
      setDragIndex(null);
      setDragOverIndex(null);
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "";
        dragNodeRef.current = null;
      }

      if (sourceIndex === null || sourceIndex === targetIndex) return;
      reorderScenes(sourceIndex, targetIndex);
    },
    [dragIndex, reorderScenes]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "";
      dragNodeRef.current = null;
    }
  }, []);

  const handleSceneClick = useCallback(
    (pos: number) => {
      if (!editor) return;
      editor.commands.focus();
      editor.commands.setTextSelection(pos + 1);
      const domNode = editor.view.domAtPos(pos + 1);
      if (domNode?.node) {
        const el =
          domNode.node instanceof HTMLElement
            ? domNode.node
            : domNode.node.parentElement;
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("switchToScript")}
      </div>
    );
  }

  const sceneList = scenes ?? [];

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="glass-panel flex items-center gap-2 border-b border-border px-4 py-3">
        <LayoutList className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("title")}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {t("scenes", { count: sceneList.length })}
        </span>
        <div className="flex-1" />
        {sceneList.length > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll}
            className="flex items-center gap-1 rounded-md bg-ai-accent px-2 py-1 text-[10px] font-medium text-white hover:bg-ai-accent/80 disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {Object.keys(savedSynopses).length > 0 ? t("regenerateAll") : t("generateAll")}
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        {sceneList.length === 0 ? (
          <div className="py-12 text-center">
            <LayoutList className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">{t("noScenes")}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {t("noScenesHint")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sceneList.map((scene, i) => (
              <div
                key={`scene-${i}-${scene.heading}`}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                onClick={() => handleSceneClick(scene.pos)}
                className={`group cursor-pointer rounded-lg border p-3 transition-all duration-200 select-none ${
                  dragIndex === i
                    ? "border-ai-accent/50 opacity-50"
                    : dragOverIndex === i
                    ? "border-ai-accent bg-ai-accent/5 scale-[1.02]"
                    : "border-border hover:border-ai-accent/30 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-grab text-muted-foreground/30 group-hover:text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="flex-shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <p className="flex-1 truncate text-xs font-semibold text-foreground">
                        {scene.heading}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateSynopsis(scene);
                        }}
                        disabled={generatingScene === scene.heading || isGeneratingAll}
                        className="flex-shrink-0 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-opacity hover:text-ai-accent group-hover:opacity-100 disabled:opacity-50"
                        title={t("generateSynopsis")}
                      >
                        {generatingScene === scene.heading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-ai-accent" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {scene.preview && (
                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                        {scene.preview}
                      </p>
                    )}
                    {savedSynopses[scene.heading] && (
                      <p className="mt-1 line-clamp-2 text-[10px] italic leading-relaxed text-ai-accent/70">
                        {savedSynopses[scene.heading]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
