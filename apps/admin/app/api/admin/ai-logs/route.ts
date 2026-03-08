import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 50));
  const status = sp.get("status") || undefined; // "success" | "error"
  const provider = sp.get("provider") || undefined;
  const feature = sp.get("feature") || undefined;
  const userId = sp.get("userId") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (provider) where.provider = provider;
  if (feature) where.feature = feature;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.aiResponseLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        provider: true,
        model: true,
        feature: true,
        status: true,
        errorMessage: true,
        durationMs: true,
        tokensIn: true,
        tokensOut: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.aiResponseLog.count({ where }),
  ]);

  // Error summary stats
  const [errorCount, totalCount] = await Promise.all([
    prisma.aiResponseLog.count({ where: { ...where, status: "error" } }),
    prisma.aiResponseLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    errorCount,
    totalCount,
  });
}
