import { z } from "zod";

export const ProviderIdEnum = z.enum(["openai", "anthropic", "deepseek", "gemini", "yandex", "grok"]);

/** Available models per provider — keep in sync with latest API offerings */
export const PROVIDER_MODELS: Record<
  string,
  Array<{ id: string; label: string; description: string }>
> = {
  openai: [
    { id: "gpt-5", label: "GPT-5", description: "Most capable" },
    { id: "gpt-5-mini", label: "GPT-5 Mini", description: "Fast & affordable" },
    { id: "gpt-5-nano", label: "GPT-5 Nano", description: "Fastest, lowest cost" },
    { id: "gpt-4.1", label: "GPT-4.1", description: "Smart, 1M context" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Balanced, 1M context" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Fast & cheap, 1M context" },
    { id: "gpt-4o", label: "GPT-4o", description: "Legacy, multimodal" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Legacy, fast & cheap" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Most intelligent" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Fast, cost-efficient" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", description: "Previous gen, capable" },
    { id: "claude-opus-4-20250514", label: "Claude Opus 4", description: "Deep analysis" },
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", description: "Balanced, previous gen" },
  ],
  deepseek: [
    { id: "deepseek-chat", label: "DeepSeek Chat (V3)", description: "General purpose" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Most capable" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Fast & efficient" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "Previous gen, fast" },
  ],
  yandex: [
    { id: "yandexgpt/latest", label: "YandexGPT", description: "General purpose" },
    { id: "yandexgpt-lite/latest", label: "YandexGPT Lite", description: "Fast & affordable" },
  ],
  grok: [
    { id: "grok-3", label: "Grok 3", description: "Most capable" },
    { id: "grok-3-mini", label: "Grok 3 Mini", description: "Fast & efficient" },
  ],
};

export const configureProviderSchema = z.object({
  projectId: z.string(),
  provider: ProviderIdEnum,
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().optional(),
});
export type ConfigureProviderInput = z.infer<typeof configureProviderSchema>;

export const removeProviderSchema = z.object({
  projectId: z.string(),
  provider: ProviderIdEnum,
});

export const listProvidersSchema = z.object({
  projectId: z.string(),
});

export const updateProviderModelSchema = z.object({
  projectId: z.string(),
  provider: ProviderIdEnum,
  model: z.string().min(1),
});

export const ScreenplayBlockTypeEnum = z.enum([
  "sceneHeading", "action", "character", "dialogue",
  "parenthetical", "transition", "shot", "text",
]);

export const rewriteBlockSchema = z.object({
  type: z.string(),
  text: z.string(),
});

export const rewriteSchema = z.object({
  documentId: z.string(),
  selectionFrom: z.number().int().min(0),
  selectionTo: z.number().int().min(0),
  selectedText: z.string().min(1),
  instruction: z.string().min(1).max(2000),
  contextBefore: z.string().max(2000).default(""),
  contextAfter: z.string().max(2000).default(""),
  nodeType: z.string().default("action"),
  previousResult: z.string().optional(),
  blocks: z.array(rewriteBlockSchema).optional(),
});
export type RewriteInput = z.infer<typeof rewriteSchema>;

export const formatSchema = z.object({
  documentId: z.string(),
  selectionFrom: z.number().int().min(0),
  selectionTo: z.number().int().min(0),
  selectedText: z.string().min(1),
  contextBefore: z.string().max(2000).default(""),
  contextAfter: z.string().max(2000).default(""),
});
export type FormatInput = z.infer<typeof formatSchema>;

export const suggestionActionSchema = z.object({
  id: z.string(),
});

export const listSuggestionsSchema = z.object({
  documentId: z.string(),
  status: z.enum(["PENDING", "APPLIED", "REJECTED", "UNDONE"]).optional(),
});

// ============================================================
// New AI feature schemas (Phase 3)
// ============================================================

/** Scene Analysis — deep breakdown of a single scene */
export const sceneAnalysisSchema = z.object({
  summary: z.string(),
  scene_function: z.string(),
  characters_present: z.array(z.string()),
  character_goals: z.record(z.string(), z.string()),
  conflict: z.string(),
  stakes: z.string(),
  emotional_tone: z.string(),
  key_events: z.array(z.string()),
  visual_elements: z.array(z.string()),
  pacing: z.string(),
  problems: z.array(z.string()),
  suggestions: z.array(z.string()),
});
export type SceneAnalysis = z.infer<typeof sceneAnalysisSchema>;

/** Character Analysis — extract characters with goals, traits, relationships */
export const characterAnalysisSchema = z.object({
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    role_in_story: z.string(),
    goals: z.array(z.string()),
    motivations: z.string(),
    internal_conflict: z.string(),
    external_conflict: z.string(),
    traits: z.array(z.string()),
    relationships: z.array(z.object({
      character: z.string(),
      relationship: z.string(),
    })),
  })),
});
export type CharacterAnalysis = z.infer<typeof characterAnalysisSchema>;

