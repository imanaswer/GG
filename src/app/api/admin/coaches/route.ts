import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/taxonomy";
import { BILLABLE_STATUSES } from "@/lib/bookings";
import { normalizeBatches, reconcileBatches, sumSeats, BatchValidationError } from "@/lib/coachBatches";

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
      confirmedBookings: bookings.filter(b => (BILLABLE_STATUSES as string[]).includes(b.status)).length,
      revenue: revenueByEntity.get(c.id) ?? 0,
      reviews: c.reviews,
    };
  });
  return NextResponse.json({ coaches });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let batches;
  try {
    batches = normalizeBatches(body.batches);
  } catch (e) {
    return NextResponse.json({ error: e instanceof BatchValidationError ? e.message : "Invalid batches" }, { status: 400 });
  }

  const manualTotal = Number.isFinite(Number(body.totalSeats)) ? Number(body.totalSeats) : 20;
  const manualLeft = Number.isFinite(Number(body.seatsLeft ?? body.totalSeats)) ? Number(body.seatsLeft ?? body.totalSeats) : 20;
  const totalSeats = batches.length ? sumSeats(batches) : manualTotal;
  const seatsLeft = batches.length ? totalSeats : manualLeft;

  const coach = await prisma.coach.create({
    data: {
      name: body.name,
      sport: body.sport,
      type: body.type,
      skillLevel: body.skillLevel || "All Levels",
      price: formatPrice(body.priceMin, body.priceMax),
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
      coverImageUrl: body.coverImageUrl || "",
      photos: Array.isArray(body.photos) ? body.photos : [],
      totalSeats,
      seatsLeft,
      status: body.status || "active",
      batches: { create: batches.map(b => ({ day: b.day, time: b.time, level: b.level, seats: b.seats })) },
    },
  });
  return NextResponse.json({ coach }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing coach id" }, { status: 400 });
  const id = body.id as string;

  const hasBatchField = body.batches !== undefined;
  let batches: ReturnType<typeof normalizeBatches> = [];
  if (hasBatchField) {
    try {
      batches = normalizeBatches(body.batches);
    } catch (e) {
      return NextResponse.json({ error: e instanceof BatchValidationError ? e.message : "Invalid batches" }, { status: 400 });
    }
  }

  const coach = await prisma.$transaction(async (tx) => {
    let seatOverride: { totalSeats: number; seatsLeft: number } | object = {};
    if (hasBatchField) {
      const existing = await tx.batch.findMany({ where: { coachId: id }, select: { id: true } });
      const { toCreate, toUpdate, toDeleteIds } = reconcileBatches(existing.map(b => b.id), batches);

      if (toDeleteIds.length) {
        // Bookings keep their coach; only the batch link is removed (batchId is nullable).
        await tx.booking.updateMany({ where: { batchId: { in: toDeleteIds } }, data: { batchId: null } });
        await tx.batch.deleteMany({ where: { id: { in: toDeleteIds } } });
      }
      for (const b of toUpdate) {
        await tx.batch.update({ where: { id: b.id }, data: { day: b.day, time: b.time, level: b.level, seats: b.seats } });
      }
      if (toCreate.length) {
        await tx.batch.createMany({ data: toCreate.map(b => ({ coachId: id, day: b.day, time: b.time, level: b.level, seats: b.seats })) });
      }
      if (batches.length) {
        const total = sumSeats(batches);
        seatOverride = { totalSeats: total, seatsLeft: total };
      }
    }

    return tx.coach.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sport !== undefined && { sport: body.sport }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.skillLevel !== undefined && { skillLevel: body.skillLevel }),
        ...(body.priceMin !== undefined && { priceMin: Number(body.priceMin) }),
        ...(body.priceMax !== undefined && { priceMax: Number(body.priceMax) }),
        ...((body.priceMin !== undefined && body.priceMax !== undefined) && { price: formatPrice(body.priceMin, body.priceMax) }),
        ...(body.timing !== undefined && { timing: body.timing }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.certifications !== undefined && { certifications: body.certifications }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.coverImageUrl !== undefined && { coverImageUrl: body.coverImageUrl }),
        ...(body.photos !== undefined && { photos: Array.isArray(body.photos) ? body.photos : [] }),
        ...(body.totalSeats !== undefined && { totalSeats: Number(body.totalSeats) }),
        ...(body.seatsLeft !== undefined && { seatsLeft: Number(body.seatsLeft) }),
        ...(body.status !== undefined && { status: body.status }),
        ...seatOverride, // when batches exist, this wins over any manual totalSeats/seatsLeft above
      },
    });
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
