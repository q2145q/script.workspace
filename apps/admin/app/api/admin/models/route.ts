import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";
import { PROVIDER_MODELS } from "@script/types";
import { z } from "zod";

const updateModelSchema = z.object({
  id: z.string().min(1),
  isEnabled: z.boolean().optional(),
  costInputPerMillion: z.number().min(0).max(1000).optional(),
  costOutputPerMillion: z.number().min(0).max(1000).optional(),
});

export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Seed if empty
  const count = await prisma.globalModelConfig.count();
  if (count === 0) {
    const entries = Object.entries(PROVIDER_MODELS).flatMap(([provider, models]) =>
      models.map((m, idx) => ({
        provider,
        modelId: m.id,
        modelLabel: m.label,
        isEnabled: true,
        costInputPerMillion: 0,
        costOutputPerMillion: 0,
        sortOrder: idx,
      }))
    );
    await prisma.globalModelConfig.createMany({ data: entries });
  }

  const models = await prisma.globalModelConfig.findMany({
    orderBy: [{ provider: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(models);
}

export async function PATCH(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id, isEnabled, costInputPerMillion, costOutputPerMillion } = parsed.data;

  const data: Record<string, unknown> = {};
  if (isEnabled !== undefined) data.isEnabled = isEnabled;
  if (costInputPerMillion !== undefined) data.costInputPerMillion = costInputPerMillion;
  if (costOutputPerMillion !== undefined) data.costOutputPerMillion = costOutputPerMillion;

  await prisma.globalModelConfig.update({ where: { id }, data });

  // Audit log
  await prisma.activityLog.create({
    data: {
      projectId: "admin",
      userId: "admin",
      action: "admin:update_model",
      details: { modelId: id, ...data },
    },
  }).catch((err) => console.error("[admin] Audit log failed:", err));

  return NextResponse.json({ success: true });
}
