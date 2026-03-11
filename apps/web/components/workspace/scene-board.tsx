"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { LayoutList, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Editor } from "@script/editor";
import { useEditorState } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseSceneHeading } from "@/lib/scene-parser";
import { SceneBoardCard, type SceneBoardItem } from "./scene-board-card";
import { SceneDetailModal } from "./scene-detail-modal";

interface SceneBoardProps {
  editor: Editor | null;
  documentId: string;
  projectId: string;
}

const COLUMNS = [
  { act: null, labelKey: "noAct" },
  { act: 1, labelKey: "act1" },
  { act: 2, labelKey: "act2" },
  { act: 3, labelKey: "act3" },
] as const;

function DroppableColumn({
  id,
  label,
  items,
  onSceneClick,
  onSceneDoubleClick,
}: {
  id: string;
  label: string;
  items: SceneBoardItem[];
  onSceneClick: (pos: number) => void;
  onSceneDoubleClick: (scene: SceneBoardItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[200px] flex-1 flex-col rounded-lg border border-border/50 bg-muted/10 transition-colors ${
        isOver ? "border-cinema/50 bg-cinema/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((scene) => (
            <SceneBoardCard
              key={scene.id}
              scene={scene}
              onClick={() => onSceneClick(scene.sceneIndex)}
              onDoubleClick={() => onSceneDoubleClick(scene)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/** Extract scene headings from editor state */
function extractEditorScenes(editor: Editor): Array<{
  index: number;
  heading: string;
  preview: string;
  pos: number;
}> {
  const scenes: Array<{ index: number; heading: string; preview: string; pos: number }> = [];
  let i = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading") {
      const heading = (node.textContent || `Scene ${i + 1}`).toUpperCase();
      // Collect all text until the next sceneHeading
      const parts: string[] = [];
      let cursor = pos + node.nodeSize;
      while (cursor < editor.state.doc.content.size) {
        const $pos = editor.state.doc.resolve(cursor);
        const next = $pos.nodeAfter;
        if (!next || next.type.name === "sceneHeading") break;
        if (next.textContent) parts.push(next.textContent);
        cursor += next.nodeSize;
      }
      scenes.push({ index: i, heading, preview: parts.join("\n"), pos });
      i++;
    }
  });

  return scenes;
}

export function SceneBoard({ editor, documentId, projectId }: SceneBoardProps) {
  const t = useTranslations("SceneBoard");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailScene, setDetailScene] = useState<SceneBoardItem | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Editor scenes (reactive)
  const editorScenes = useEditorState({
    editor: editor as Editor,
    selector: (ctx) => extractEditorScenes(ctx.editor),
  }) as Array<{ index: number; heading: string; preview: string; pos: number }> | null;

  // Scene metadata from DB
  const { data: sceneMetadata } = useQuery(
    trpc.sceneMetadata.list.queryOptions({ documentId })
  );

  const updateMutation = useMutation(
    trpc.sceneMetadata.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.sceneMetadata.list.queryKey({ documentId }),
        });
      },
    })
  );

  // Build board items combining editor + metadata
  const boardItems = useMemo<SceneBoardItem[]>(() => {
    if (!editorScenes) return [];

    return editorScenes.map((es) => {
      const meta = sceneMetadata?.find((m) => m.sceneIndex === es.index);
      const parsed = parseSceneHeading(es.heading);

      return {
        id: `scene-${es.index}`,
        sceneIndex: es.index,
        heading: es.heading,
        intExt: meta?.intExt ?? parsed.intExt,
        timeOfDay: meta?.timeOfDay ?? parsed.timeOfDay,
        location: meta?.location ?? parsed.location,
        synopsis: meta?.synopsis ?? null,
        characters: meta?.characters ?? [],
        colorTag: meta?.colorTag ?? null,
        act: meta?.act ?? null,
        preview: es.preview,
      };
    });
  }, [editorScenes, sceneMetadata]);

  // Group items by act (column)
  const columnItems = useMemo(() => {
    const groups: Record<string, SceneBoardItem[]> = {};
    for (const col of COLUMNS) {
      groups[col.act === null ? "null" : String(col.act)] = [];
    }
    for (const item of boardItems) {
      const key = item.act === null ? "null" : String(item.act);
      if (groups[key]) {
        groups[key].push(item);
      } else {
        groups["null"].push(item);
      }
    }
    return groups;
  }, [boardItems]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const draggedId = String(active.id);
      const overId = String(over.id);

      const scene = boardItems.find((s) => s.id === draggedId);
      if (!scene) return;

      // Determine target act from column ID or from the item being dropped on
      let targetAct: number | null = null;

      // Check if dropped on a column
      const targetCol = COLUMNS.find(
        (c) => (c.act === null ? "col-null" : `col-${c.act}`) === overId
      );
      if (targetCol) {
        targetAct = targetCol.act;
      } else {
        // Dropped on another scene card — use that card's act
        const targetScene = boardItems.find((s) => s.id === overId);
        if (targetScene) {
          targetAct = targetScene.act;
        }
      }

      // Only update if the act changed
      if (scene.act !== targetAct) {
        updateMutation.mutate({
          documentId,
          sceneIndex: scene.sceneIndex,
          act: targetAct,
        });
      }
    },
    [boardItems, documentId, updateMutation]
  );

  const handleSceneClick = useCallback(
    (sceneIndex: number) => {
      if (!editor || !editorScenes) return;
      const es = editorScenes.find((s) => s.index === sceneIndex);
      if (!es) return;

      editor.commands.focus();
      editor.commands.setTextSelection(es.pos + 1);
      const domNode = editor.view.domAtPos(es.pos + 1);
      if (domNode?.node) {
        const el =
          domNode.node instanceof HTMLElement
            ? domNode.node
            : domNode.node.parentElement;
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [editor, editorScenes]
  );

  const assignActsMutation = useMutation(
    trpc.ai.assignActs.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.sceneMetadata.list.queryKey({ documentId }),
        });
        toast.success(t("autoAssignDone"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleAutoAssignActs = useCallback(async () => {
    if (!editorScenes || editorScenes.length === 0) return;
    setIsAutoAssigning(true);

    try {
      const scenes = editorScenes.map((es) => {
        const meta = sceneMetadata?.find((m) => m.sceneIndex === es.index);
        return {
          sceneIndex: es.index,
          heading: es.heading,
          synopsis: meta?.synopsis || "",
        };
      });

      await assignActsMutation.mutateAsync({
        projectId,
        documentId,
        scenes,
      });
    } catch {
      // Error already handled by onError
    } finally {
      setIsAutoAssigning(false);
    }
  }, [editorScenes, sceneMetadata, documentId, projectId, assignActsMutation, t]);

  const activeScene = activeId ? boardItems.find((s) => s.id === activeId) : null;

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("switchToScript")}
      </div>
    );
  }

  if (!editorScenes || editorScenes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <LayoutList className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("noScenes")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="glass-panel flex items-center gap-2 border-b border-border px-4 py-3">
        <LayoutList className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("title")}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {boardItems.length}
        </span>
        <div className="ml-auto">
          <button
            onClick={handleAutoAssignActs}
            disabled={isAutoAssigning}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title={t("autoAssignTitle")}
          >
            {isAutoAssigning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {t("autoAssign")}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-2 overflow-x-auto p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((col) => {
            const colId = col.act === null ? "col-null" : `col-${col.act}`;
            const key = col.act === null ? "null" : String(col.act);
            return (
              <DroppableColumn
                key={colId}
                id={colId}
                label={t(col.labelKey)}
                items={columnItems[key] ?? []}
                onSceneClick={handleSceneClick}
                onSceneDoubleClick={setDetailScene}
              />
            );
          })}
          <DragOverlay>
            {activeScene ? (
              <div className="w-56 opacity-80">
                <SceneBoardCard scene={activeScene} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <SceneDetailModal scene={detailScene} onClose={() => setDetailScene(null)} />
    </div>
  );
}
