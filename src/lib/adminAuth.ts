import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "gg_admin";
// Admin tokens use a DEDICATED secret when available, so a user token (signed with
// AUTH_SECRET) can't even verify here. Falls back to AUTH_SECRET for envs that
// haven't provisioned ADMIN_JWT_SECRET yet — the role assertion below is the real
// gate regardless. Prod requires at least one secret.
const secret = () => new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? process.env.AUTH_SECRET ?? (() => {
    if (process.env.NODE_ENV === "production") throw new Error("ADMIN_JWT_SECRET (or AUTH_SECRET) env var is required in production");
    return "admin-dev-secret-minimum-32-chars!!";
  })()
);

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin", scope: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("60m") // 60 min session timeout per spec
    .setIssuedAt()
    .sign(await secret());
}

export async function verifyAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await secret());
    // Positive role assertion — a user JWT (role "player"/"coach") can never satisfy
    // this, closing the vertical privilege escalation even if secrets are shared.
    return payload.role === "admin" && payload.scope === "admin" ? payload : null;
  } catch { return null; }
}

export async function getAdminSession(): Promise<boolean> {
  const jar   = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return !!(await verifyAdminToken(token));
}

export async function getAdminSessionFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return !!(await verifyAdminToken(token));
}

// path:"/" — the admin cookie must reach BOTH /admin/* pages (middleware gate) and
// /api/admin/* routes. A narrower "/admin" path would never be sent to the APIs and
// would make clear() (below) fail to match the login cookie, breaking logout.
export function setAdminCookie(res: { cookies: { set: (name: string, value: string, opts: object) => void } }, token: string) {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true, path: "/", secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 60, // 60 min
  });
}

export function clearAdminCookie(res: { cookies: { set: (name: string, value: string, opts: object) => void } }) {
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
