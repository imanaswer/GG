import { NextRequest } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "admin") return fail("Admin only", 403);

    const { id } = await params;
    const { action } = await req.json(); // "approve" | "reject"
    const db    = getDB();
    const coach = db.coaches.find(c => c.id === id);
    if (!coach) return fail("Coach not found", 404);

    coach.status = action === "approve" ? "active" : "inactive";
    saveDB(db);
    return ok({ coachId: id, status: coach.status });
  } catch (e) { return handleErr(e); }
}
