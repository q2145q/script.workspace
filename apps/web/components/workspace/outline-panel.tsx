"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { LayoutList, GripVertical } from "lucide-react";
import type { Editor, JSONContent } from "@script/editor";
import { useEditorState } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface OutlinePanelProps {
  editor: Editor | null;
  documentId: string;
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

export function OutlinePanel({ editor, documentId }: OutlinePanelProps) {
  const trpc = useTRPC();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const scenes = useEditorState({
    editor: editor as Editor,
    selector: (ctx) => extractScenes(ctx.editor),
  }) as SceneCard[] | null;

  const saveMutation = useMutation(
    trpc.document.save.mutationOptions({
      onError: (err) => toast.error(`Failed to save: ${err.message}`),
    })
  );

  const createDraftMutation = useMutation(
    trpc.draft.create.mutationOptions({
      onError: () => {},
    })
  );

  const reorderScenes = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!editor || !scenes || fromIndex === toIndex) return;

      const doc = editor.state.doc;

      // Collect scene blocks: each block = [sceneHeading, ...following non-heading nodes]
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

      // Move block from fromIndex to toIndex
      const [moved] = sceneBlocks.splice(fromIndex, 1);
      sceneBlocks.splice(toIndex, 0, moved);

      const newContent: JSONContent = {
        type: "doc",
        content: [
          ...preSceneNodes,
          ...sceneBlocks.flat(),
        ],
      };

      // Snapshot before reorder
      createDraftMutation.mutate({
        documentId,
        name: "Before scene reorder (auto)",
      });

      editor.commands.setContent(newContent);
      saveMutation.mutate({ id: documentId, content: newContent });

      toast.success("Scenes reordered");
    },
    [editor, scenes, documentId, saveMutation, createDraftMutation]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      // Make the dragged element semi-transparent
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
        Switch to Script mode first
      </div>
    );
  }

  const sceneList = scenes ?? [];

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="glass-panel flex items-center gap-2 border-b border-border px-4 py-3">
        <LayoutList className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Outline</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {sceneList.length} scenes
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        {sceneList.length === 0 ? (
          <div className="py-12 text-center">
            <LayoutList className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No scenes yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Type INT. or EXT. in the editor to create a scene.
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
                      <p className="truncate text-xs font-semibold text-foreground">
                        {scene.heading}
                      </p>
                    </div>
                    {scene.preview && (
                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                        {scene.preview}
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
