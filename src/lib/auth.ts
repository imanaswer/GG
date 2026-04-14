import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "gridgame-dev-secret-key-minimum-32-chars!!"
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
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
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
