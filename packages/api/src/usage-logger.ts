import { prisma } from "@script/db";
import { logger } from "./logger";

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

  await Promise.all([
    prisma.apiUsageLog.create({
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
    }),
    prisma.aiResponseLog.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        provider: input.provider,
        model: input.model,
        feature: input.feature,
        status: "success",
        durationMs: input.durationMs,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
      },
    }),
  ]);
}

export interface LogAiResponseInput {
  userId: string;
  projectId?: string;
  provider: string;
  model: string;
  feature: string;
  status: "success" | "error";
  errorMessage?: string;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
}

export async function logAiResponse(input: LogAiResponseInput): Promise<void> {
  try {
    await prisma.aiResponseLog.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        provider: input.provider,
        model: input.model,
        feature: input.feature,
        status: input.status,
        errorMessage: input.errorMessage,
        durationMs: input.durationMs,
        tokensIn: input.tokensIn ?? 0,
        tokensOut: input.tokensOut ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "AI response log failed");
  }
}
