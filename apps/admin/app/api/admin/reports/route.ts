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
  const status = sp.get("status") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    prisma.userReport.findMany({
      where,
      select: {
        id: true,
        userId: true,
        message: true,
        page: true,
        context: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.userReport.count({ where }),
  ]);

  const statusCounts = await prisma.userReport.groupBy({
    by: ["status"],
    _count: true,
  });

  return NextResponse.json({
    reports,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status, adminNote } = body as {
    id: string;
    status?: string;
    adminNote?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (adminNote !== undefined) data.adminNote = adminNote;

  const updated = await prisma.userReport.update({
    where: { id },
    data,
  });

  return NextResponse.json({ report: updated });
}
