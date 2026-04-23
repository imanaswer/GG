import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [regs, events] = await Promise.all([
    prisma.eventRegistration.findMany({
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true, type: true, entryFeeAmount: true } } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.sportEvent.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const registrations = regs.map(r => ({
    id: r.id, eventId: r.eventId, userId: r.userId, teamName: r.teamName,
    paymentStatus: r.paymentStatus, registeredAt: r.registeredAt,
    playerName: r.user?.name, playerEmail: r.user?.email,
    eventTitle: r.event?.title, eventType: r.event?.type, entryFee: r.event?.entryFeeAmount ?? 0,
  }));
  return NextResponse.json({ registrations, events });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const event = await prisma.sportEvent.create({
    data: {
      title: body.title,
      sport: body.sport,
      type: body.type || "Tournament",
      date: body.date || "",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      registrationDeadline: new Date(body.registrationDeadline),
      location: body.location || "",
      address: body.address || "",
      maxParticipants: Number.isFinite(Number(body.maxParticipants)) ? Number(body.maxParticipants) : 100,
      prizePool: body.prizePool || "",
      entryFee: body.entryFee || "Free",
      entryFeeAmount: Number(body.entryFeeAmount) || 0,
      difficulty: body.difficulty || "Open",
      imageUrl: body.imageUrl || "/placeholder-event.jpg",
      featured: body.featured || false,
      status: body.status || "Registration Open",
      description: body.description || "",
      format: body.format || [],
      prizes: body.prizes || [],
      requirements: body.requirements || [],
      organizer: body.organizer || "",
      organizerContact: body.organizerContact || "",
      tags: body.tags || [],
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.sport !== undefined) data.sport = body.sport;
  if (body.type !== undefined) data.type = body.type;
  if (body.date !== undefined) data.date = body.date;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.registrationDeadline !== undefined) data.registrationDeadline = new Date(body.registrationDeadline);
  if (body.location !== undefined) data.location = body.location;
  if (body.address !== undefined) data.address = body.address;
  if (body.maxParticipants !== undefined) data.maxParticipants = Number(body.maxParticipants);
  if (body.prizePool !== undefined) data.prizePool = body.prizePool;
  if (body.entryFee !== undefined) data.entryFee = body.entryFee;
  if (body.entryFeeAmount !== undefined) data.entryFeeAmount = Number(body.entryFeeAmount);
  if (body.difficulty !== undefined) data.difficulty = body.difficulty;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.status !== undefined) data.status = body.status;
  if (body.description !== undefined) data.description = body.description;
  if (body.format !== undefined) data.format = body.format;
  if (body.prizes !== undefined) data.prizes = body.prizes;
  if (body.requirements !== undefined) data.requirements = body.requirements;
  if (body.organizer !== undefined) data.organizer = body.organizer;
  if (body.organizerContact !== undefined) data.organizerContact = body.organizerContact;
  if (body.tags !== undefined) data.tags = body.tags;

  const event = await prisma.sportEvent.update({ where: { id: body.id }, data });
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
