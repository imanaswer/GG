import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        batches: true,
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!coach) return fail("Coach not found", 404);
    return ok(coach);
  } catch (e) { return handleErr(e); }
}
