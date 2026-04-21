import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [regs, workshops] = await Promise.all([
    prisma.workshopRegistration.findMany({
      include: { user: { select: { name: true, email: true, phone: true } }, workshop: { select: { title: true, sport: true } } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.workshop.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const registrations = regs.map(r => ({
    id: r.id, workshopId: r.workshopId, userId: r.userId,
    participantName: r.participantName, participantAge: r.participantAge,
    registrationType: r.registrationType,
    paymentStatus: r.paymentStatus, registeredAt: r.registeredAt,
    userName: r.user?.name, userEmail: r.user?.email, userPhone: r.user?.phone,
    workshopTitle: r.workshop?.title, workshopSport: r.workshop?.sport,
  }));
  return NextResponse.json({ registrations, workshops });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const workshop = await prisma.workshop.create({
    data: {
      title: body.title,
      sport: body.sport,
      description: body.description || "",
      sessionType: body.sessionType || "single",
      sessionCount: Number(body.sessionCount) || 1,
      sessionDuration: body.sessionDuration || "",
      sessions: body.sessions || [],
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      registrationDeadline: new Date(body.registrationDeadline),
      location: body.location || "",
      address: body.address || "",
      price: Number.isFinite(Number(body.price)) ? Number(body.price) : 0,
      priceDisplay: `₹${Number(body.price) || 0}`,
      ageGroup: body.ageGroup || "",
      audienceType: body.audienceType || "all",
      skillLevel: body.skillLevel || "All Levels",
      maxParticipants: Number.isFinite(Number(body.maxParticipants)) ? Number(body.maxParticipants) : 30,
      instructor: body.instructor || {},
      imageUrl: body.imageUrl || "/placeholder-workshop.jpg",
      featured: body.featured || false,
      status: body.status || "open",
      highlights: body.highlights || [],
      requirements: body.requirements || [],
      organizer: body.organizer || "",
      organizerContact: body.organizerContact || "",
      tags: body.tags || [],
    },
  });
  return NextResponse.json({ workshop }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing workshop id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.sport !== undefined) data.sport = body.sport;
  if (body.description !== undefined) data.description = body.description;
  if (body.sessionType !== undefined) data.sessionType = body.sessionType;
  if (body.sessionCount !== undefined) data.sessionCount = Number(body.sessionCount);
  if (body.sessionDuration !== undefined) data.sessionDuration = body.sessionDuration;
  if (body.sessions !== undefined) data.sessions = body.sessions;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.registrationDeadline !== undefined) data.registrationDeadline = new Date(body.registrationDeadline);
  if (body.location !== undefined) data.location = body.location;
  if (body.address !== undefined) data.address = body.address;
  if (body.price !== undefined) {
    data.price = Number(body.price);
    data.priceDisplay = `₹${Number(body.price)}`;
  }
  if (body.ageGroup !== undefined) data.ageGroup = body.ageGroup;
  if (body.audienceType !== undefined) data.audienceType = body.audienceType;
  if (body.skillLevel !== undefined) data.skillLevel = body.skillLevel;
  if (body.maxParticipants !== undefined) data.maxParticipants = Number(body.maxParticipants);
  if (body.instructor !== undefined) data.instructor = body.instructor;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.status !== undefined) data.status = body.status;
  if (body.highlights !== undefined) data.highlights = body.highlights;
  if (body.requirements !== undefined) data.requirements = body.requirements;
  if (body.organizer !== undefined) data.organizer = body.organizer;
  if (body.organizerContact !== undefined) data.organizerContact = body.organizerContact;
  if (body.tags !== undefined) data.tags = body.tags;

  const workshop = await prisma.workshop.update({ where: { id: body.id }, data });
  return NextResponse.json({ workshop });
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing workshop id" }, { status: 400 });
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { entityType: "workshop", entityId: id } }),
    prisma.workshopRegistration.deleteMany({ where: { workshopId: id } }),
    prisma.workshop.delete({ where: { id } }),
  ]);
  return NextResponse.json({ success: true });
}
