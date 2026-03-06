"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Users,
  Layers,
  Film,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Target,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  SceneAnalysis,
  CharacterAnalysis,
  StructureAnalysis,
} from "@script/types";

type AnalysisTab = "scene" | "characters" | "structure";

interface AnalysisPanelProps {
  editor: Editor | null;
  projectId: string;
}

function extractCurrentSceneText(editor: Editor): string {
  const { doc, selection } = editor.state;
  const cursorPos = selection.from;

  let sceneStart = 0;
  let sceneEnd = doc.content.size;

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      if (pos <= cursorPos) {
        sceneStart = pos;
      } else if (sceneEnd === doc.content.size) {
        sceneEnd = pos;
      }
    }
  });

  return doc.textBetween(sceneStart, sceneEnd, "\n");
}

function extractFullText(editor: Editor): string {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
}

const TABS: { key: AnalysisTab; labelKey: "scene" | "characters" | "structure"; icon: typeof Film }[] = [
  { key: "scene", labelKey: "scene", icon: Film },
  { key: "characters", labelKey: "characters", icon: Users },
  { key: "structure", labelKey: "structure", icon: Layers },
];

// ============================================================
// Scene Analysis
// ============================================================

function SceneAnalysisView({ data }: { data: SceneAnalysis }) {
  const t = useTranslations("Analysis");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "characters", "conflict"])
  );

  const toggle = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sections = [
    { key: "summary", label: t("summary"), content: data.summary },
    { key: "function", label: t("sceneFunction"), content: data.scene_function },
    {
      key: "characters",
      label: t("characters"),
      content: null,
      render: () => (
        <div className="space-y-1.5">
          {data.characters_present.map((name) => (
            <div key={name} className="flex items-start gap-2">
              <span className="rounded bg-ai-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-ai-accent">
                {name}
              </span>
              {data.character_goals[name] && (
                <span className="text-xs text-muted-foreground">
                  {data.character_goals[name]}
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    { key: "conflict", label: t("conflict"), content: data.conflict },
    { key: "stakes", label: t("stakes"), content: data.stakes },
    { key: "tone", label: t("emotionalTone"), content: data.emotional_tone },
    { key: "pacing", label: t("pacing"), content: data.pacing },
    {
      key: "events",
      label: t("keyEvents"),
      content: null,
      render: () => (
        <ul className="space-y-1">
          {data.key_events.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="mt-0.5 text-ai-accent">&#8226;</span>
              {e}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "visual",
      label: t("visualElements"),
      content: null,
      render: () => (
        <div className="flex flex-wrap gap-1">
          {data.visual_elements.map((v, i) => (
            <span
              key={i}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {v}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "problems",
      label: t("problems"),
      icon: AlertTriangle,
      content: null,
      render: () =>
        data.problems.length > 0 ? (
          <ul className="space-y-1">
            {data.problems.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">{t("noProblems")}</p>
        ),
    },
    {
      key: "suggestions",
      label: t("suggestions"),
      icon: Lightbulb,
      content: null,
      render: () =>
        data.suggestions.length > 0 ? (
          <ul className="space-y-1">
            {data.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-400">
                <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">{t("noSuggestions")}</p>
        ),
    },
  ];

  return (
    <div className="space-y-0.5">
      {sections.map((section) => (
        <div key={section.key} className="rounded-md border border-transparent hover:border-border">
          <button
            onClick={() => toggle(section.key)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
          >
            {expandedSections.has(section.key) ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-foreground">{section.label}</span>
          </button>
          <AnimatePresence>
            {expandedSections.has(section.key) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2 pl-8">
                  {section.render ? (
                    section.render()
                  ) : (
                    <p className="text-xs text-muted-foreground">{section.content}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Character Analysis
// ============================================================

function CharacterAnalysisView({ data }: { data: CharacterAnalysis }) {
  const t = useTranslations("Analysis");
  const [expandedId, setExpandedId] = useState<string | null>(
    data.characters[0]?.name ?? null
  );

  return (
    <div className="space-y-0.5">
      {data.characters.map((char) => (
        <div key={char.name} className="rounded-md border border-transparent hover:border-border">
          <button
            onClick={() => setExpandedId(expandedId === char.name ? null : char.name)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            {expandedId === char.name ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm font-medium text-foreground">{char.name}</span>
            <span className="text-[10px] text-muted-foreground">{char.role_in_story}</span>
          </button>
          <AnimatePresence>
            {expandedId === char.name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 px-3 pb-3 pl-8">
                  <p className="text-xs text-muted-foreground">{char.description}</p>

                  {/* Traits */}
                  <div className="flex flex-wrap gap-1">
                    {char.traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-ai-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-ai-accent"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>

                  {/* Goals */}
                  {char.goals.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t("goals")}
                      </p>
                      <ul className="space-y-0.5">
                        {char.goals.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Target className="mt-0.5 h-3 w-3 flex-shrink-0 text-ai-accent" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Motivations */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("motivations")}
                    </p>
                    <p className="text-xs text-muted-foreground">{char.motivations}</p>
                  </div>

                  {/* Conflicts */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t("internalConflict")}
                      </p>
                      <p className="text-xs text-muted-foreground">{char.internal_conflict}</p>
                    </div>
                    <div>
                      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t("externalConflict")}
                      </p>
                      <p className="text-xs text-muted-foreground">{char.external_conflict}</p>
                    </div>
                  </div>

                  {/* Relationships */}
                  {char.relationships.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t("relationships")}
                      </p>
                      <div className="space-y-0.5">
                        {char.relationships.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{r.character}</span>
                            <span>&mdash;</span>
                            <span>{r.relationship}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Structure Analysis
// ============================================================

function StructureAnalysisView({ data }: { data: StructureAnalysis }) {
  const t = useTranslations("Analysis");
  return (
    <div className="space-y-3 p-3">
      {/* Act + Phase */}
      <div className="flex items-center gap-2">
        <span className="rounded bg-ai-accent/10 px-2 py-1 text-xs font-medium text-ai-accent">
          {data.act}
        </span>
        <span className="text-xs text-muted-foreground">{data.story_phase}</span>
      </div>

      {/* Tension + Progress */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("tension")}
          </p>
          <p className="text-sm font-medium text-foreground">{data.tension_level}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("progress")}
          </p>
          <p className="text-sm font-medium text-foreground">{data.story_progress}</p>
        </div>
      </div>

      {/* Narrative Function */}
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("narrativeFunction")}
        </p>
        <p className="text-xs text-muted-foreground">{data.narrative_function}</p>
      </div>

      {/* Stakes */}
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("stakes")}
        </p>
        <p className="text-xs text-muted-foreground">{data.stakes}</p>
      </div>

      {/* Turning Points */}
      {data.turning_points.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("turningPoints")}
          </p>
          <ul className="space-y-1">
            {data.turning_points.map((tp, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Eye className="mt-0.5 h-3 w-3 flex-shrink-0 text-ai-accent" />
                {tp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflicts */}
      {data.conflicts.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("conflicts")}
          </p>
          <ul className="space-y-1">
            {data.conflicts.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-0.5 text-amber-400">&#8226;</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Problems */}
      {data.structure_problems.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("problems")}
          </p>
          <ul className="space-y-1">
            {data.structure_problems.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("suggestions")}
          </p>
          <ul className="space-y-1">
            {data.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-400">
                <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Panel
// ============================================================

export function AnalysisPanel({ editor, projectId }: AnalysisPanelProps) {
  const t = useTranslations("Analysis");
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<AnalysisTab>("scene");

  // Scene analysis
  const [sceneResult, setSceneResult] = useState<SceneAnalysis | null>(null);
  const sceneMutation = useMutation(
    trpc.ai.analyzeScene.mutationOptions({
      onSuccess: (data) => setSceneResult(data),
      onError: (err) => toast.error(err.message),
    })
  );

  // Character analysis
  const [charResult, setCharResult] = useState<CharacterAnalysis | null>(null);
  const charMutation = useMutation(
    trpc.ai.analyzeCharacters.mutationOptions({
      onSuccess: (data) => setCharResult(data),
      onError: (err) => toast.error(err.message),
    })
  );

  // Structure analysis
  const [structResult, setStructResult] = useState<StructureAnalysis | null>(null);
  const structMutation = useMutation(
    trpc.ai.analyzeStructure.mutationOptions({
      onSuccess: (data) => setStructResult(data),
      onError: (err) => toast.error(err.message),
    })
  );

  const handleAnalyze = () => {
    if (!editor) {
      toast.error(t("editorNotReady"));
      return;
    }

    const text =
      activeTab === "characters"
        ? extractFullText(editor)
        : extractCurrentSceneText(editor);

    if (!text.trim()) {
      toast.error(t("noText"));
      return;
    }

    switch (activeTab) {
      case "scene":
        sceneMutation.mutate({ projectId, sceneText: text });
        break;
      case "characters":
        charMutation.mutate({ projectId, text });
        break;
      case "structure":
        structMutation.mutate({ projectId, sceneText: text });
        break;
    }
  };

  const isLoading =
    sceneMutation.isPending || charMutation.isPending || structMutation.isPending;

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-ai-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Analyze button */}
      <div className="border-b border-border p-3">
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !editor}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-ai-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-ai-accent/80 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("analyzing")}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {activeTab === "scene" && t("analyzeScene")}
              {activeTab === "characters" && t("analyzeCharacters")}
              {activeTab === "structure" && t("analyzeStructure")}
            </>
          )}
        </button>
        {activeTab === "scene" && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {t("sceneDescription")}
          </p>
        )}
        {activeTab === "characters" && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {t("charactersDescription")}
          </p>
        )}
        {activeTab === "structure" && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {t("structureDescription")}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "scene" &&
              (sceneResult ? (
                <SceneAnalysisView data={sceneResult} />
              ) : (
                <EmptyAnalysis label={t("runScene")} />
              ))}

            {activeTab === "characters" &&
              (charResult ? (
                <CharacterAnalysisView data={charResult} />
              ) : (
                <EmptyAnalysis label={t("runCharacters")} />
              ))}

            {activeTab === "structure" &&
              (structResult ? (
                <StructureAnalysisView data={structResult} />
              ) : (
                <EmptyAnalysis label={t("runStructure")} />
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyAnalysis({ label }: { label: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/20" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
