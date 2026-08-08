import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import bcrypt from "bcryptjs";
import { generateSigningToken, buildSignLink } from "@/lib/coachAgreement/signingToken";
import { sendEmail, emails } from "@/lib/email";
import { logOpsSafe } from "@/lib/ops";

type BatchInput = { day: string; time: string; level: string; seats: number };

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      name, email, phone, password, sport, type, location, address, bio,
      timing, priceMin, priceMax, features, certifications, batches,
    } = data as Record<string, unknown> & { batches?: BatchInput[] };

    if (!name || !email || !password || !sport || !location) return fail("Required fields missing", 400);
    if ((password as string).length < 8) return fail("Password must be at least 8 characters", 400);

    const existing = await prisma.user.findFirst({ where: { email: { equals: email as string, mode: "insensitive" } }, select: { id: true } });
    if (existing) return fail("Email already registered", 409);

    const totalSeats = (batches ?? []).reduce((a, b) => a + (b.seats ?? 0), 0) || 10;
    const priceDisplay = priceMin && priceMax
      ? `₹${Number(priceMin).toLocaleString()}–${Number(priceMax).toLocaleString()}/session`
      : "Contact for price";

    const user = await prisma.user.create({
      data: {
        email: email as string,
        name: name as string,
        username: (email as string).split("@")[0].toLowerCase(),
        passwordHash: await bcrypt.hash(password as string, 12),
        role: "coach",
        phone: phone as string | undefined,
        location: location as string | undefined,
        bio: bio as string | undefined,
        sports: [sport as string],
      },
    });

    const coach = await prisma.coach.create({
      data: {
        userId: user.id,
        name: name as string,
        sport: sport as string,
        type: (type as string) ?? "Personal Trainer",
        location: location as string,
        address: (address as string) ?? (location as string),
        phone: (phone as string) ?? "",
        email: email as string,
        description: (bio as string) ?? "",
        features: (features as string[]) ?? [],
        skillLevel: "All Levels",
        price: priceDisplay,
        priceMin: (priceMin as number) ?? 500,
        priceMax: (priceMax as number) ?? 2000,
        timing: (timing as string) ?? "",
        imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`,
        totalSeats,
        seatsLeft: totalSeats,
        status: "pending_approval",
        certifications: (certifications as string[]) ?? [],
        batches: { create: (batches ?? []).map(b => ({ day: b.day, time: b.time, level: b.level, seats: b.seats })) },
      },
    });

    // Issue a passwordless signing link so the coach can review + sign the
    // Coach Partnership Agreement immediately, without logging in.
    const token = await generateSigningToken(coach.id);
    const signLink = buildSignLink(token);
    await sendEmail({ to: email as string, ...emails.agreementInvite(name as string, signLink) }).catch(() => {});

    // A self-registered coach is invisible until approved: filtered out of every
    // public listing and blocked from bookings by coachAdmission. Nothing told an
    // admin they were waiting, so a coach could sit for days with nobody knowing.
    logOpsSafe(() => ({
      type: "coach.pending_approval",
      severity: "action",
      title: "[GG] New coach awaiting approval",
      body: `${name} signed up and cannot be booked until an admin activates them.`,
      link: "/admin/coaches",
      entityType: "coach", entityId: coach.id,
      dedupeKey: `coach.pending_approval:${coach.id}`,
    }));

    return ok({
      registered: true,
      coachId: coach.id,
      token,
      signLink,
      message: "Account created. Please review and sign your Coach Partnership Agreement to continue.",
    });
  } catch (e) { return handleErr(e); }
}
