import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { signAgreementToken, buildSignLink } from "@/lib/coachAgreement/token";

type Ctx = { params: Promise<{ id: string }> };

// Admin: mint a fresh passwordless signing link for a coach (to share manually).
export async function GET(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const coach = await prisma.coach.findUnique({ where: { id }, select: { userId: true } });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  if (!coach.userId) return NextResponse.json({ error: "This coach has no linked login account, so no signing link can be issued." }, { status: 400 });
  const token = await signAgreementToken(coach.userId);
  return NextResponse.json({ signLink: buildSignLink(token) });
}
