import { NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";
import { PROVIDER_MODELS } from "@script/types";
import { TOKEN_PRICES } from "@script/ai";

export async function POST() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let added = 0;
  let updated = 0;
  let disabled = 0;

  const codeModels = new Set<string>();

  for (const [provider, models] of Object.entries(PROVIDER_MODELS)) {
    for (let idx = 0; idx < models.length; idx++) {
      const m = models[idx];
      codeModels.add(`${provider}:${m.id}`);

      const pricing = TOKEN_PRICES[m.id];
      const costInput = pricing?.input ?? 0;
      const costOutput = pricing?.output ?? 0;

      const existing = await prisma.globalModelConfig.findUnique({
        where: { provider_modelId: { provider, modelId: m.id } },
      });

      if (existing) {
        const needsUpdate =
          existing.modelLabel !== m.label ||
          existing.costInputPerMillion !== costInput ||
          existing.costOutputPerMillion !== costOutput ||
          existing.sortOrder !== idx;

        if (needsUpdate) {
          await prisma.globalModelConfig.update({
            where: { id: existing.id },
            data: {
              modelLabel: m.label,
              costInputPerMillion: costInput,
              costOutputPerMillion: costOutput,
              sortOrder: idx,
            },
          });
          updated++;
        }

        if (!existing.isEnabled) {
          await prisma.globalModelConfig.update({
            where: { id: existing.id },
            data: { isEnabled: true },
          });
        }
      } else {
        await prisma.globalModelConfig.create({
          data: {
            provider,
            modelId: m.id,
            modelLabel: m.label,
            isEnabled: true,
            costInputPerMillion: costInput,
            costOutputPerMillion: costOutput,
            sortOrder: idx,
          },
        });
        added++;
      }
    }
  }

  // Disable models no longer in code (do NOT delete)
  const allEnabled = await prisma.globalModelConfig.findMany({
    where: { isEnabled: true },
  });
  for (const dbModel of allEnabled) {
    if (!codeModels.has(`${dbModel.provider}:${dbModel.modelId}`)) {
      await prisma.globalModelConfig.update({
        where: { id: dbModel.id },
        data: { isEnabled: false },
      });
      disabled++;
    }
  }

  // Audit log
  await prisma.activityLog.create({
    data: {
      projectId: "admin",
      userId: "admin",
      action: "admin:sync_models",
      details: { added, updated, disabled },
    },
  }).catch((err) => console.error("[admin] Audit log failed:", err));

  return NextResponse.json({ success: true, added, updated, disabled });
}
