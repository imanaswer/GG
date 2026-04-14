/**
 * Seeds the database from data/db.json.
 * Run with: npm run db:seed  (wipes + re-seeds; safe to run on an empty DB)
 *
 * Order respects FK dependencies. Nested arrays in db.json that have no
 * corresponding Prisma model (camp.coaches, camp.dailySchedule, camp.testimonials,
 * event.schedule) are persisted into Json columns on the parent row.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Create .env.local from .env.example and add your Supabase connection string.");
}
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Json = Record<string, unknown>;

interface DbFile {
  users: Json[];
  coaches: (Json & { batches?: Json[] })[];
  games: Json[];
  gamePlayers: Json[];
  waitlist: Json[];
  bookings: Json[];
  reviews: Json[];
  camps: (Json & { coaches?: Json[]; dailySchedule?: Json[]; testimonials?: Json[]; reviews?: number })[];
  campRegistrations: Json[];
  events: (Json & { schedule?: Json[] })[];
  eventRegistrations: Json[];
  payments: Json[];
}

function loadDb(): DbFile {
  const p = path.join(process.cwd(), "data", "db.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as DbFile;
}

async function wipe() {
  // Delete in reverse FK order.
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.eventRegistration.deleteMany(),
    prisma.sportEvent.deleteMany(),
    prisma.campRegistration.deleteMany(),
    prisma.camp.deleteMany(),
    prisma.review.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.waitlistEntry.deleteMany(),
    prisma.gamePlayer.deleteMany(),
    prisma.game.deleteMany(),
    prisma.batch.deleteMany(),
    prisma.coach.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (x: any) => (x ? new Date(x) : undefined);

async function seed() {
  const db = loadDb();

  console.log(`→ Seeding ${db.users.length} users…`);
  for (const u of db.users as Record<string, unknown>[]) {
    await prisma.user.create({
      data: {
        id:                   u.id as string,
        email:                u.email as string,
        name:                 u.name as string,
        username:             u.username as string,
        passwordHash:         u.passwordHash as string,
        role:                 (u.role as string) ?? "player",
        location:             (u.location as string) ?? null,
        bio:                  (u.bio as string) ?? null,
        avatarUrl:            (u.avatarUrl as string) ?? null,
        phone:                (u.phone as string) ?? null,
        sports:               (u.sports as string[]) ?? [],
        reliabilityScore:     (u.reliabilityScore as number) ?? 5,
        gamesPlayed:          (u.gamesPlayed as number) ?? 0,
        gamesOrganized:       (u.gamesOrganized as number) ?? 0,
        attendanceRate:       (u.attendanceRate as number) ?? 100,
        createdAt:            d(u.createdAt) ?? new Date(),
      },
    });
  }

  console.log(`→ Seeding ${db.coaches.length} coaches (+ batches)…`);
  for (const c of db.coaches) {
    const { batches = [], ...rest } = c;
    await prisma.coach.create({
      data: {
        id:             rest.id as string,
        name:           rest.name as string,
        sport:          rest.sport as string,
        type:           rest.type as string,
        skillLevel:     rest.skillLevel as string,
        price:          rest.price as string,
        priceMin:       rest.priceMin as number,
        priceMax:       rest.priceMax as number,
        timing:         rest.timing as string,
        location:       rest.location as string,
        address:        rest.address as string,
        phone:          rest.phone as string,
        email:          rest.email as string,
        description:    rest.description as string,
        features:       (rest.features as string[]) ?? [],
        certifications: (rest.certifications as string[]) ?? [],
        imageUrl:       rest.imageUrl as string,
        rating:         (rest.rating as number) ?? 0,
        reviewCount:    (rest.reviewCount as number) ?? 0,
        totalSeats:     rest.totalSeats as number,
        seatsLeft:      rest.seatsLeft as number,
        status:         (rest.status as string) ?? "active",
        lat:            (rest.lat as number) ?? null,
        lng:            (rest.lng as number) ?? null,
        userId:         (rest.userId as string) ?? null,
        batches: {
          create: batches.map((b: Record<string, unknown>) => ({
            id:    b.id as string,
            day:   b.day as string,
            time:  b.time as string,
            level: b.level as string,
            seats: b.seats as number,
          })),
        },
      },
    });
  }

  console.log(`→ Seeding ${db.games.length} games…`);
  for (const g of db.games as Record<string, unknown>[]) {
    await prisma.game.create({
      data: {
        id:                 g.id as string,
        sport:              g.sport as string,
        title:              g.title as string,
        location:           g.location as string,
        address:            g.address as string,
        scheduledAt:        new Date(g.scheduledAt as string),
        duration:           g.duration as number,
        slots:              g.slots as number,
        slotsLeft:          g.slotsLeft as number,
        skillLevel:         g.skillLevel as string,
        organizerId:        g.organizerId as string,
        cost:               g.cost as string,
        costAmount:         (g.costAmount as number) ?? 0,
        description:        (g.description as string) ?? "",
        rules:              (g.rules as string[]) ?? [],
        imageUrl:           g.imageUrl as string,
        status:             (g.status as string) ?? "open",
        lat:                (g.lat as number) ?? null,
        lng:                (g.lng as number) ?? null,
        attendanceRecorded: (g.attendanceRecorded as boolean) ?? false,
        createdAt:          d(g.createdAt) ?? new Date(),
      },
    });
  }

  if (db.gamePlayers.length) {
    console.log(`→ Seeding ${db.gamePlayers.length} game players…`);
    await prisma.gamePlayer.createMany({
      data: (db.gamePlayers as Record<string, unknown>[]).map(p => ({
        id:       p.id as string,
        gameId:   p.gameId as string,
        userId:   p.userId as string,
        attended: (p.attended as boolean) ?? null,
        joinedAt: new Date(p.joinedAt as string),
      })),
    });
  }

  if (db.reviews.length) {
    console.log(`→ Seeding ${db.reviews.length} reviews…`);
    await prisma.review.createMany({
      data: (db.reviews as Record<string, unknown>[]).map(r => ({
        id:           r.id as string,
        userId:       r.userId as string,
        coachId:      r.coachId as string,
        rating:       r.rating as number,
        text:         r.text as string,
        reviewerName: r.reviewerName as string,
        createdAt:    new Date(r.createdAt as string),
      })),
    });
  }

  console.log(`→ Seeding ${db.camps.length} camps…`);
  for (const c of db.camps) {
    await prisma.camp.create({
      data: {
        id:                   c.id as string,
        title:                c.title as string,
        sport:                c.sport as string,
        duration:             c.duration as string,
        dates:                c.dates as string,
        startDate:            new Date(c.startDate as string),
        endDate:              new Date(c.endDate as string),
        registrationDeadline: new Date(c.registrationDeadline as string),
        location:             c.location as string,
        address:              c.address as string,
        distance:             (c.distance as string) ?? "",
        price:                c.price as number,
        priceDisplay:         c.priceDisplay as string,
        ageGroup:             c.ageGroup as string,
        skillLevel:           c.skillLevel as string,
        rating:               (c.rating as number) ?? 0,
        reviewCount:          (c.reviews as number) ?? 0,
        participants:         (c.participants as number) ?? 0,
        maxParticipants:      c.maxParticipants as number,
        description:          c.description as string,
        highlights:           (c.highlights as string[]) ?? [],
        included:             (c.included as string[]) ?? [],
        whatToBring:          (c.whatToBring as string[]) ?? [],
        imageUrl:             c.imageUrl as string,
        featured:             (c.featured as boolean) ?? false,
        status:               (c.status as string) ?? "open",
        tags:                 (c.tags as string[]) ?? [],
        organizer:            c.organizer as string,
        organizerContact:     c.organizerContact as string,
        coaches:              (c.coaches ?? []) as object,
        dailySchedule:        (c.dailySchedule ?? []) as object,
        testimonials:         (c.testimonials ?? []) as object,
        createdAt:            d(c.createdAt) ?? new Date(),
      },
    });
  }

  console.log(`→ Seeding ${db.events.length} events…`);
  for (const e of db.events) {
    await prisma.sportEvent.create({
      data: {
        id:                   e.id as string,
        title:                e.title as string,
        sport:                e.sport as string,
        type:                 e.type as string,
        date:                 e.date as string,
        startDate:            new Date(e.startDate as string),
        endDate:              new Date(e.endDate as string),
        registrationDeadline: new Date(e.registrationDeadline as string),
        location:             e.location as string,
        address:              e.address as string,
        distance:             (e.distance as string) ?? "",
        participants:         (e.participants as number) ?? 0,
        maxParticipants:      e.maxParticipants as number,
        prizePool:            e.prizePool as string,
        entryFee:             e.entryFee as string,
        entryFeeAmount:       (e.entryFeeAmount as number) ?? 0,
        difficulty:           e.difficulty as string,
        imageUrl:             e.imageUrl as string,
        featured:             (e.featured as boolean) ?? false,
        status:               (e.status as string) ?? "Registration Open",
        description:          e.description as string,
        format:               (e.format as string[]) ?? [],
        prizes:               (e.prizes as string[]) ?? [],
        requirements:         (e.requirements as string[]) ?? [],
        organizer:            e.organizer as string,
        organizerContact:     e.organizerContact as string,
        tags:                 (e.tags as string[]) ?? [],
        schedule:             (e.schedule ?? []) as object,
        createdAt:            d(e.createdAt) ?? new Date(),
      },
    });
  }

  if (db.bookings.length) {
    console.log(`→ Seeding ${db.bookings.length} bookings…`);
    await prisma.booking.createMany({ data: db.bookings as never });
  }
  if (db.waitlist.length) {
    console.log(`→ Seeding ${db.waitlist.length} waitlist entries…`);
    await prisma.waitlistEntry.createMany({ data: db.waitlist as never });
  }
  if (db.campRegistrations.length) {
    console.log(`→ Seeding ${db.campRegistrations.length} camp registrations…`);
    await prisma.campRegistration.createMany({ data: db.campRegistrations as never });
  }
  if (db.eventRegistrations.length) {
    console.log(`→ Seeding ${db.eventRegistrations.length} event registrations…`);
    await prisma.eventRegistration.createMany({ data: db.eventRegistrations as never });
  }
  if (db.payments.length) {
    console.log(`→ Seeding ${db.payments.length} payments…`);
    await prisma.payment.createMany({ data: db.payments as never });
  }
}

async function main() {
  console.log("Wiping existing data…");
  await wipe();
  await seed();
  console.log("✓ Seed complete.");
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
