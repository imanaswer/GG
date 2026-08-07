// Repairs the damage left by account deletions that ran before the fix in
// users/[id] DELETE (see that handler for what each item is and why).
//
// Run: npx tsx scripts/backfill-deleted-accounts.ts [--apply]
// Dry run by default, and every statement is idempotent — re-running it after a
// successful pass changes zero rows.
//
// MUST run after the fixed handler is deployed, so no in-flight delete can
// reintroduce what we just cleaned up.
import { config } from "dotenv";
config({ path: ".env.local" });
config();

// Built here rather than imported from src/lib/prisma: that module reads
// DATABASE_URL at import time, and tsx hoists requires above the dotenv calls.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const LIVE = ["open", "full"];

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set — is .env.local present?");
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url, max: 1 })) });
  const say = (label: string, n: number) => console.log(`${apply ? "fixed " : "would "} ${String(n).padStart(4)}  ${label}`);

  try {
    const deleted = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, googleId: true, appleId: true },
    });
    const deletedIds = deleted.map(u => u.id);
    console.log(`${deleted.length} deleted accounts on record\n`);

    if (!deletedIds.length) { console.log("Nothing to do."); return; }

    // ── 1d — release social identifiers still held by tombstones ──────────────
    const holding = deleted.filter(u => u.googleId || u.appleId);
    say("tombstones still holding a googleId/appleId", holding.length);
    if (apply && holding.length) {
      await prisma.user.updateMany({
        where: { id: { in: holding.map(u => u.id) } },
        data: { googleId: null, appleId: null },
      });
    }

    // ── 3b — anonymise names still on public game listings ────────────────────
    const named = deleted.filter(u => u.name !== "Deleted User");
    say('tombstones whose real name is still shown as organizerName', named.length);
    if (apply && named.length) {
      await prisma.user.updateMany({ where: { id: { in: named.map(u => u.id) } }, data: { name: "Deleted User" } });
    }

    // ── 3a — cancel live games hosted by deleted accounts, freeing their slots ─
    const orphaned = await prisma.game.findMany({
      where: { organizerId: { in: deletedIds }, status: { in: LIVE } },
      select: { id: true, title: true, slotId: true },
    });
    say("live games hosted by a deleted account (cancelled, venue slot freed)", orphaned.length);
    for (const g of orphaned) console.log(`          · ${g.title}${g.slotId ? " (holding a venue slot)" : ""}`);
    if (apply && orphaned.length) {
      await prisma.game.updateMany({
        where: { id: { in: orphaned.map(g => g.id) } },
        data: { status: "cancelled", cancelledAt: new Date(), slotId: null },
      });
    }

    // ── 3d — waitlist rows belonging to deleted accounts ──────────────────────
    const staleWaitlist = await prisma.waitlistEntry.count({ where: { userId: { in: deletedIds } } });
    say("waitlist entries held by deleted accounts", staleWaitlist);
    if (apply && staleWaitlist) {
      await prisma.waitlistEntry.deleteMany({ where: { userId: { in: deletedIds } } });
    }

    // ── 3c — seat-leak audit ──────────────────────────────────────────────────
    // The leaked seats cannot be identified directly: the GamePlayer rows are
    // already gone. A blanket rebuild from slots - 1 - playerCount would fix
    // them, but that formula is only guaranteed for games created through
    // POST /api/games — prisma/seed.ts writes slotsLeft verbatim from db.json.
    // So audit first and let the numbers decide; never rebuild blind.
    const live = await prisma.game.findMany({
      where: { status: { in: LIVE } },
      select: { id: true, title: true, slots: true, slotsLeft: true, status: true, _count: { select: { players: true } } },
    });
    const expected = (g: { slots: number; _count: { players: number } }) => Math.max(0, g.slots - 1 - g._count.players);
    const drifted = live.filter(g => g.slotsLeft !== expected(g));
    console.log(`\nslotsLeft audit: ${drifted.length} of ${live.length} live games do not match slots - 1 - players`);

    // Only ever raise. A leaked seat always leaves slotsLeft too LOW, and raising
    // it back can at worst free a seat that was already free. Lowering could take
    // a real seat away from a game whose count was never leak-related — seed.ts
    // writes slotsLeft verbatim from db.json, so the formula is not universal.
    const tooLow  = drifted.filter(g => g.slotsLeft < expected(g));
    const tooHigh = drifted.filter(g => g.slotsLeft > expected(g));

    for (const g of tooLow) {
      console.log(`          · ${g.title}: slotsLeft ${g.slotsLeft} -> ${expected(g)}${g.status === "full" && expected(g) > 0 ? ", full -> open" : ""} (slots=${g.slots}, players=${g._count.players})`);
    }
    say("live games with a leaked seat restored", tooLow.length);
    if (apply) {
      for (const g of tooLow) {
        await prisma.game.update({
          where: { id: g.id },
          data: {
            slotsLeft: expected(g),
            ...(g.status === "full" && expected(g) > 0 ? { status: "open" } : {}),
          },
        });
      }
    }

    for (const g of tooHigh) {
      console.log(`          ! ${g.title}: slotsLeft ${g.slotsLeft} exceeds the expected ${expected(g)} — LEFT ALONE, lowering it would remove a real seat. Check by hand.`);
    }

    if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
