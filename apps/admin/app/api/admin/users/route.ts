import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { validateSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") || "";

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      betaApproved: true,
      createdAt: true,
      _count: { select: { ownedProjects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, betaApproved } = await req.json();

  if (!userId || betaApproved === undefined) {
    return NextResponse.json({ error: "userId and betaApproved required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { betaApproved },
  });

  return NextResponse.json({ success: true });
}
