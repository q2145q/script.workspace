import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";

function getDateRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0); // all time
  }
}

export async function GET(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = req.nextUrl.searchParams.get("range") || "all";
  const rangeStart = getDateRange(range);

  const where = { createdAt: { gte: rangeStart } };

  const [aggregate, byProvider, byUser] = await Promise.all([
    // Aggregate stats
    prisma.apiUsageLog.aggregate({
      where,
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
      _count: true,
      _avg: { tokensIn: true, tokensOut: true },
    }),

    // By provider
    prisma.apiUsageLog.groupBy({
      by: ["provider"],
      where,
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
      _count: true,
    }),

    // By user (top 50)
    prisma.apiUsageLog.groupBy({
      by: ["userId"],
      where,
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 50,
    }),
  ]);

  // Enrich user data
  const userIds = byUser.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const byUserEnriched = byUser.map((u) => ({
    ...u,
    user: userMap.get(u.userId) || { name: "Unknown", email: "" },
  }));

  return NextResponse.json({
    aggregate: {
      totalRequests: aggregate._count,
      totalTokensIn: aggregate._sum.tokensIn || 0,
      totalTokensOut: aggregate._sum.tokensOut || 0,
      totalCostUsd: aggregate._sum.costUsd || 0,
      avgTokensIn: Math.round(aggregate._avg.tokensIn || 0),
      avgTokensOut: Math.round(aggregate._avg.tokensOut || 0),
    },
    byProvider,
    byUser: byUserEnriched,
  });
}
