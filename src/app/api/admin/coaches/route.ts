import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.coach.findMany({
    include: {
      bookings: { select: { status: true } },
      reviews:  true,
      batches:  true,
    },
  });
  const payments = await prisma.payment.groupBy({ by: ["entityId"], where: { status: "paid", entityType: "booking" }, _sum: { amount: true } });
  const revenueByEntity = new Map(payments.map(p => [p.entityId, p._sum.amount ?? 0]));

  const coaches = rows.map(c => {
    const bookings = c.bookings;
    return {
      ...c,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === "confirmed").length,
      revenue: revenueByEntity.get(c.id) ?? 0,
      reviews: c.reviews,
    };
  });
  return NextResponse.json({ coaches });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const coach = await prisma.coach.create({
    data: {
      name: body.name,
      sport: body.sport,
      type: body.type,
      skillLevel: body.skillLevel || "All Levels",
      price: `₹${body.priceMin}–${body.priceMax}`,
      priceMin: Number(body.priceMin) || 0,
      priceMax: Number(body.priceMax) || 0,
      timing: body.timing || "",
      location: body.location || "",
      address: body.address || "",
      phone: body.phone || "",
      email: body.email || "",
      description: body.description || "",
      features: body.features || [],
      certifications: body.certifications || [],
      imageUrl: body.imageUrl || "/placeholder-coach.jpg",
      totalSeats: Number.isFinite(Number(body.totalSeats)) ? Number(body.totalSeats) : 20,
      seatsLeft: Number.isFinite(Number(body.seatsLeft ?? body.totalSeats)) ? Number(body.seatsLeft ?? body.totalSeats) : 20,
      status: body.status || "active",
    },
  });
  return NextResponse.json({ coach }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing coach id" }, { status: 400 });
  const coach = await prisma.coach.update({
    where: { id: body.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.sport !== undefined && { sport: body.sport }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.skillLevel !== undefined && { skillLevel: body.skillLevel }),
      ...(body.priceMin !== undefined && { priceMin: Number(body.priceMin) }),
      ...(body.priceMax !== undefined && { priceMax: Number(body.priceMax) }),
      ...((body.priceMin !== undefined && body.priceMax !== undefined) && { price: `₹${Number(body.priceMin)}–${Number(body.priceMax)}` }),
      ...(body.timing !== undefined && { timing: body.timing }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.features !== undefined && { features: body.features }),
      ...(body.certifications !== undefined && { certifications: body.certifications }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.totalSeats !== undefined && { totalSeats: Number(body.totalSeats) }),
      ...(body.seatsLeft !== undefined && { seatsLeft: Number(body.seatsLeft) }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });
  return NextResponse.json({ coach });
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing coach id" }, { status: 400 });
  await prisma.$transaction(async (tx) => {
    const bookingIds = (await tx.booking.findMany({ where: { coachId: id }, select: { id: true } })).map(b => b.id);
    if (bookingIds.length) {
      await tx.payment.deleteMany({ where: { entityType: "booking", entityId: { in: bookingIds } } });
    }
    await tx.review.deleteMany({ where: { coachId: id } });
    await tx.booking.deleteMany({ where: { coachId: id } });
    await tx.batch.deleteMany({ where: { coachId: id } });
    await tx.coach.delete({ where: { id } });
  });
  return NextResponse.json({ success: true });
}
