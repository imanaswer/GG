import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { requireSignedAgreement, AgreementGateError } from "@/lib/coachAgreement/gate";
import { CURRENT_AGREEMENT_VERSION } from "@/lib/coachAgreement/content";
import { isValidPhone } from "@/lib/phone";

// The coach's own record, resolved from the session — never from a client id.
async function ownCoach(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return { session: null, coach: null };
  if (session.role !== "coach") return { session, coach: null };
  const coach = await prisma.coach.findUnique({
    where: { userId: session.id },
    include: {
      batches: { orderBy: { day: "asc" } },
      _count: { select: { bookings: true, reviews: true } },
    },
  });
  return { session, coach };
}

/** GET: everything the coach portal shows about the signed-in coach. */
export async function GET(req: NextRequest) {
  try {
    const { session, coach } = await ownCoach(req);
    if (!session) return fail("Authentication required", 401);
    if (!coach) return fail("No coach profile is linked to this account", 404);

    const [pending, approved, completed, agreement] = await Promise.all([
      prisma.booking.count({ where: { coachId: coach.id, status: "pending" } }),
      prisma.booking.count({ where: { coachId: coach.id, status: "approved" } }),
      prisma.booking.count({ where: { coachId: coach.id, status: "completed" } }),
      prisma.coachAgreement.findFirst({
        where: { coachId: coach.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
        select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true, status: true },
      }),
    ]);

    const { _count, ...profile } = coach;
    return ok({
      ...profile,
      stats: { pending, approved, completed, reviews: _count.reviews, totalBookings: _count.bookings },
      agreement,
    });
  } catch (e) { return handleErr(e); }
}

// Only the fields a coach may edit about themselves. Pricing, seats, status,
// sport and identity stay with the admin so a coach cannot re-price or
// re-activate themselves.
const UpdateSchema = z.object({
  description: z.string().max(2000).optional(),
  timing: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().trim().max(20).optional(),
  features: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  certifications: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
});

/** PATCH: edit the editable subset of the coach's own profile. */
export async function PATCH(req: NextRequest) {
  try {
    const { session, coach } = await ownCoach(req);
    if (!session) return fail("Authentication required", 401);
    if (!coach) return fail("No coach profile is linked to this account", 404);
    await requireSignedAgreement(session.id);

    const input = UpdateSchema.parse(await req.json());
    if (input.phone && !isValidPhone(input.phone)) return fail("Please enter a valid mobile number", 400);

    const updated = await prisma.$transaction(async tx => {
      const c = await tx.coach.update({ where: { id: coach.id }, data: input });
      // Keep the account phone in step so booking prefill and admin contact match.
      if (input.phone) await tx.user.update({ where: { id: session.id }, data: { phone: input.phone } });
      return c;
    });
    return ok(updated);
  } catch (e) {
    if (e instanceof AgreementGateError) return fail(e.message, e.status);
    return handleErr(e);
  }
}
