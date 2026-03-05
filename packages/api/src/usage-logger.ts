import { prisma } from "@script/db";

export interface LogUsageInput {
  userId: string;
  projectId?: string;
  provider: string;
  model: string;
  feature: string;
  tokensIn: number;
  tokensOut: number;
  durationMs?: number;
  keySource: "global" | "user";
}

export async function logApiUsage(input: LogUsageInput): Promise<void> {
  // Look up cost config for this model
  const modelConfig = await prisma.globalModelConfig.findUnique({
    where: { provider_modelId: { provider: input.provider, modelId: input.model } },
  });

  let costUsd: number | null = null;
  if (modelConfig) {
    costUsd =
      (input.tokensIn / 1_000_000) * modelConfig.costInputPerMillion +
      (input.tokensOut / 1_000_000) * modelConfig.costOutputPerMillion;
  }

  await prisma.apiUsageLog.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      provider: input.provider,
      model: input.model,
      feature: input.feature,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      durationMs: input.durationMs,
      costUsd,
      keySource: input.keySource,
    },
  });
}
