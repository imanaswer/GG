import { NextRequest } from "next/server";
import { getSessionFromRequest, clearCookie } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return fail("Not authenticated", 401);
  return ok({ user: session });
}

export async function POST() {
  const res = ok({ message: "Logged out" });
  res.cookies.set(clearCookie());
  return res;
}
