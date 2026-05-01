import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const ACCOUNTS: { email: string; name: string; username: string; location?: string }[] = [
  { email: "demo@gameground.com",  name: "Demo Player",   username: "demo",   location: "Kozhikode, Kerala" },
  { email: "priya@gameground.com", name: "Priya Menon",   username: "priya",  location: "Kozhikode, Kerala" },
  { email: "rahul@gameground.com", name: "Rahul Krishnan",username: "rahul",  location: "Kozhikode, Kerala" },
];

const PASSWORD = "password123";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const acct of ACCOUNTS) {
    const existing = await prisma.user.findUnique({
      where: { email: acct.email },
      select: { id: true, email: true, deletedAt: true, name: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email: acct.email,
          name: acct.name,
          username: acct.username,
          passwordHash: hash,
          role: "player",
          location: acct.location ?? null,
          sports: ["Football", "Badminton"],
        },
      });
      console.log(`+ ${acct.email}: created`);
      continue;
    }

    await prisma.user.update({
      where: { email: acct.email },
      data: { passwordHash: hash, deletedAt: null },
    });
    const note = existing.deletedAt ? "(restored from soft-delete)" : "";
    console.log(`✓ ${acct.email}: password reset ${note}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
