import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Resolved lazily (per call), NOT at module import. `next build` evaluates every
// route module with NODE_ENV=production and no AUTH_SECRET in the CI env — an eager
// top-level const here threw at build time ("AUTH_SECRET env var is required in
// production"). Fail-closed still holds at runtime: signToken/verifyToken throw in
// production if AUTH_SECRET is unset. Mirrors adminAuth.ts's lazy secret().
const secret = () => new TextEncoder().encode(
  process.env.AUTH_SECRET ?? (() => {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET env var is required in production");
    return "gridgame-dev-secret-key-minimum-32-chars!!";
  })()
);
export const COOKIE = "gg_token";

export type SessionUser = {
  id: string; email: string; name: string; username: string;
  role: string; avatarUrl?: string | null;
};

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch { return null; }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function getSessionFromRequest(req: Request): Promise<SessionUser | null> {
  // Cookie
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE}=([^;\\s]+)`));
  if (match?.[1]) return verifyToken(match[1]);
  // Bearer
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return verifyToken(auth.slice(7));
  return null;
}

export function cookieOpts(token: string) {
  return {
    name: COOKIE, value: token, httpOnly: true, path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 7,
  };
}
export function clearCookie() {
  return { name: COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 };
}
