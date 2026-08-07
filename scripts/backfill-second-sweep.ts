// Repairs the data damage left by the second-sweep bugs, after their fixes are
// deployed. Three independent repairs; each is idempotent, so a second pass
// changes zero rows.
//
//   1. Coach.seatsLeft   — rebuilt from live bookings (bugs 3 and 8 both corrupted it)
//   2. CampRegistration  — free registrations stamped "paid" (bug 11)
//   3. User.reliabilityScore — recomputed on the attendance-only formula (bug 9)
//
// Run: npx tsx scripts/backfill-second-sweep.ts [--apply]
// Dry run by default. MUST run AFTER the fixed code is deployed, so no in-flight
// request can reintroduce what we just cleaned up.
import { config } from "dotenv";
config({ path: ".env.local" });
config();

// Built here rather than imported from src/lib/prisma: that module reads
// DATABASE_URL at import time, and tsx hoists requires above the dotenv calls.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// The statuses that hold a coach seat — the same pair the booking state machine
// treats as live (src/lib/bookingStatus.ts).
const HOLDS_SEAT = ["pending", "approved"];

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set — is .env.local present?");
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url, max: 1 })) });
  const say = (label: string, n: number) => console.log(`${apply ? "fixed " : "would "} ${String(n).padStart(4)}  ${label}`);

  try {
    // ── 1. Coach.seatsLeft ────────────────────────────────────────────────────
    // Ground truth, unlike Game.slotsLeft: totalSeats is stored on the row, so
    // the correct value is derivable and both directions of drift are repairable.
    // Too LOW = seats lost to deletions that cancelled bookings without releasing
    // them (bug 3). Too HIGH = seats invented by cancelling a booking that never
    // claimed one (bug 8) — those coaches are currently oversold.
    const coaches = await prisma.coach.findMany({
      select: {
        id: true, name: true, totalSeats: true, seatsLeft: true,
        _count: { select: { bookings: { where: { status: { in: HOLDS_SEAT } } } } },
      },
    });
    const expected = (c: (typeof coaches)[number]) =>
      Math.min(Math.max(c.totalSeats - c._count.bookings, 0), c.totalSeats);
    const drifted = coaches.filter(c => c.seatsLeft !== expected(c));

    for (const c of drifted) {
      const dir = c.seatsLeft < expected(c) ? "seat lost" : "oversold";
      console.log(`          · ${c.name}: seatsLeft ${c.seatsLeft} -> ${expected(c)} (${dir}; total=${c.totalSeats}, held=${c._count.bookings})`);
    }
    say("coaches with a corrected seat count", drifted.length);
    if (apply) {
      for (const c of drifted) {
        await prisma.coach.update({ where: { id: c.id }, data: { seatsLeft: expected(c) } });
      }
    }
    // Batch.seats has no equivalent ground truth — a batch's original seat count
    // is not stored anywhere — so it is deliberately left alone. If a coach
    // reports a wrong batch count, it needs a manual look.

    // ── 2. Free camp registrations ────────────────────────────────────────────
    // The free route never set paymentStatus, so the schema default "pending" left
    // these awaiting a payment that will never exist — and reputationService counts
    // camps on "paid", so free camps never counted toward anyone's reputation.
    const strandedWhere = {
      paymentStatus: "pending",
      camp: { price: 0 },
    } as const;
    // Ids first, then update by id: a to-one relation filter is fine for a read,
    // but this script only ever runs against production and there is no way to
    // test it there, so the write side uses the plainest possible predicate.
    const stranded = await prisma.campRegistration.findMany({ where: strandedWhere, select: { id: true } });
    say("free camp registrations marked paid", stranded.length);
    if (apply && stranded.length) {
      await prisma.campRegistration.updateMany({
        where: { id: { in: stranded.map(r => r.id) } },
        data: { paymentStatus: "paid" },
      });
    }

    // ── 3. reliabilityScore ───────────────────────────────────────────────────
    // reliabilityScore is written in exactly one place (src/lib/gameFinalize.ts)
    // and only at finalize time, so without this every historical score stays on
    // the old formula — attendance×0.6 + a constant 4.5×0.4, which capped a
    // perfect record at 4.8. Recomputed from the stored attendanceRate, the same
    // input the fixed formula uses.
    const users = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      select: { id: true, name: true, attendanceRate: true, reliabilityScore: true },
    });
    // Expect this to touch nearly everyone: attendanceRate defaults to 100 for a
    // user who has never been judged in a finalized game, so they all land on 5.0.
    const score = (attendanceRate: number) => Math.round((attendanceRate / 100) * 5 * 10) / 10;
    const restale = users.filter(u => u.reliabilityScore !== score(u.attendanceRate));

    for (const u of restale.slice(0, 20)) {
      console.log(`          · ${u.name}: ${u.reliabilityScore} -> ${score(u.attendanceRate)} (attendance ${u.attendanceRate}%)`);
    }
    if (restale.length > 20) console.log(`          · … and ${restale.length - 20} more`);
    say("users rescored on the attendance-only formula", restale.length);
    if (apply) {
      for (const u of restale) {
        await prisma.user.update({ where: { id: u.id }, data: { reliabilityScore: score(u.attendanceRate) } });
      }
    }

    if (apply) {
      console.log("\nNow hit /api/cron/recompute-reputation so the camp counts above feed reputation scores.");
    } else {
      console.log("\nDry run — nothing written. Re-run with --apply.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
