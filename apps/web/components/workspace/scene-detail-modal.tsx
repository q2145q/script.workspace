"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, MapPin, Clock, Hash } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SceneBoardItem } from "./scene-board-card";

interface SceneDetailModalProps {
  scene: SceneBoardItem | null;
  onClose: () => void;
}

export function SceneDetailModal({ scene, onClose }: SceneDetailModalProps) {
  const t = useTranslations("SceneBoard");

  return (
    <AnimatePresence>
      {scene && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="glass-panel relative z-10 w-full max-w-lg rounded-xl border border-border p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground truncate pr-4">{scene.heading}</h2>
              <button
                onClick={onClose}
                className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Color tag */}
            {scene.colorTag && (
              <div
                className="mb-3 h-1 w-full rounded-full"
                style={{ backgroundColor: scene.colorTag }}
              />
            )}

            {/* Metadata badges */}
            <div className="mb-4 flex flex-wrap gap-2">
              {scene.intExt && (
                <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                  scene.intExt === "INT"
                    ? "bg-blue-500/15 text-blue-500"
                    : scene.intExt === "EXT"
                    ? "bg-green-500/15 text-green-500"
                    : "bg-amber-500/15 text-amber-500"
                }`}>
                  <MapPin className="h-3 w-3" />
                  {scene.intExt}
                </span>
              )}
              {scene.location && (
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {scene.location}
                </span>
              )}
              {scene.timeOfDay && (
                <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {scene.timeOfDay}
                </span>
              )}
              {scene.act && (
                <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                  <Hash className="h-3 w-3" />
                  {t(`act${scene.act}`)}
                </span>
              )}
            </div>

            {/* Characters */}
            {scene.characters.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {t("characters")}
                </div>
                <div className="flex flex-wrap gap-1">
                  {scene.characters.map((char) => (
                    <span key={char} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Synopsis */}
            {scene.synopsis && (
              <div className="mb-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">{t("synopsis")}</div>
                <p className="text-sm leading-relaxed text-foreground">{scene.synopsis}</p>
              </div>
            )}

            {/* Preview text */}
            {scene.preview && (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">{t("previewText")}</div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{scene.preview}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
