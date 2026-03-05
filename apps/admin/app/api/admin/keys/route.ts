import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { encrypt, decrypt } from "@script/ai";
import { validateSession } from "@/lib/auth";

function getSecret(): string {
  const secret = process.env.AI_ENCRYPTION_SECRET;
  if (!secret) throw new Error("AI_ENCRYPTION_SECRET not configured");
  return secret;
}

function maskKey(raw: string): string {
  if (raw.length <= 8) return "****";
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.globalApiKey.findMany({
    orderBy: { provider: "asc" },
  });

  const result = keys.map((k) => {
    let maskedKey = "****";
    try {
      maskedKey = maskKey(decrypt(k.apiKeyEnc, getSecret()));
    } catch {}
    return {
      id: k.id,
      provider: k.provider,
      isActive: k.isActive,
      maskedKey,
      updatedAt: k.updatedAt,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider, apiKey, isActive } = await req.json();

  if (!provider) {
    return NextResponse.json({ error: "Provider required" }, { status: 400 });
  }

  // Toggle active status
  if (apiKey === undefined && isActive !== undefined) {
    await prisma.globalApiKey.update({
      where: { provider },
      data: { isActive },
    });
    return NextResponse.json({ success: true });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  const encrypted = encrypt(apiKey.trim(), getSecret());

  await prisma.globalApiKey.upsert({
    where: { provider },
    update: { apiKeyEnc: encrypted, isActive: true },
    create: { provider, apiKeyEnc: encrypted },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json();
  await prisma.globalApiKey.delete({ where: { provider } });
  return NextResponse.json({ success: true });
}
