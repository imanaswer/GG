import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [regs, camps] = await Promise.all([
    prisma.campRegistration.findMany({
      include: { user: { select: { name: true, email: true, phone: true } }, camp: { select: { title: true, sport: true } } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.camp.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const registrations = regs.map(r => ({
    id: r.id, campId: r.campId, userId: r.userId, childName: r.childName, childAge: r.childAge,
    paymentStatus: r.paymentStatus, registeredAt: r.registeredAt,
    parentName: r.user?.name, parentEmail: r.user?.email, parentPhone: r.user?.phone,
    campTitle: r.camp?.title, campSport: r.camp?.sport,
  }));
  return NextResponse.json({ registrations, camps });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const camp = await prisma.camp.create({
    data: {
      title: body.title,
      sport: body.sport,
      duration: body.duration || "",
      dates: body.dates || "",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      registrationDeadline: new Date(body.registrationDeadline),
      location: body.location || "",
      address: body.address || "",
      price: Number.isFinite(Number(body.price)) ? Number(body.price) : 0,
      priceDisplay: `₹${Number(body.price) || 0}`,
      ageGroup: body.ageGroup || "",
      skillLevel: body.skillLevel || "All Levels",
      maxParticipants: Number.isFinite(Number(body.maxParticipants)) ? Number(body.maxParticipants) : 50,
      description: body.description || "",
      highlights: body.highlights || [],
      included: body.included || [],
      whatToBring: body.whatToBring || [],
      imageUrl: body.imageUrl || "/placeholder-camp.jpg",
      featured: body.featured || false,
      status: body.status || "open",
      organizer: body.organizer || "",
      organizerContact: body.organizerContact || "",
    },
  });
  return NextResponse.json({ camp }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing camp id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.sport !== undefined) data.sport = body.sport;
  if (body.duration !== undefined) data.duration = body.duration;
  if (body.dates !== undefined) data.dates = body.dates;
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
  if (body.skillLevel !== undefined) data.skillLevel = body.skillLevel;
  if (body.maxParticipants !== undefined) data.maxParticipants = Number(body.maxParticipants);
  if (body.description !== undefined) data.description = body.description;
  if (body.highlights !== undefined) data.highlights = body.highlights;
  if (body.included !== undefined) data.included = body.included;
  if (body.whatToBring !== undefined) data.whatToBring = body.whatToBring;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.status !== undefined) data.status = body.status;
  if (body.organizer !== undefined) data.organizer = body.organizer;
  if (body.organizerContact !== undefined) data.organizerContact = body.organizerContact;

  const camp = await prisma.camp.update({ where: { id: body.id }, data });
  return NextResponse.json({ camp });
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing camp id" }, { status: 400 });
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { entityType: "camp", entityId: id } }),
    prisma.campRegistration.deleteMany({ where: { campId: id } }),
    prisma.camp.delete({ where: { id } }),
  ]);
  return NextResponse.json({ success: true });
}
