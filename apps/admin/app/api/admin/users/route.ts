import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";
import { z } from "zod";

const updateUserSchema = z.object({
  userId: z.string().min(1),
  betaApproved: z.boolean().optional(),
  banned: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") || "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50));

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        betaApproved: true,
        banned: true,
        createdAt: true,
        _count: { select: { ownedProjects: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { userId, betaApproved, banned } = parsed.data;

  const data: Record<string, unknown> = {};
  if (betaApproved !== undefined) data.betaApproved = betaApproved;
  if (banned !== undefined) data.banned = banned;

  await prisma.user.update({
    where: { id: userId },
    data,
  });

  // Audit log
  const action = banned !== undefined ? "admin:toggle_ban" : "admin:toggle_beta";
  await prisma.activityLog.create({
    data: {
      projectId: "admin",
      userId: "admin",
      action,
      details: { targetUserId: userId, ...data },
    },
  }).catch((err) => console.error("[admin] Audit log failed:", err));

  return NextResponse.json({ success: true });
}
