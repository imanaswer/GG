import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, clearCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return fail("Not authenticated", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, email: true, name: true, username: true, role: true, avatarUrl: true, phone: true,
      deletedAt: true,
    },
  });
  if (!user || user.deletedAt) {
    const res = NextResponse.json({ ok: false, error: "Account no longer exists" }, { status: 401 });
    res.cookies.set(clearCookie());
    return res;
  }

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl ?? undefined,
      // The booking form asks for a mobile number only when the profile has none.
      phone: user.phone ?? undefined,
    },
  });
}

export async function POST() {
  const res = ok({ message: "Logged out" });
  res.cookies.set(clearCookie());
  return res;
}
