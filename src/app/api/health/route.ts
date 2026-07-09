import { NextResponse } from "next/server";

// Liveness AND health: is the process up and serving? No dependencies touched,
// so this stays green even if the DB is down — that's the point of a liveness
// probe (restarting the process won't fix a DB outage). Never cached.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, status: "healthy", uptime: process.uptime(), ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
