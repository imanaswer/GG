import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ ok: true, data }, { status });

export const fail = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ ok: false, error: message, details }, { status });

export function handleErr(e: unknown) {
  if (e instanceof ZodError) return fail("Validation error", 422, e.flatten().fieldErrors);
  if (e instanceof Error) return fail(e.message, 400);
  return fail("Internal server error", 500);
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
