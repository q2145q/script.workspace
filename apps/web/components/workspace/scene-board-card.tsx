"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Users } from "lucide-react";

export interface SceneBoardItem {
  id: string; // "scene-{index}"
  sceneIndex: number;
  heading: string;
  intExt: string | null;
  timeOfDay: string | null;
  location: string | null;
  synopsis: string | null;
  characters: string[];
  colorTag: string | null;
  act: number | null;
  preview: string;
}

interface SceneBoardCardProps {
  scene: SceneBoardItem;
  onClick: () => void;
  onDoubleClick?: () => void;
}

export const SceneBoardCard = memo(function SceneBoardCard({ scene, onClick, onDoubleClick }: SceneBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="cursor-pointer rounded-lg border border-border bg-card p-2.5 shadow-sm transition-all hover:border-cinema/30 hover:shadow-md"
    >
      {/* Color tag strip */}
      {scene.colorTag && (
        <div
          className="mb-1.5 h-0.5 w-full rounded-full"
          style={{ backgroundColor: scene.colorTag }}
        />
      )}

      {/* Heading */}
      <p className="truncate text-xs font-semibold text-foreground">
        {scene.heading}
      </p>

      {/* Badges */}
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {scene.intExt && (
          <span className={`rounded px-1 py-0.5 text-[8px] font-bold uppercase ${
            scene.intExt === "INT"
              ? "bg-blue-500/15 text-blue-500"
              : scene.intExt === "EXT"
              ? "bg-green-500/15 text-green-500"
              : "bg-amber-500/15 text-amber-500"
          }`}>
            {scene.intExt}
          </span>
        )}
        {scene.timeOfDay && (
          <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${
            scene.timeOfDay.toUpperCase().includes("NIGHT") ||
            scene.timeOfDay.toUpperCase().includes("НОЧЬ")
              ? "bg-indigo-500/15 text-indigo-400"
              : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
          }`}>
            {scene.timeOfDay}
          </span>
        )}
        {scene.characters.length > 0 && (
          <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] text-muted-foreground bg-muted">
            <Users className="h-2 w-2" />
            {scene.characters.length}
          </span>
        )}
      </div>

      {/* Synopsis or preview */}
      {(scene.synopsis || scene.preview) && (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
          {scene.synopsis || scene.preview}
        </p>
      )}
    </div>
  );
});
