import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import { encrypt, decrypt } from "@script/ai";
import { validateSession } from "@/lib/auth";
import { z } from "zod";

const VALID_PROVIDERS = ["openai", "anthropic", "deepseek", "gemini", "yandex", "grok"] as const;

const saveKeySchema = z.object({
  provider: z.enum(VALID_PROVIDERS),
  apiKey: z.string().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

const deleteKeySchema = z.object({
  provider: z.enum(VALID_PROVIDERS),
});

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

  const body = await req.json();
  const parsed = saveKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { provider, apiKey, isActive } = parsed.data;

  // Toggle active status
  if (apiKey === undefined && isActive !== undefined) {
    await prisma.globalApiKey.update({
      where: { provider },
      data: { isActive },
    });

    await prisma.activityLog.create({
      data: {
        projectId: "admin",
        userId: "admin",
        action: "admin:toggle_api_key",
        details: { provider, isActive },
      },
    }).catch((err) => console.error("[admin] Audit log failed:", err));

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

  await prisma.activityLog.create({
    data: {
      projectId: "admin",
      userId: "admin",
      action: "admin:update_api_key",
      details: { provider, action: "save" },
    },
  }).catch((err) => console.error("[admin] Audit log failed:", err));

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = deleteKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { provider } = parsed.data;
  await prisma.globalApiKey.delete({ where: { provider } });

  await prisma.activityLog.create({
    data: {
      projectId: "admin",
      userId: "admin",
      action: "admin:delete_api_key",
      details: { provider },
    },
  }).catch((err) => console.error("[admin] Audit log failed:", err));

  return NextResponse.json({ success: true });
}
