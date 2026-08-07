// One-off backfill: give the coaches that predate the map picker a lat/lng, so
// "Near me" on /learn has something to sort them by. Coordinates come from the
// Google Plus Codes the coaches already carried in their own location/address
// text (decoded offline — no geocoding API involved), cross-checked against the
// seeded Kozhikode venues: the Silk St pin lands 0.3 km from "SM Street Court".
//
// Run: npx tsx scripts/pin-coaches.ts [--apply]
// Dry run by default. Skips any coach that already has a pin, so it is safe to
// re-run and will never overwrite a position an admin has since adjusted.
import { config } from "dotenv";
config({ path: ".env.local" });
config();

// Built here rather than imported from src/lib/prisma: that module reads
// DATABASE_URL at import time, and tsx hoists requires above the dotenv calls
// above, so the shared singleton would connect to nothing.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Keyed by coach id prefix — enough to identify four rows without pasting cuids.
const PINS: { idPrefix: string; lat: number; lng: number; source: string }[] = [
  { idPrefix: "cmqkou7y", lat: 11.252937, lng: 75.772437, source: "7Q3C+5X  Fitness Thai, Silk St" },
  { idPrefix: "cmqkoqcz", lat: 11.252937, lng: 75.772437, source: "7Q3C+5X  Fitness Thai, Silk St" },
  { idPrefix: "cmqkvnnl", lat: 11.253237, lng: 75.771016, source: "7Q3C+7CR Tenet TT, Beach Rd" },
  { idPrefix: "cmqdt6en", lat: 11.225388, lng: 75.803859, source: "6RG3+5G5 Thiruvannur nada" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set — is .env.local present?");
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url, max: 1 })) });

  try {
    const coaches = await prisma.coach.findMany({ select: { id: true, name: true, lat: true, lng: true } });
    for (const c of coaches) {
      const pin = PINS.find(p => c.id.startsWith(p.idPrefix));
      if (!pin) { console.log(`skip    ${c.name} — no plus code on record`); continue; }
      if (c.lat != null && c.lng != null) { console.log(`skip    ${c.name} — already pinned at ${c.lat}, ${c.lng}`); continue; }
      if (apply) await prisma.coach.update({ where: { id: c.id }, data: { lat: pin.lat, lng: pin.lng } });
      console.log(`${apply ? "pinned " : "would  "} ${c.name} -> ${pin.lat}, ${pin.lng}   (${pin.source})`);
    }
    if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
