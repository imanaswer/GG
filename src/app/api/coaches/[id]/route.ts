import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const db = getDB();
    const coach = db.coaches.find(c => c.id === id);
    if (!coach) return fail("Coach not found", 404);

    const reviews = db.reviews
      .filter(r => r.coachId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return ok({ ...coach, reviews });
  } catch (e) { return handleErr(e); }
}
