import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";
import { PROVIDER_MODELS } from "@script/types";

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

  const { id, isEnabled, costInputPerMillion, costOutputPerMillion } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Model ID required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (isEnabled !== undefined) data.isEnabled = isEnabled;
  if (costInputPerMillion !== undefined) data.costInputPerMillion = Number(costInputPerMillion);
  if (costOutputPerMillion !== undefined) data.costOutputPerMillion = Number(costOutputPerMillion);

  await prisma.globalModelConfig.update({ where: { id }, data });

  return NextResponse.json({ success: true });
}
