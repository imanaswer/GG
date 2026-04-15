import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "admin") return fail("Admin only", 403);

    const { id } = await params;
    const { action } = await req.json();
    const status = action === "approve" ? "active" : "inactive";
    try {
      await prisma.coach.update({ where: { id }, data: { status } });
    } catch {
      return fail("Coach not found", 404);
    }
    return ok({ coachId: id, status });
  } catch (e) { return handleErr(e); }
}
