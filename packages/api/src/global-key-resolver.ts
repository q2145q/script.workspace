import { prisma } from "@script/db";
import { decrypt, getTaskModels } from "@script/ai";
import type { ModelTier } from "@script/ai";

export interface ResolvedKey {
  apiKey: string;
  model: string;
  provider: string;
  source: "global";
}

/**
 * Resolve which global API key and model to use.
 * API keys are always global (set by admin). Users only choose provider/model.
 * Used for chat and other user-preference-based calls.
 */
export async function resolveApiKey(
  secret: string,
  preferredProvider?: string | null,
  preferredModel?: string | null,
): Promise<ResolvedKey> {
  let globalKey;

  if (preferredProvider) {
    // User chose a specific provider
    globalKey = await prisma.globalApiKey.findFirst({
      where: { provider: preferredProvider, isActive: true },
    });
  }

  if (!globalKey) {
    // Fallback: first active global key
    globalKey = await prisma.globalApiKey.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!globalKey) {
    throw new Error("No AI provider configured. Contact administrator.");
  }

  // Resolve model
  let model = preferredModel;

  if (!model) {
    const defaultModel = await prisma.globalModelConfig.findFirst({
      where: { provider: globalKey.provider, isEnabled: true },
      orderBy: { sortOrder: "asc" },
    });
    model = defaultModel?.modelId || "gpt-4o";
  }

  return {
    apiKey: decrypt(globalKey.apiKeyEnc, secret),
    model,
    provider: globalKey.provider,
    source: "global",
  };
}

/**
 * Resolve the optimal provider + model for a specific AI task.
 * Uses benchmark-determined defaults from TASK_MODEL_CONFIG.
 * Tries each model in the tier's list until a provider with an active key is found.
 */
export async function resolveTaskModel(
  secret: string,
  taskName: string,
  tier: ModelTier = "best",
): Promise<ResolvedKey> {
  const models = getTaskModels(taskName, tier);

  for (const entry of models) {
    const globalKey = await prisma.globalApiKey.findFirst({
      where: { provider: entry.provider, isActive: true },
    });
    if (globalKey) {
      return {
        apiKey: decrypt(globalKey.apiKeyEnc, secret),
        model: entry.model,
        provider: entry.provider,
        source: "global",
      };
    }
  }

  // No task-specific provider available — fall back to any active key
  return resolveApiKey(secret);
}
