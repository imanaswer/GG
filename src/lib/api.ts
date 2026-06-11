import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { Prisma } from "@prisma/client";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ ok: true, data }, { status });

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
    console.error("[prisma]", e.code, e.message);
    return fail(PRISMA_MESSAGES[e.code] ?? "Something went wrong. Please try again.", 400);
  }
  // Anything else — including PrismaClientValidationError and unknown failures —
  // is logged server-side and returned as a generic message. Never echo e.message.
  console.error("[unhandled]", e);
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

export const CreateGameSchema = z.object({
  sport: z.string().min(1),
  title: z.string().min(3).max(80),
  location: z.string().min(2),
  address: z.string().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.coerce.number().min(15).max(480),
  slots: z.coerce.number().min(2).max(100),
  skillLevel: z.enum(["Beginner", "Intermediate", "Advanced", "All Levels"]),
  cost: z.string().default("Free"),
  costAmount: z.coerce.number().default(0),
  description: z.string().max(1000).optional(),
  rules: z.array(z.string()).optional(),
});

export const BookingSchema = z.object({
  coachId: z.string().min(1),
  batchId: z.string().optional(),
  note: z.string().max(500).optional(),
});
