import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, clearAdminCookie, SHARED_ACTOR, type AdminActor } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const { email, password, action } = await req.json();

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    clearAdminCookie(res);
    return res;
  }

  // Rate limit login attempts (not logouts)
  const ip = clientIp(req);
  const rl = await authLimit(ip);
  if (!rl.success) return tooManyRequests(rl);

  // Named accounts are just User rows with role "admin" — no separate model, and
  // the admin listings already filter `role: { not: "admin" }`, so they stay out
  // of player lists for free. Seeding is an UPDATE, not a migration.
  let actor: AdminActor | null = null;

  if (typeof email === "string" && email.trim()) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" }, role: "admin", deletedAt: null },
      select: { id: true, name: true, passwordHash: true },
    });
    // A null passwordHash means a Google/Apple-only account: it must not be
    // possible to sign in without one. /forgot-password sets it.
    if (user?.passwordHash && await bcrypt.compare(String(password ?? ""), user.passwordHash)) {
      actor = { id: user.id, name: user.name };
    }
  }

  // Fall back to the shared password even when an email WAS supplied. Making the
  // email field route exclusively to the named branch locked people out: with no
  // admin accounts created yet that branch can never succeed, so anyone who filled
  // the field in — the natural thing to do on a form that shows it — was refused
  // no matter which password they typed.
  //
  // Legacy branch, kept for ONE release while named accounts are created. Audit
  // rows read "Shared login" in plain sight, which is its own pressure to finish
  // the migration. Remove this and ADMIN_PASSWORD in the release after.
  if (!actor) {
    const adminPw = process.env.ADMIN_PASSWORD ?? (() => {
      if (process.env.NODE_ENV === "production") throw new Error("ADMIN_PASSWORD env var is required in production");
      return "admin123";
    })();
    if (password === adminPw) actor = SHARED_ACTOR;
  }

  // One message for both branches: distinguishing "no such admin" from "wrong
  // password" would let anyone enumerate which addresses are admins.
  if (!actor) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signAdminToken(actor);
  const res   = NextResponse.json({ ok: true, name: actor.name });
  res.cookies.set("gg_admin", token, { httpOnly: true, path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 });
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("gg_admin")?.value;
  if (!token) return NextResponse.json({ admin: false });
  try {
    const { verifyAdminToken } = await import("@/lib/adminAuth");
    const valid = await verifyAdminToken(token);
    if (!valid) return NextResponse.json({ admin: false });
    return NextResponse.json({
      admin: true,
      name: typeof valid.name === "string" ? valid.name : SHARED_ACTOR.name,
    });
  } catch { return NextResponse.json({ admin: false }); }
}
