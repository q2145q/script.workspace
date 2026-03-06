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
  ShieldCheck,
  ListMusic,
  Gauge,
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
  ConsistencyResult,
  BeatSheetResult,
  PacingResult,
} from "@script/types";

type AnalysisTab = "scene" | "characters" | "structure" | "consistency" | "beatSheet" | "pacing";

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

const TABS: { key: AnalysisTab; labelKey: string; icon: typeof Film }[] = [
  { key: "scene", labelKey: "scene", icon: Film },
  { key: "characters", labelKey: "characters", icon: Users },
  { key: "structure", labelKey: "structure", icon: Layers },
  { key: "consistency", labelKey: "consistency", icon: ShieldCheck },
  { key: "beatSheet", labelKey: "beatSheet", icon: ListMusic },
  { key: "pacing", labelKey: "pacing", icon: Gauge },
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
// Consistency Check
// ============================================================

const SEVERITY_STYLES = {
  error: "text-red-400 bg-red-400/10 border-red-400/20",
  warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  info: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  timeline: "⏱",
  location: "📍",
  character: "👤",
  logic: "🧩",
  continuity: "🔗",
};

function ConsistencyView({ data }: { data: ConsistencyResult }) {
  const t = useTranslations("Analysis");

  if (data.issues.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400/40" />
        <p className="mt-2 text-xs text-muted-foreground">{t("noIssues")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {data.issues.map((issue, i) => (
        <div
          key={i}
          className={`rounded-lg border p-3 ${SEVERITY_STYLES[issue.severity]}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{ISSUE_TYPE_LABELS[issue.type] ?? "❓"}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
              {issue.type}
            </span>
            {issue.scene_reference && (
              <span className="ml-auto text-[10px] opacity-60">{issue.scene_reference}</span>
            )}
          </div>
          <p className="mt-1 text-xs">{issue.description}</p>
          {issue.suggestion && (
            <p className="mt-1.5 text-xs opacity-70">
              <Lightbulb className="mr-1 inline h-3 w-3" />
              {issue.suggestion}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Beat Sheet
// ============================================================

const BEAT_STATUS_STYLES = {
  present: "bg-emerald-400/10 border-emerald-400/30 text-emerald-400",
  weak: "bg-amber-400/10 border-amber-400/30 text-amber-400",
  missing: "bg-red-400/10 border-red-400/30 text-red-400",
};

function BeatSheetView({ data }: { data: BeatSheetResult }) {
  const t = useTranslations("Analysis");

  return (
    <div className="space-y-1.5 p-3">
      {data.beats.map((beat, i) => (
        <div
          key={i}
          className={`rounded-lg border p-2.5 ${BEAT_STATUS_STYLES[beat.status]}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{beat.beat_name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] opacity-60">{beat.page_range}</span>
              <span className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase">
                {t(`beatStatus_${beat.status}`)}
              </span>
            </div>
          </div>
          <p className="mt-1 text-[11px] opacity-80">{beat.description}</p>
          {beat.scene_reference && (
            <p className="mt-1 text-[10px] opacity-50">{beat.scene_reference}</p>
          )}
        </div>
      ))}
      {data.notes && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("notes")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{data.notes}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Pacing Analysis
// ============================================================

function PacingView({ data }: { data: PacingResult }) {
  const t = useTranslations("Analysis");

  return (
    <div className="space-y-4 p-3">
      {/* Segments as visual bars */}
      {data.segments.map((seg, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{seg.act}</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
              seg.tempo === "fast"
                ? "bg-red-400/10 text-red-400"
                : seg.tempo === "slow"
                  ? "bg-blue-400/10 text-blue-400"
                  : "bg-amber-400/10 text-amber-400"
            }`}>
              {t(`tempo_${seg.tempo}`)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">{seg.scene_range}</p>

          {/* Action vs Dialogue bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            <div
              className="bg-ai-accent/60 transition-all"
              style={{ width: `${Math.round(seg.action_ratio * 100)}%` }}
              title={`Action: ${Math.round(seg.action_ratio * 100)}%`}
            />
            <div
              className="bg-emerald-400/60 transition-all"
              style={{ width: `${Math.round(seg.dialogue_ratio * 100)}%` }}
              title={`Dialogue: ${Math.round(seg.dialogue_ratio * 100)}%`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>{t("action")} {Math.round(seg.action_ratio * 100)}%</span>
            <span>{t("dialogue")} {Math.round(seg.dialogue_ratio * 100)}%</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{seg.notes}</p>
        </div>
      ))}

      {/* Overall */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("overallAssessment")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{data.overall_assessment}</p>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("recommendations")}
          </p>
          <ul className="space-y-1">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-400">
                <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {rec}
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

  // Consistency check
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);
  const consistencyMutation = useMutation(
    trpc.ai.checkConsistency.mutationOptions({
      onSuccess: (data) => setConsistencyResult(data),
      onError: (err) => toast.error(err.message),
    })
  );

  // Beat sheet
  const [beatSheetResult, setBeatSheetResult] = useState<BeatSheetResult | null>(null);
  const beatSheetMutation = useMutation(
    trpc.ai.generateBeatSheet.mutationOptions({
      onSuccess: (data) => setBeatSheetResult(data),
      onError: (err) => toast.error(err.message),
    })
  );

  // Pacing analysis
  const [pacingResult, setPacingResult] = useState<PacingResult | null>(null);
  const pacingMutation = useMutation(
    trpc.ai.analyzePacing.mutationOptions({
      onSuccess: (data) => setPacingResult(data),
      onError: (err) => toast.error(err.message),
    })
  );

  const handleAnalyze = () => {
    if (!editor) {
      toast.error(t("editorNotReady"));
      return;
    }

    // Full text needed for consistency, beat sheet, pacing, characters
    const needsFullText = ["characters", "consistency", "beatSheet", "pacing"].includes(activeTab);
    const text = needsFullText ? extractFullText(editor) : extractCurrentSceneText(editor);

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
      case "consistency":
        consistencyMutation.mutate({ projectId, text });
        break;
      case "beatSheet":
        beatSheetMutation.mutate({ projectId, text });
        break;
      case "pacing":
        pacingMutation.mutate({ projectId, text });
        break;
    }
  };

  const isLoading =
    sceneMutation.isPending || charMutation.isPending || structMutation.isPending ||
    consistencyMutation.isPending || beatSheetMutation.isPending || pacingMutation.isPending;

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
              {activeTab === "consistency" && t("checkConsistency")}
              {activeTab === "beatSheet" && t("generateBeatSheet")}
              {activeTab === "pacing" && t("analyzePacing")}
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          {t(`${activeTab}Description`)}
        </p>
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

            {activeTab === "consistency" &&
              (consistencyResult ? (
                <ConsistencyView data={consistencyResult} />
              ) : (
                <EmptyAnalysis label={t("runConsistency")} />
              ))}

            {activeTab === "beatSheet" &&
              (beatSheetResult ? (
                <BeatSheetView data={beatSheetResult} />
              ) : (
                <EmptyAnalysis label={t("runBeatSheet")} />
              ))}

            {activeTab === "pacing" &&
              (pacingResult ? (
                <PacingView data={pacingResult} />
              ) : (
                <EmptyAnalysis label={t("runPacing")} />
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
