import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { HOST_PAYMENT_METHODS, isValidUpiId } from "@/lib/hostPayment";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ ok: true, data }, { status });

/**
 * Public, CDN-cacheable read. NEVER use on authenticated or user-specific data —
 * the response is cached at the shared edge and served to everyone.
 * `s-maxage` = fresh window; `stale-while-revalidate` = serve-stale-while-refetch.
 * On a CDN hit the origin (and its DB queries) is skipped entirely.
 */
export const okCached = <T>(data: T, sMaxAge: number, swr = sMaxAge * 5) =>
  NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}` } },
  );

export const fail = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ ok: false, error: message, details }, { status });

/** Thrown by routes for user-facing errors that handleErr should surface verbatim. */
export class ApiError extends Error {
  status: number;
  constructor(userMessage: string, status = 400) {
    super(userMessage);
    this.name = "ApiError";
    this.status = status;
  }
}

const PRISMA_MESSAGES: Record<string, string> = {
  P2002: "This conflicts with an existing record.",
  P2025: "The requested item no longer exists.",
  P2011: "Missing required information.",
  P2012: "Missing required information.",
  P2003: "Missing required information.",
};

export function handleErr(e: unknown) {
  if (e instanceof ApiError) return fail(e.message, e.status);
  if (e instanceof ZodError) return fail("Validation error", 422, e.flatten().fieldErrors);
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("prisma known request error", { code: e.code, err: e });
    return fail(PRISMA_MESSAGES[e.code] ?? "Something went wrong. Please try again.", 400);
  }
  // Anything else — including PrismaClientValidationError and unknown failures —
  // is logged server-side (redacted) and returned as a generic message. Never echo e.message.
  logger.error("unhandled api error", { err: e });
  return fail("Something went wrong. Please try again.", 500);
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and _ only"),
  password: z.string().min(8),
  role: z.enum(["player", "coach"]).default("player"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Games are now booked against a structured venue slot. The host picks a sport
// (filters venues), a venue, then a concrete slot; scheduledAt, duration,
// location and address are all derived server-side from the slot + venue, so
// hosts can no longer type venue details. `slots` here is PLAYER capacity —
// unrelated to the VenueSlot time window.
export const CreateGameSchema = z.object({
  sport: z.string().min(1),
  title: z.string().min(3).max(80),
  slotId: z.string().min(1),
  slots: z.coerce.number().min(2).max(100),
  skillLevel: z.enum(["Beginner", "Intermediate", "Advanced", "All Levels"]),
  cost: z.string().default("Free"),
  // Entry fee the HOST collects directly. Game Ground creates no order for it.
  costAmount: z.coerce.number().min(0).max(100000).default(0),
  paymentMethod: z.enum(HOST_PAYMENT_METHODS).optional(),
  hostUpiId: z.string().trim().refine(v => v === "" || isValidUpiId(v), "Enter a valid UPI ID, e.g. name@bank").optional(),
  hostQrUrl: z.string().url().optional(),
  paymentNote: z.string().max(300).optional(),
  venueNote: z.string().max(300).optional(),
  description: z.string().max(1000).optional(),
  rules: z.array(z.string()).optional(),
}).refine(
  // A paid game needs to tell players how to pay; a free one must not carry
  // payment details that would render a fee section for a game with no fee.
  g => g.costAmount === 0 || !!g.paymentMethod,
  { message: "Choose how players pay you", path: ["paymentMethod"] },
);

// ─── Venue & slot schemas (admin-managed) ───────────────────────────────────
export const VenueStatusEnum = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const CreateVenueSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional().default(""),
  address: z.string().min(2).max(300),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  images: z.array(z.string().url()).optional().default([]),
  supportedSports: z.array(z.string().min(1)).min(1, "Add at least one supported sport"),
  status: VenueStatusEnum.optional().default("ACTIVE"),
});

// NB: must NOT be `CreateVenueSchema.partial()` — the `.default()`s on
// description/images/status get re-injected for omitted keys, so a status-only
// PATCH (Enable/Disable/Archive) would blank description + images. Declared
// explicitly with all-optional, no-default fields so omitted keys stay
// undefined and Prisma leaves them untouched.
export const UpdateVenueSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().min(2).max(300).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  images: z.array(z.string().url()).optional(),
  supportedSports: z.array(z.string().min(1)).min(1).optional(),
  status: VenueStatusEnum.optional(),
});

export const CreateSlotSchema = z
  .object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  })
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const BulkSlotSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  dayStart: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  dayEnd: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  slotMinutes: z.coerce.number().min(15).max(480),
});

export const BlockSlotSchema = z.object({
  isBlocked: z.boolean(),
  blockReason: z.string().max(200).optional(),
});

export const UpdateSlotSchema = z
  .object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    isBlocked: z.boolean().optional(),
    blockReason: z.string().max(200).nullable().optional(),
  })
  // When BOTH times are edited at once, reject an inverted window early. The
  // one-sided case (only start or only end) is validated in the route against
  // the slot's existing other endpoint, where both values are known.
  .refine((d) => !(d.startTime && d.endTime) || new Date(d.endTime) > new Date(d.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const BookingSchema = z.object({
  coachId: z.string().min(1),
  batchId: z.string().optional(),
  note: z.string().max(500).optional(),
});
