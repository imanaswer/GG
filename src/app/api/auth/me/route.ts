import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, clearCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return fail("Not authenticated", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    const res = NextResponse.json({ ok: false, error: "Account no longer exists" }, { status: 401 });
    res.cookies.set(clearCookie());
    return res;
  }

  return ok({ user: session });
}

export async function POST() {
  const res = ok({ message: "Logged out" });
  res.cookies.set(clearCookie());
  return res;
}
