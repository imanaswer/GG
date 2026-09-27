import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/auth";
import { uniqueUsername } from "@/lib/socialAuth";
import { sendEmail, emails } from "@/lib/email";
import { siteUrl } from "@/lib/siteUrl";
import { logger } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

const INVITE_TTL_MS = 72 * 3600_000;

/**
 * Admin: give a coach a portal login. Links (or creates) the User row for the
 * coach's email and emails a set-password link. This replaces the old read-time
 * "match by email" fallback, which let anyone who registered with a coach's
 * public email see that coach's bookings.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { id }, select: { id: true, name: true, email: true, userId: true } });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  const email = coach.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Add a valid email to the coach profile first" }, { status: 400 });
  }

  // Resolve the account: already linked → existing account with that email → new.
  let userId = coach.userId;
  if (!userId) {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: { id: true, role: true, coachProfile: { select: { id: true } } },
    });
    if (existing?.coachProfile && existing.coachProfile.id !== coach.id) {
      return NextResponse.json({ error: "That email already belongs to a different coach account" }, { status: 409 });
    }
    if (existing) {
      // An admin is explicitly promoting this address to a coach; admins keep their role.
      await prisma.user.update({
        where: { id: existing.id },
        data: existing.role === "admin" ? {} : { role: "coach" },
      });
      userId = existing.id;
    } else {
      const created = await prisma.user.create({
        data: { email, name: coach.name, username: await uniqueUsername(email), role: "coach", passwordHash: null },
        select: { id: true },
      });
      userId = created.id;
    }
    await prisma.coach.update({ where: { id: coach.id }, data: { userId } });
  }

  // Same mechanism as forgot-password (hashed, expiring, single-use), longer TTL
  // because an invite may sit in an inbox for a couple of days.
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordResetToken: hashResetToken(raw), passwordResetExpiry: new Date(Date.now() + INVITE_TTL_MS) },
  });
  const setPasswordUrl = `${siteUrl()}/reset-password?token=${raw}`;
  const sent = await sendEmail({ to: email, ...emails.coachInvite(coach.name, setPasswordUrl) });
  if (!sent) logger.warn("coach invite email failed", { coachId: coach.id });

  return NextResponse.json({ invited: true, email, emailSent: sent, linked: true });
}
