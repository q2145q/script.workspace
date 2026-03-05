import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, createSession, destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();

  if (!validateCredentials(login, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ success: true });
}
