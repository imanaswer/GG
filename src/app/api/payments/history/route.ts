import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const db = getDB();
    return ok(db.payments.filter(p => p.userId === session.id));
  } catch (e) { return handleErr(e); }
}
