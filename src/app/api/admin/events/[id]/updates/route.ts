import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { eventUpdateInputSchema, sortEventUpdates } from "@/lib/eventUpdates";

type Ctx = { params: Promise<{ id: string }> };

async function listUpdates(eventId: string) {
  const rows = await prisma.eventUpdate.findMany({ where: { eventId } });
  return sortEventUpdates(rows.map(u => ({ id: u.id, title: u.title, body: u.body, pinned: u.pinned, createdAt: u.createdAt.toISOString() })));
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ updates: await listUpdates(id) });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = eventUpdateInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  const event = await prisma.sportEvent.findUnique({ where: { id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  await prisma.eventUpdate.create({ data: { eventId: id, title: parsed.data.title, body: parsed.data.body, pinned: parsed.data.pinned } });
  return NextResponse.json({ updates: await listUpdates(id) }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { updateId } = await req.json().catch(() => ({}));
  if (!updateId) return NextResponse.json({ error: "Missing updateId" }, { status: 400 });
  await prisma.eventUpdate.deleteMany({ where: { id: updateId, eventId: id } });
  return NextResponse.json({ updates: await listUpdates(id) });
}
