import { z } from "zod";

export const EVENT_APPROVAL_MODES = ["auto", "manual"] as const;

/** A schedule entry as authored in the wizard (new shape). */
export type ScheduleItem = { title: string; date: string; time: string; location: string };

/** Legacy schedule entry shape kept for back-compat reads. */
export type LegacyScheduleItem = { day: string; time: string; event: string };

/** Minimal event shape needed to derive a display status at read time. */
export type StatusInput = {
  published: boolean;
  status: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
};

/**
 * Derive the user-facing status at read time. Stored `status` only carries the
 * values that cannot be derived (Registration Open / Full / Cancelled);
 * everything time-based is computed here. Draft is only ever shown to admins —
 * callers decide whether to surface it.
 *
 * Order matters: Completed (endDate passed) is checked BEFORE Registration
 * Closed (deadline passed) because a finished event has both in the past.
 */
export function deriveEventStatus(e: StatusInput, now: Date): string {
  if (!e.published) return "Draft";
  if (e.status === "Cancelled") return "Cancelled";
  if (e.startDate <= now && e.endDate >= now) return "Live";
  if (e.endDate < now) return "Completed";
  if (e.registrationDeadline < now) return "Registration Closed";
  return e.status;
}

const scheduleItemSchema = z.object({
  title: z.string().max(120).default(""),
  date: z.string().max(40).default(""),
  time: z.string().max(40).default(""),
  location: z.string().max(160).default(""),
});

const dateStr = z.string().min(1); // YYYY-MM-DD from <input type="date">; parsed to Date in the route.

/**
 * Input schema for admin create/edit. Strings default to "" and arrays to []
 * so a partial wizard payload is always complete for Prisma. `published` is
 * controlled by Save-Draft (false) vs Publish (true) — defaults to false so an
 * accidental bare POST never publishes.
 */
export const eventInputSchema = z
  .object({
    title: z.string().min(1).max(120),
    sport: z.string().min(1),
    type: z.string().min(1).default("Tournament"),
    difficulty: z.string().default("All Levels"),
    date: z.string().default(""),
    startDate: dateStr,
    endDate: dateStr,
    registrationDeadline: dateStr,
    // registration settings
    maxParticipants: z.coerce.number().int().min(1).max(100000),
    entryFee: z.string().default("Free"),
    entryFeeAmount: z.coerce.number().int().min(0).default(0),
    currency: z.string().default("INR"),
    gstPercent: z.coerce.number().int().min(0).max(100).default(0),
    convenienceFeePct: z.coerce.number().int().min(0).max(100).default(0),
    approvalMode: z.enum(EVENT_APPROVAL_MODES).default("auto"),
    // media
    imageUrl: z.string().default(""),
    thumbnailUrl: z.string().default(""),
    featured: z.boolean().default(false),
    // overview
    description: z.string().default(""),
    aboutLong: z.string().default(""),
    requirements: z.array(z.string()).default([]),
    whatYouGet: z.array(z.string()).default([]),
    venueInfo: z.string().default(""),
    // format
    matchFormat: z.string().default(""),
    teamSize: z.string().default(""),
    numRounds: z.string().default(""),
    structure: z.string().default(""),
    eligibility: z.string().default(""),
    rules: z.array(z.string()).default([]),
    format: z.array(z.string()).default([]),
    // prizes
    prizePool: z.string().default(""),
    prizes: z.array(z.string()).default([]),
    additionalRewards: z.array(z.string()).default([]),
    // schedule
    schedule: z.array(scheduleItemSchema).default([]),
    // location
    location: z.string().default(""),
    address: z.string().default(""),
    city: z.string().default(""),
    state: z.string().default(""),
    country: z.string().default("India"),
    pincode: z.string().default(""),
    mapsLink: z.string().default(""),
    lat: z.coerce.number().min(-90).max(90).nullable().optional(),
    lng: z.coerce.number().min(-180).max(180).nullable().optional(),
    // misc
    organizer: z.string().default(""),
    organizerContact: z.string().default(""),
    tags: z.array(z.string()).default([]),
    // publish control
    published: z.boolean().default(false),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;
