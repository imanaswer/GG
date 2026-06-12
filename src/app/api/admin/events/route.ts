import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { eventInputSchema } from "@/lib/events";
import { Prisma } from "@prisma/client";

function toEventData(d: import("@/lib/events").EventInput): Prisma.SportEventUncheckedCreateInput {
  return {
    title: d.title, sport: d.sport, type: d.type, date: d.date,
    startDate: new Date(d.startDate), endDate: new Date(d.endDate),
    registrationDeadline: new Date(d.registrationDeadline),
    location: d.location, address: d.address,
    city: d.city, state: d.state, country: d.country, pincode: d.pincode,
    mapsLink: d.mapsLink, lat: d.lat ?? null, lng: d.lng ?? null,
    maxParticipants: d.maxParticipants,
    entryFee: d.entryFee, entryFeeAmount: d.entryFeeAmount,
    currency: d.currency, gstPercent: d.gstPercent, convenienceFeePct: d.convenienceFeePct,
    approvalMode: d.approvalMode,
    prizePool: d.prizePool, prizes: d.prizes, additionalRewards: d.additionalRewards,
    difficulty: d.difficulty, featured: d.featured, published: d.published,
    imageUrl: d.imageUrl, thumbnailUrl: d.thumbnailUrl,
    description: d.description, aboutLong: d.aboutLong,
    requirements: d.requirements, whatYouGet: d.whatYouGet, venueInfo: d.venueInfo,
    matchFormat: d.matchFormat, teamSize: d.teamSize, numRounds: d.numRounds,
    structure: d.structure, eligibility: d.eligibility, rules: d.rules, format: d.format,
    schedule: d.schedule, organizer: d.organizer, organizerContact: d.organizerContact, tags: d.tags,
    // `status` is intentionally NOT set here — Save-Draft/Publish only toggles
    // `published`; the lifecycle status keeps its existing value (default
    // "Registration Open" on create). Cancel/Full transitions live in later slices.
  };
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const events = await prisma.sportEvent.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = eventInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  const d = parsed.data;
  const event = await prisma.sportEvent.create({
    data: {
      ...toEventData(d),
      imageUrl: d.imageUrl || "/placeholder-event.jpg",
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  const event = await prisma.sportEvent.update({ where: { id: body.id }, data: toEventData(parsed.data) });
  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { entityType: "event", entityId: id } }),
    prisma.eventRegistration.deleteMany({ where: { eventId: id } }),
    prisma.sportEvent.delete({ where: { id } }),
  ]);
  return NextResponse.json({ success: true });
}
