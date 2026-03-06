import { prisma } from "@script/db";

const startTime = Date.now();

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // DB unreachable
  }

  const status = dbOk ? 200 : 503;
  return Response.json(
    {
      ok: dbOk,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
