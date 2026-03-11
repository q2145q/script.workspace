import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const section = sp.get("section") || "overview";

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      betaApproved: true,
      banned: true,
      telegramChatId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { ownedProjects: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let data: unknown = null;

  switch (section) {
    case "overview": {
      const [usageStats, errorCount, projectCount] = await Promise.all([
        prisma.apiUsageLog.aggregate({
          where: { userId: id },
          _sum: { tokensIn: true, tokensOut: true, costUsd: true },
          _count: true,
        }),
        prisma.aiResponseLog.count({
          where: { userId: id, status: "error" },
        }),
        prisma.project.count({
          where: { ownerId: id, deletedAt: null },
        }),
      ]);
      data = { usageStats, errorCount, projectCount };
      break;
    }

    case "requests": {
      const page = Math.max(1, Number(sp.get("page")) || 1);
      const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 50));
      const feature = sp.get("feature") || undefined;
      const provider = sp.get("provider") || undefined;

      const where: Record<string, unknown> = { userId: id };
      if (feature) where.feature = feature;
      if (provider) where.provider = provider;

      const [logs, total] = await Promise.all([
        prisma.apiUsageLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.apiUsageLog.count({ where }),
      ]);
      data = { logs, total, page, totalPages: Math.ceil(total / limit) };
      break;
    }

    case "features": {
      const byFeature = await prisma.apiUsageLog.groupBy({
        by: ["feature"],
        where: { userId: id },
        _sum: { tokensIn: true, tokensOut: true, costUsd: true },
        _count: true,
        orderBy: { _count: { feature: "desc" } },
      });

      const lastUsed = await prisma.$queryRaw<
        Array<{ feature: string; last_used: Date }>
      >`
        SELECT feature, MAX("createdAt") as last_used
        FROM api_usage_log
        WHERE "userId" = ${id}
        GROUP BY feature
      `;
      const lastUsedMap = new Map(
        lastUsed.map((r) => [r.feature, r.last_used]),
      );

      data = byFeature.map((f) => ({
        ...f,
        lastUsed: lastUsedMap.get(f.feature) || null,
      }));
      break;
    }

    case "projects": {
      const projects = await prisma.project.findMany({
        where: { ownerId: id, deletedAt: null },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { documents: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      data = projects;
      break;
    }

    case "activity": {
      const page = Math.max(1, Number(sp.get("page")) || 1);
      const limit = 30;
      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.activityLog.count({ where: { userId: id } }),
      ]);
      data = { activities, total, page, totalPages: Math.ceil(total / limit) };
      break;
    }
  }

  return NextResponse.json({ user, section, data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
