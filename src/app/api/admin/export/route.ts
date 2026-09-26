import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    let data: any[] = [];
    let filename = "export.csv";

    if (type === "users") {
      const users = await prisma.user.findMany({ where: { role: { not: "admin" } } });
      data = users.map(u => ({
        ID: u.id,
        Name: u.name || "",
        Email: u.email || "",
        Phone: u.phone || "",
        Tier: u.tier,
        Reputation: u.reliabilityScore,
        Joined: u.createdAt.toISOString()
      }));
      filename = "users_export.csv";
    } else if (type === "bookings") {
      const bookings = await prisma.booking.findMany({ include: { user: true, coach: true } });
      data = bookings.map(b => ({
        ID: b.id,
        User: b.user.name || b.user.phone || b.userId,
        Coach: b.coach.name,
        Status: b.status,
        Amount: b.amountPaid || 0,
        PaymentStatus: b.paymentStatus,
        Date: b.createdAt.toISOString()
      }));
      filename = "bookings_export.csv";
    } else if (type === "revenue") {
      const payments = await prisma.payment.findMany({ include: { user: true } });
      data = payments.map(p => ({
        ID: p.id,
        Amount: p.amount / 100, // paise to rupees
        Status: p.status,
        User: p.user?.name || "N/A",
        EntityType: p.entityType,
        Date: p.createdAt.toISOString()
      }));
      filename = "revenue_export.csv";
    } else if (type === "coaches") {
      const coaches = await prisma.coach.findMany({ include: { user: true } });
      data = coaches.map(c => ({
        ID: c.id,
        Name: c.name,
        Status: c.status,
        UserEmail: c.user?.email || "",
        SeatsLeft: c.seatsLeft,
        Specialities: c.specialities.join(", ")
      }));
      filename = "coaches_export.csv";
    } else if (type === "events") {
      const events = await prisma.sportEvent.findMany();
      data = events.map(e => ({
        ID: e.id,
        Title: e.title,
        Venue: e.location,
        Date: new Date(e.startDate).toLocaleDateString(),
        Cost: e.entryFeeAmount,
        CurrentParticipants: e.participants,
        MaxParticipants: e.maxParticipants
      }));
      filename = "events_export.csv";
    } else if (type === "venues") {
      const venues = await prisma.venue.findMany();
      data = venues.map(v => ({
        ID: v.id,
        Name: v.name,
        Address: v.address,
        Status: v.status,
        SupportedSports: v.supportedSports.join(", ")
      }));
      filename = "venues_export.csv";
    } else if (type === "games") {
      const games = await prisma.game.findMany({ include: { organizer: true } });
      data = games.map(g => ({
        ID: g.id,
        Title: g.title,
        Organiser: g.organizer?.name || "N/A",
        Location: g.location,
        ScheduledAt: new Date(g.scheduledAt).toLocaleString(),
        Slots: g.slots,
        SlotsLeft: g.slotsLeft,
        Cost: g.cost,
        Status: g.status
      }));
      filename = "games_export.csv";
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (data.length === 0) {
      return new NextResponse("No data available", {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
