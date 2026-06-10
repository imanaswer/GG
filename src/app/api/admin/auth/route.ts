import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, clearAdminCookie } from "@/lib/adminAuth";
import { authLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const { email, password, action } = await req.json();

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    clearAdminCookie(res);
    return res;
  }

  const adminPw = process.env.ADMIN_PASSWORD ?? (() => {
    if (process.env.NODE_ENV === "production") throw new Error("ADMIN_PASSWORD env var is required in production");
    return "admin123";
  })();

  // Rate limit login attempts (not logouts)
  const ip = clientIp(req);
  const rl = await authLimit(ip);
  if (!rl.success) return tooManyRequests(rl);

  let validAdmin = false;

  if (email === "admin@gameground.com" && password === adminPw) {
    validAdmin = true;
  }

  if (!validAdmin) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const token = await signAdminToken(email);
  const res   = NextResponse.json({ ok: true });
  res.cookies.set("gg_admin", token, { httpOnly: true, path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 });
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("gg_admin")?.value;
  if (!token) return NextResponse.json({ admin: false });
  try {
    const { verifyAdminToken } = await import("@/lib/adminAuth");
    const valid = await verifyAdminToken(token);
    return NextResponse.json({ admin: valid });
  } catch { return NextResponse.json({ admin: false }); }
}
