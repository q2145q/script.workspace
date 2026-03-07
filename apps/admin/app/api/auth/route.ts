import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, createSession, destroySession, checkLoginRateLimit, getClientIp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ip = await getClientIp();

  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const { login, password } = await req.json();

  if (!(await validateCredentials(login, password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ success: true });
}
