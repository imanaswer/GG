import { recomputeAll } from "../src/lib/reputationService";
import { TIERS, type Tier } from "../src/lib/reputation";
import { prisma } from "../src/lib/prisma";

async function main() {
  const start = Date.now();
  console.log("Backfilling reputation scores…");

  const before = await prisma.user.count({ where: { deletedAt: null } });
  console.log(`Active users: ${before}`);

  const { processed, promoted } = await recomputeAll();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const distribution = await prisma.user.groupBy({
    by: ["tier"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  const counts: Record<Tier, number> = { bronze: 0, silver: 0, gold: 0, elite: 0, pro: 0 };
  for (const row of distribution) {
    if ((TIERS as readonly string[]).includes(row.tier)) counts[row.tier as Tier] = row._count._all;
  }

  console.log(`\nProcessed ${processed} users in ${elapsed}s (${promoted} tier promotions)`);
  console.log("\nTier distribution:");
  for (const t of TIERS) {
    const pct = before > 0 ? ((counts[t] / before) * 100).toFixed(1) : "0.0";
    console.log(`  ${t.padEnd(7)} ${String(counts[t]).padStart(5)}  (${pct}%)`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
