import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { generateSigningToken, buildSignLink } from "@/lib/coachAgreement/signingToken";

type Ctx = { params: Promise<{ id: string }> };

// Admin: mint a fresh secure signing link for ANY coach (no login account needed).
export async function GET(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const coach = await prisma.coach.findUnique({ where: { id }, select: { id: true } });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  const token = await generateSigningToken(coach.id);
  return NextResponse.json({ signLink: buildSignLink(token) });
}