/** Structure Analysis — three-act breakdown, turning points, pacing */
export const structureAnalysisSchema = z.object({
  act: z.string(),
  story_phase: z.string(),
  turning_points: z.array(z.string()),
  conflicts: z.array(z.string()),
  stakes: z.string(),
  tension_level: z.string(),
  narrative_function: z.string(),
  story_progress: z.string(),
  structure_problems: z.array(z.string()),
  suggestions: z.array(z.string()),
});
export type StructureAnalysis = z.infer<typeof structureAnalysisSchema>;

/** Knowledge Graph — entities, relationships, events */
export const knowledgeGraphSchema = z.object({
  entities: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string(),
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string().optional(),
    description: z.string().optional(),
  })),
  events: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    participants: z.array(z.string()),
    location: z.string().nullish(),
    importance: z.string(),
  })),
});
export type KnowledgeGraph = z.infer<typeof knowledgeGraphSchema>;

// Input schemas for new AI endpoints

export const analyzeSceneSchema = z.object({
  projectId: z.string(),
  sceneText: z.string().min(1),
});

export const analyzeCharactersSchema = z.object({
  projectId: z.string(),
  text: z.string().min(1),
});

export const analyzeStructureSchema = z.object({
  projectId: z.string(),
  sceneText: z.string().min(1),
});

export const generateLoglineSchema = z.object({
  projectId: z.string(),
  userRequest: z.string().max(2000).default(""),
});

export const generateSynopsisSchema = z.object({
  projectId: z.string(),
});

export const describeCharacterSchema = z.object({
  projectId: z.string(),
  characterName: z.string().min(1),
  characterContext: z.string().max(10000).default(""),
});

export const describeLocationSchema = z.object({
  projectId: z.string(),
  locationName: z.string().min(1),
  locationContext: z.string().max(10000).default(""),
});

export const extractKnowledgeGraphSchema = z.object({
  projectId: z.string(),
  text: z.string().min(1),
});

// Scene synopsis schemas

export const generateSceneSynopsisSchema = z.object({
  projectId: z.string(),
  sceneHeading: z.string().min(1),
  sceneText: z.string().min(1),
});

export const generateAllSceneSynopsesSchema = z.object({
  projectId: z.string(),
  scenes: z.array(z.object({
    heading: z.string(),
    text: z.string(),
  })).min(1).max(200),
});

export const saveDocumentMetadataSchema = z.object({
  documentId: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

// ============================================================
// Phase 6 — New AI feature schemas
// ============================================================

/** Dialogue Pass — improve dialogue subtext, voice, rhythm */
export const dialoguePassSchema = z.object({
  documentId: z.string(),
  selectionFrom: z.number().int().min(0),
  selectionTo: z.number().int().min(0),
  selectedText: z.string().min(1),
  blocks: z.array(rewriteBlockSchema),
  contextBefore: z.string().max(2000).default(""),
  contextAfter: z.string().max(2000).default(""),
  characterContext: z.string().max(5000).default(""),
});
export type DialoguePassInput = z.infer<typeof dialoguePassSchema>;

/** Consistency Check — find logic, timeline, character errors */
export const consistencyIssueSchema = z.object({
  type: z.enum(["timeline", "location", "character", "logic", "continuity"]),
  severity: z.enum(["error", "warning", "info"]),
  description: z.string(),
  scene_reference: z.string().nullish(),
  suggestion: z.string().nullish(),
});
export const consistencyResultSchema = z.object({
  issues: z.array(consistencyIssueSchema),
});
export type ConsistencyResult = z.infer<typeof consistencyResultSchema>;

export const checkConsistencySchema = z.object({
  projectId: z.string(),
  text: z.string().min(1),
});

/** Beat Sheet — Save the Cat structure analysis */
export const beatSchema = z.object({
  beat_name: z.string(),
  page_range: z.string().nullish(),
  description: z.string(),
  scene_reference: z.string().nullish(),
  status: z.enum(["present", "weak", "missing"]),
});
export const beatSheetResultSchema = z.object({
  beats: z.array(beatSchema),
  notes: z.string().optional(),
});
export type BeatSheetResult = z.infer<typeof beatSheetResultSchema>;

export const generateBeatSheetSchema = z.object({
  projectId: z.string(),
  text: z.string().min(1),
});

/** Pacing Analysis — tempo, action/dialogue ratio, recommendations */
export const pacingSegmentSchema = z.object({
  act: z.string(),
  scene_range: z.string(),
  action_ratio: z.number(),
  dialogue_ratio: z.number(),
  avg_scene_length: z.number(),
  tempo: z.enum(["slow", "medium", "fast"]),
  notes: z.string(),
});
export const pacingResultSchema = z.object({
  segments: z.array(pacingSegmentSchema),
  overall_assessment: z.string(),
  recommendations: z.array(z.string()),
});
export type PacingResult = z.infer<typeof pacingResultSchema>;

export const analyzePacingSchema = z.object({
  projectId: z.string(),
  text: z.string().min(1),
});
