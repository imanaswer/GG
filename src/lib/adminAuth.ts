import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "gg_admin";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "admin-dev-secret-minimum-32-chars!!");

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("60m") // 60 min session timeout per spec
    .setIssuedAt()
    .sign(await secret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, await secret());
    return true;
  } catch { return false; }
}

export async function getAdminSession(): Promise<boolean> {
  const jar   = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function getAdminSessionFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export function setAdminCookie(res: { cookies: { set: (name: string, value: string, opts: object) => void } }, token: string) {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true, path: "/admin", secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 60, // 60 min
  });
}

export function clearAdminCookie(res: { cookies: { set: (name: string, value: string, opts: object) => void } }) {
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
}
