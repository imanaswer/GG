import { NextRequest } from "next/server";
import { getDB, saveDB, uid } from "@/lib/db";
import { ok, fail, handleErr } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { name, email, phone, password, sport, type, location, address, bio, timing, priceMin, priceMax, features, certifications, batches } = data;

    if (!name || !email || !password || !sport || !location) return fail("Required fields missing", 400);
    if (password.length < 8) return fail("Password must be at least 8 characters", 400);

    const db = getDB();
    if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) return fail("Email already registered", 409);

    // Create user account
    const userId = uid("u_");
    db.users.push({
      id: userId, email, name, username: email.split("@")[0].toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12), role: "coach",
      phone, location, bio, sports: [sport],
      reliabilityScore: 5, gamesPlayed: 0, gamesOrganized: 0, attendanceRate: 100,
      createdAt: new Date().toISOString(),
    });

    // Create coach record (pending approval)
    const coachId = uid("c_");
    const priceDisplay = priceMin && priceMax ? `₹${priceMin.toLocaleString()}–${priceMax.toLocaleString()}/session` : "Contact for price";
    db.coaches.push({
      id: coachId, userId, name, sport, type, location, address: address ?? location, phone: phone ?? "", email,
      description: bio ?? "", features: features ?? [],
      skillLevel: "All Levels", price: priceDisplay, priceMin: priceMin ?? 500, priceMax: priceMax ?? 2000,
      timing: timing ?? "", imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${coachId}`,
      rating: 0, reviewCount: 0, totalSeats: batches?.reduce((a: number, b: { seats: number }) => a + (b.seats ?? 0), 0) ?? 10,
      seatsLeft: batches?.reduce((a: number, b: { seats: number }) => a + (b.seats ?? 0), 0) ?? 10,
      status: "pending_approval", certifications: certifications ?? [],
      batches: (batches ?? []).map((b: { day: string; time: string; level: string; seats: number }) => ({ ...b, id: uid("bt_"), coachId })),
    });

    saveDB(db);
    return ok({ registered: true, coachId, message: "Application submitted. You'll hear back within 48 hours." });
  } catch (e) { return handleErr(e); }
}
