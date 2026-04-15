import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const payments = await prisma.payment.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return ok(payments);
  } catch (e) { return handleErr(e); }
}
