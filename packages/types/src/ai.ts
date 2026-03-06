import { z } from "zod";

export const ProviderIdEnum = z.enum(["openai", "anthropic", "deepseek", "gemini", "yandex", "grok"]);

/** Available models per provider — keep in sync with latest API offerings */
export const PROVIDER_MODELS: Record<
  string,
  Array<{ id: string; label: string; description: string }>
> = {
  openai: [
    { id: "gpt-4.1", label: "GPT-4.1", description: "Best balance of cost & capability" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Fast & affordable" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Fastest, lowest cost" },
    { id: "gpt-4o", label: "GPT-4o", description: "Previous generation" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Previous gen, affordable" },
    { id: "o3", label: "o3", description: "Reasoning model" },
    { id: "o4-mini", label: "o4-mini", description: "Fast reasoning model" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Fast + intelligent" },
    { id: "claude-opus-4-6", label: "Claude Opus 4.6", description: "Most capable" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Fastest, low cost" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", description: "Previous generation" },
  ],
  deepseek: [
    { id: "deepseek-chat", label: "DeepSeek Chat (V3)", description: "General purpose" },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)", description: "Reasoning model" },
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
    type: z.string(),
    description: z.string().optional(),
  })),
  events: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    participants: z.array(z.string()),
    location: z.string().optional(),
    importance: z.string(),
  })),
});
export type KnowledgeGraph = z.infer<typeof knowledgeGraphSchema>;

// Input schemas for new AI endpoints

export const analyzeSceneSchema = z.object({
  projectId: z.string(),
  sceneText: z.string().min(1).max(50000),
});

export const analyzeCharactersSchema = z.object({
  projectId: z.string(),
  text: z.string().min(1).max(50000),
});

export const analyzeStructureSchema = z.object({
  projectId: z.string(),
  sceneText: z.string().min(1).max(50000),
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
  text: z.string().min(1).max(100000),
});

// Scene synopsis schemas

export const generateSceneSynopsisSchema = z.object({
  projectId: z.string(),
  sceneHeading: z.string().min(1).max(500),
  sceneText: z.string().min(1).max(50000),
});

export const generateAllSceneSynopsesSchema = z.object({
  projectId: z.string(),
  scenes: z.array(z.object({
    heading: z.string(),
    text: z.string().max(50000),
  })).min(1).max(200),
});

export const saveDocumentMetadataSchema = z.object({
  documentId: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});
