# Event System Slice 1 — Admin Authoring + Content Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped single-modal event editor with a 5-step authoring wizard backed by an enriched `SportEvent` content model, Draft/Publish, and detail-page rendering of the new fields — without touching the working Razorpay/registration core.

**Architecture:** One additive Prisma migration adds optional columns to `SportEvent`. A new pure module `src/lib/events.ts` holds the zod input schema, an enriched `ScheduleItem` type, and a read-time `deriveEventStatus` helper (unit-tested). Admin POST/PUT persist the new fields; public list + detail routes gain a `published` draft guard and apply `deriveEventStatus`. A new `EventWizard` client component replaces the inline admin form, and the detail page renders the new fields with back-compat fallbacks.

**Tech Stack:** Next.js 16.2 (App Router, route handlers), Prisma 7 + PostgreSQL (Supabase), React 19, `@tanstack/react-query`, zod 4, framer-motion, vitest. Inline-style design system (black `#050505` / red `#e63946`).

**Spec:** `docs/superpowers/specs/2026-06-12-event-authoring-content-model-design.md`

---

## ⚠️ Pre-flight (do once before Task 1)

- [ ] **Read the Next.js 16 docs this repo ships.** Per `AGENTS.md`, this Next.js has breaking changes vs training data. Before writing any route-handler or `next/image` code, skim:
  - `node_modules/next/dist/docs/` — look for route handler / `app` router / `next/image` guides and any deprecation notices.
  - Confirm the existing route-handler signature pattern already in use: `export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> })` (params is a Promise — already used in `src/app/api/events/[id]/route.ts`).

---

## File Structure

**Create:**
- `src/lib/events.ts` — `ScheduleItem` type, `eventInputSchema` (zod), `deriveEventStatus()`, `EVENT_APPROVAL_MODES`.
- `src/lib/events.test.ts` — unit tests for the schema + status helper.
- `src/components/admin/EventWizard.tsx` — the 5-step wizard (add/edit), incl. a local `RepeatableRows` helper for schedule/prize rows.

**Modify:**
- `prisma/schema.prisma` — add columns to `SportEvent`.
- `src/app/api/admin/events/route.ts` — persist new fields + `published` in POST/PUT.
- `src/app/api/events/route.ts` — public list: filter `published`, derive status.
- `src/app/api/events/[id]/route.ts` — detail: draft guard + admin preview, derive status.
- `src/hooks/useData.ts` — expand the `SportEvent` client type.
- `src/app/admin/events/page.tsx` — swap inline form for `<EventWizard>`.
- `src/app/events/[id]/page.tsx` — render new fields in the tabs with fallbacks.

---

## Task 1: Schema migration — add authoring columns to `SportEvent`

**Files:**
- Modify: `prisma/schema.prisma` (the `SportEvent` model, lines ~302–333)

- [ ] **Step 1: Add the new columns.** In `prisma/schema.prisma`, inside `model SportEvent`, add these lines just before `schedule  Json  @default("[]")` (keep existing fields untouched):

```prisma
  // ── Slice 1: authoring + content model (all optional, additive) ──
  published         Boolean  @default(true)
  thumbnailUrl      String   @default("")
  aboutLong         String   @default("")
  whatYouGet        String[] @default([])
  venueInfo         String   @default("")
  matchFormat       String   @default("")
  teamSize          String   @default("")
  numRounds         String   @default("")
  structure         String   @default("")
  eligibility       String   @default("")
  rules             String[] @default([])
  additionalRewards String[] @default([])
  city              String   @default("")
  state             String   @default("")
  country           String   @default("India")
  pincode           String   @default("")
  mapsLink          String   @default("")
  lat               Float?
  lng               Float?
  approvalMode      String   @default("auto")
  currency          String   @default("INR")
  gstPercent        Int      @default(0)
  convenienceFeePct Int      @default(0)
```

- [ ] **Step 2: Create + apply the migration.**

Run: `npm run db:migrate -- --name add_event_authoring_fields`
Expected: a new folder under `prisma/migrations/…_add_event_authoring_fields/` and "Your database is now in sync with your schema."

- [ ] **Step 3: Verify the client regenerated and schema is clean.**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!"

- [ ] **Step 4: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(events): add authoring/content columns to SportEvent"
```

---

## Task 2: `src/lib/events.ts` — types, zod schema, status helper (TDD)

**Files:**
- Create: `src/lib/events.ts`
- Test: `src/lib/events.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `src/lib/events.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveEventStatus, eventInputSchema } from "./events";

const base = {
  published: true,
  status: "Registration Open",
  startDate: new Date("2026-07-10T10:00:00Z"),
  endDate: new Date("2026-07-12T18:00:00Z"),
  registrationDeadline: new Date("2026-07-08T23:59:00Z"),
};

describe("deriveEventStatus", () => {
  it("returns Draft for unpublished events", () => {
    expect(deriveEventStatus({ ...base, published: false }, new Date("2026-07-01"))).toBe("Draft");
  });
  it("returns Cancelled when status is Cancelled, even after end", () => {
    expect(deriveEventStatus({ ...base, status: "Cancelled" }, new Date("2026-08-01"))).toBe("Cancelled");
  });
  it("returns Live when now is between start and end", () => {
    expect(deriveEventStatus(base, new Date("2026-07-11T10:00:00Z"))).toBe("Live");
  });
  it("returns Completed after endDate (checked before Registration Closed)", () => {
    expect(deriveEventStatus(base, new Date("2026-07-20T00:00:00Z"))).toBe("Completed");
  });
  it("returns Registration Closed after deadline but before start", () => {
    expect(deriveEventStatus(base, new Date("2026-07-09T00:00:00Z"))).toBe("Registration Closed");
  });
  it("falls back to stored status before the deadline", () => {
    expect(deriveEventStatus(base, new Date("2026-07-01T00:00:00Z"))).toBe("Registration Open");
    expect(deriveEventStatus({ ...base, status: "Full" }, new Date("2026-07-01T00:00:00Z"))).toBe("Full");
  });
});

describe("eventInputSchema", () => {
  const valid = {
    title: "Summer Cup",
    sport: "Football",
    type: "Tournament",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    registrationDeadline: "2026-07-08",
    maxParticipants: 64,
    entryFeeAmount: 0,
  };
  it("accepts a minimal valid payload", () => {
    expect(eventInputSchema.parse(valid).title).toBe("Summer Cup");
  });
  it("applies defaults for omitted optional fields", () => {
    const p = eventInputSchema.parse(valid);
    expect(p.approvalMode).toBe("auto");
    expect(p.currency).toBe("INR");
    expect(p.published).toBe(false);
    expect(p.whatYouGet).toEqual([]);
  });
  it("rejects a missing title", () => {
    expect(() => eventInputSchema.parse({ ...valid, title: "" })).toThrow();
  });
  it("rejects a negative entry fee", () => {
    expect(() => eventInputSchema.parse({ ...valid, entryFeeAmount: -5 })).toThrow();
  });
  it("rejects endDate before startDate", () => {
    expect(() => eventInputSchema.parse({ ...valid, endDate: "2026-07-01" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npx vitest run src/lib/events.test.ts`
Expected: FAIL — "Cannot find module './events'" / exports undefined.

- [ ] **Step 3: Implement `src/lib/events.ts`.**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `npx vitest run src/lib/events.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/events.ts src/lib/events.test.ts
git commit -m "feat(events): event input schema + read-time status helper"
```

---

## Task 3: Admin API — persist new fields + published (POST/PUT)

**Files:**
- Modify: `src/app/api/admin/events/route.ts`

This route currently uses bare `body.x` assignment. Replace the POST/PUT bodies to validate with `eventInputSchema` and map all fields. The GET handler (registrations table) stays unchanged.

- [ ] **Step 1: Add imports.** At the top of `src/app/api/admin/events/route.ts`, add:

```ts
import { eventInputSchema } from "@/lib/events";
import { Prisma } from "@prisma/client";
```

- [ ] **Step 2: Replace the `POST` handler** with:

```ts
export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = eventInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  const d = parsed.data;
  const event = await prisma.sportEvent.create({
    data: {
      ...toEventData(d),
      imageUrl: d.imageUrl || "/placeholder-event.jpg",
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}
```

- [ ] **Step 3: Replace the `PUT` handler** with:

```ts
export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  const event = await prisma.sportEvent.update({ where: { id: body.id }, data: toEventData(parsed.data) });
  return NextResponse.json({ event });
}
```

- [ ] **Step 4: Add the `toEventData` mapper** (place above the handlers, after imports):

```ts
function toEventData(d: import("@/lib/events").EventInput): Prisma.SportEventUncheckedCreateInput {
  return {
    title: d.title, sport: d.sport, type: d.type, date: d.date,
    startDate: new Date(d.startDate), endDate: new Date(d.endDate),
    registrationDeadline: new Date(d.registrationDeadline),
    location: d.location, address: d.address,
    city: d.city, state: d.state, country: d.country, pincode: d.pincode,
    mapsLink: d.mapsLink, lat: d.lat ?? null, lng: d.lng ?? null,
    maxParticipants: d.maxParticipants,
    entryFee: d.entryFee, entryFeeAmount: d.entryFeeAmount,
    currency: d.currency, gstPercent: d.gstPercent, convenienceFeePct: d.convenienceFeePct,
    approvalMode: d.approvalMode,
    prizePool: d.prizePool, prizes: d.prizes, additionalRewards: d.additionalRewards,
    difficulty: d.difficulty, featured: d.featured, published: d.published,
    imageUrl: d.imageUrl, thumbnailUrl: d.thumbnailUrl,
    description: d.description, aboutLong: d.aboutLong,
    requirements: d.requirements, whatYouGet: d.whatYouGet, venueInfo: d.venueInfo,
    matchFormat: d.matchFormat, teamSize: d.teamSize, numRounds: d.numRounds,
    structure: d.structure, eligibility: d.eligibility, rules: d.rules, format: d.format,
    schedule: d.schedule, organizer: d.organizer, organizerContact: d.organizerContact, tags: d.tags,
    // `status` is intentionally NOT set here — Save-Draft/Publish only toggles
    // `published`; the lifecycle status keeps its existing value (default
    // "Registration Open" on create). Cancel/Full transitions live in later slices.
  };
}
```

Note: `status` keeps its schema default of `"Registration Open"` on create. Do not add `status` to the mapper.

- [ ] **Step 5: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors in `src/app/api/admin/events/route.ts` or `src/lib/events.ts`.

- [ ] **Step 6: Commit.**

```bash
git add src/app/api/admin/events/route.ts
git commit -m "feat(events): admin create/edit persists new content fields + draft flag"
```

---

## Task 4: Public read paths — draft guard + status derivation

**Files:**
- Modify: `src/app/api/events/route.ts`
- Modify: `src/app/api/events/[id]/route.ts`

- [ ] **Step 1: List route — filter drafts + derive status.** In `src/app/api/events/route.ts`:
  - Add import: `import { deriveEventStatus } from "@/lib/events";`
  - Change the `where` initializer (line ~16) to include `published: true`:

```ts
    const where: Prisma.SportEventWhereInput = { published: true, status: { notIn: ["Completed", "Archived", "Cancelled"] } };
```

  - Replace the `events.map(...)` "Live" derivation block (lines ~30-33) with:

```ts
    events = events.map(ev => ({ ...ev, status: deriveEventStatus(ev, now) }));
```

  - Keep the existing sort; it already prioritises `status === "Live"`.

- [ ] **Step 2: Detail route — draft guard + admin preview + derive status.** In `src/app/api/events/[id]/route.ts`:
  - Add imports:

```ts
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { deriveEventStatus } from "@/lib/events";
```

  - Replace the body of `GET` (lines ~13-31) with:

```ts
    const { id } = await params;
    const event = await prisma.sportEvent.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!event) return fail("Event not found", 404);

    const isAdmin = await getAdminSessionFromRequest(req);
    if (!event.published && !isAdmin) return fail("Event not found", 404);

    const now = new Date();
    const status = deriveEventStatus(event, now);

    let userRegistration: { id: string; paymentStatus: string; teamName: string | null } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = event.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = { id: reg.id, paymentStatus: reg.paymentStatus, teamName: reg.teamName };
    }

    return ok({ ...event, status, registeredCount: event.registrations.length, userRegistration });
```

  - **Leave POST (register) and DELETE (cancel) unchanged.** Note: POST already blocks registration on closed/cancelled statuses; a draft has `published:false` but its stored `status` is still "Registration Open", so as a follow-up safety net add this guard at the top of POST after loading `event` — change the `select` to include `published` and add: `if (!event.published) return fail("Registrations are closed for this event", 409);` (place alongside the existing status check on line ~43).

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit.**

```bash
git add src/app/api/events/route.ts "src/app/api/events/[id]/route.ts"
git commit -m "feat(events): hide drafts from public reads, derive status centrally"
```

---

## Task 5: Expand the client `SportEvent` type

**Files:**
- Modify: `src/hooks/useData.ts` (the `SportEvent` type, lines ~363-377)

- [ ] **Step 1: Replace the `SportEvent` type** with the expanded shape (new fields optional so existing consumers compile):

```ts
export type ScheduleItem = { title: string; date: string; time: string; location: string };
export type LegacyScheduleItem = { day: string; time: string; event: string };

export type SportEvent = {
  id: string; title: string; sport: string;
  type: string; date: string; startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string; distance: string;
  participants: number; maxParticipants: number;
  prizePool: string; entryFee: string; entryFeeAmount: number;
  difficulty: string; imageUrl: string; featured: boolean; status: string;
  description: string; format: string[]; prizes: string[]; requirements: string[];
  schedule: (ScheduleItem | LegacyScheduleItem)[];
  organizer: string; organizerContact: string; tags: string[];
  // Slice 1 additions (optional — older rows may omit when narrowed)
  published?: boolean; thumbnailUrl?: string;
  aboutLong?: string; whatYouGet?: string[]; venueInfo?: string;
  matchFormat?: string; teamSize?: string; numRounds?: string; structure?: string; eligibility?: string; rules?: string[];
  additionalRewards?: string[];
  city?: string; state?: string; country?: string; pincode?: string; mapsLink?: string;
  lat?: number | null; lng?: number | null;
  approvalMode?: string; currency?: string; gstPercent?: number; convenienceFeePct?: number;
  registrations?: { id: string; teamName?: string }[];
  registeredCount?: number;
  userRegistration?: { id: string; paymentStatus: string; teamName?: string | null } | null;
};
```

- [ ] **Step 2: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no new errors (detail page still compiles against old fields).

- [ ] **Step 3: Commit.**

```bash
git add src/hooks/useData.ts
git commit -m "feat(events): expand client SportEvent type with authoring fields"
```

---

## Task 6: `EventWizard` component (5-step add/edit)

**Files:**
- Create: `src/components/admin/EventWizard.tsx`

This is the largest task. The wizard owns one `Partial<EventForm>` state, a `step` index (0–4), per-step validation, and emits a final payload via `onSubmit(form, published)`. It reuses `FormInput`, `FormSelect`, `FormRow`, `FormTextarea`, `ImageUpload`, `VenueLocationPicker`. The parent (`/admin/events`) renders it inside the existing `AdminModal`.

**Form shape** (matches `eventInputSchema` input; arrays edited as text where simple, structured rows for schedule):

```ts
export type EventForm = {
  id?: string;
  title: string; sport: string; type: string; difficulty: string; date: string;
  startDate: string; endDate: string; registrationDeadline: string;
  maxParticipants: number; paid: boolean;
  entryFee: string; entryFeeAmount: number; currency: string; gstPercent: number; convenienceFeePct: number;
  approvalMode: "auto" | "manual";
  imageUrl: string; thumbnailUrl: string; featured: boolean;
  description: string; aboutLong: string; requirements: string[]; whatYouGet: string[]; venueInfo: string;
  matchFormat: string; teamSize: string; numRounds: string; structure: string; eligibility: string; rules: string[]; format: string[];
  prizePool: string; prizes: string[]; additionalRewards: string[];
  schedule: { title: string; date: string; time: string; location: string }[];
  location: string; address: string; city: string; state: string; country: string; pincode: string; mapsLink: string;
  lat: number | null; lng: number | null;
  organizer: string; organizerContact: string; tags: string[];
};
```

- [ ] **Step 1: Scaffold the component, constants, and `EMPTY`.** Create `src/components/admin/EventWizard.tsx`:

```tsx
"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { FormInput, FormTextarea, FormSelect, FormRow } from "./AdminModal";
import { ImageUpload } from "./ImageUpload";
import { VenueLocationPicker } from "./VenueLocationPicker";
import { EVENT_TYPES, EVENT_DIFFICULTIES } from "@/lib/taxonomy";

const SPORTS = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Swimming", "Table Tennis", "Volleyball", "Athletics", "E-Sports"];
const STRUCTURES = ["Knockout", "League", "Hybrid", "Round Robin"];
const STEPS = ["Basics", "Registration", "Details", "Location", "Review"] as const;

export type EventForm = {
  id?: string;
  title: string; sport: string; type: string; difficulty: string; date: string;
  startDate: string; endDate: string; registrationDeadline: string;
  maxParticipants: number; paid: boolean;
  entryFee: string; entryFeeAmount: number; currency: string; gstPercent: number; convenienceFeePct: number;
  approvalMode: "auto" | "manual";
  imageUrl: string; thumbnailUrl: string; featured: boolean;
  description: string; aboutLong: string; requirements: string[]; whatYouGet: string[]; venueInfo: string;
  matchFormat: string; teamSize: string; numRounds: string; structure: string; eligibility: string; rules: string[]; format: string[];
  prizePool: string; prizes: string[]; additionalRewards: string[];
  schedule: { title: string; date: string; time: string; location: string }[];
  location: string; address: string; city: string; state: string; country: string; pincode: string; mapsLink: string;
  lat: number | null; lng: number | null;
  organizer: string; organizerContact: string; tags: string[];
};

export const EMPTY_EVENT: EventForm = {
  title: "", sport: "Football", type: "Tournament", difficulty: "All Levels", date: "",
  startDate: "", endDate: "", registrationDeadline: "",
  maxParticipants: 100, paid: false,
  entryFee: "Free", entryFeeAmount: 0, currency: "INR", gstPercent: 0, convenienceFeePct: 0,
  approvalMode: "auto",
  imageUrl: "", thumbnailUrl: "", featured: false,
  description: "", aboutLong: "", requirements: [], whatYouGet: [], venueInfo: "",
  matchFormat: "", teamSize: "", numRounds: "", structure: "", eligibility: "", rules: [], format: [],
  prizePool: "", prizes: [], additionalRewards: [],
  schedule: [],
  location: "", address: "", city: "", state: "", country: "India", pincode: "", mapsLink: "",
  lat: null, lng: null,
  organizer: "", organizerContact: "", tags: [],
};

// one-per-line <-> string[]
const linesToArr = (s: string) => s.split("\n").map(x => x.trim()).filter(Boolean);
const arrToLines = (a: string[]) => a.join("\n");
```

- [ ] **Step 2: Add per-step validation** (returns an error string or null):

```tsx
function validateStep(step: number, f: EventForm): string | null {
  if (step === 0) {
    if (f.title.trim().length < 1) return "Event name is required";
    if (!f.sport) return "Pick a sport";
  }
  if (step === 1) {
    if (!f.startDate || !f.endDate || !f.registrationDeadline) return "Start, end and deadline dates are required";
    if (new Date(f.endDate) < new Date(f.startDate)) return "End date must be on or after the start date";
    if (f.maxParticipants < 1) return "Capacity must be at least 1";
    if (f.paid && f.entryFeeAmount <= 0) return "Paid events need an entry fee greater than 0";
  }
  return null; // steps 2-4 are optional content
}
```

- [ ] **Step 3: Add the `RepeatableRows` helper** for the schedule editor (local component in the same file):

```tsx
function ScheduleEditor({ rows, onChange }: { rows: EventForm["schedule"]; onChange: (r: EventForm["schedule"]) => void }) {
  const set = (i: number, key: keyof EventForm["schedule"][number], v: string) =>
    onChange(rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  const add = () => onChange([...rows, { title: "", date: "", time: "", location: "" }]);
  const del = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Entry {i + 1}</span>
            <button type="button" onClick={() => del(i)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color="#f87171" /></button>
          </div>
          <FormInput label="Title" value={r.title} onChange={v => set(i, "title", v)} placeholder="e.g. Opening Ceremony" />
          <FormRow>
            <FormInput label="Date" value={r.date} onChange={v => set(i, "date", v)} type="date" />
            <FormInput label="Time" value={r.time} onChange={v => set(i, "time", v)} placeholder="e.g. 9:00 AM" />
          </FormRow>
          <FormInput label="Location" value={r.location} onChange={v => set(i, "location", v)} placeholder="e.g. Main Arena" />
        </div>
      ))}
      <button type="button" onClick={add} style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: "8px 14px", borderRadius: 8, background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", color: "#ff6b74", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={13} /> Add schedule entry
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Build the main component** with stepper, per-step panels, and footer nav. The exported signature:

```tsx
export function EventWizard({
  initial, mode, saving, error, onCancel, onSubmit,
}: {
  initial: EventForm;
  mode: "add" | "edit";
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (form: EventForm, published: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventForm>(initial);
  const [stepError, setStepError] = useState<string | null>(null);
  const u = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const next = () => { const e = validateStep(step, form); if (e) { setStepError(e); return; } setStepError(null); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => { setStepError(null); setStep(s => Math.max(s - 1, 0)); };
  const submit = (published: boolean) => {
    for (let s = 0; s <= 1; s++) { const e = validateStep(s, form); if (e) { setStep(s); setStepError(e); return; } }
    onSubmit(form, published);
  };

  return (
    <div>
      {/* Stepper header */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 4, borderRadius: 100, background: i <= step ? "#e63946" : "rgba(255,255,255,0.1)", marginBottom: 6 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: i === step ? "#fff" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Panels — see Step 5 for each step's fields */}
      <div style={{ minHeight: 280 }}>
        {step === 0 && (/* Basics panel */ null)}
        {step === 1 && (/* Registration panel */ null)}
        {step === 2 && (/* Details panel */ null)}
        {step === 3 && (/* Location panel */ null)}
        {step === 4 && (/* Review panel */ null)}
      </div>

      {(stepError || error) && <p style={{ fontSize: 13, color: "#f87171", marginTop: 12 }}>{stepError ?? error}</p>}

      {/* Footer nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 10 }}>
        <button type="button" onClick={step === 0 ? onCancel : back} style={navBtn}>
          <ChevronLeft size={15} /> {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} style={{ ...navBtn, background: "#e63946", color: "#fff", border: "none" }}>Next <ChevronRight size={15} /></button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" disabled={saving} onClick={() => submit(false)} style={navBtn}>Save Draft</button>
            <button type="button" disabled={saving} onClick={() => submit(true)} style={{ ...navBtn, background: "#e63946", color: "#fff", border: "none" }}>{saving ? "Publishing…" : "Publish"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: "transparent", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.12)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
```

- [ ] **Step 5: Fill in the five panels** (replace the `null` placeholders from Step 4). Use these exact field mappings:

**Step 0 — Basics:**
```tsx
<>
  <FormInput label="Event Name" value={form.title} onChange={v => u("title", v)} required />
  <FormRow>
    <FormSelect label="Sport" value={form.sport} onChange={v => u("sport", v)} options={SPORTS.map(s => ({ value: s, label: s }))} />
    <FormSelect label="Type" value={form.type} onChange={v => u("type", v)} options={EVENT_TYPES.map(t => ({ value: t, label: t }))} />
  </FormRow>
  <FormSelect label="Difficulty" value={form.difficulty} onChange={v => u("difficulty", v)} options={EVENT_DIFFICULTIES.map(d => ({ value: d, label: d }))} />
  <FormTextarea label="Short Description" value={form.description} onChange={v => u("description", v)} rows={2} placeholder="One line shown on cards" />
  <FormTextarea label="Long Description / About" value={form.aboutLong} onChange={v => u("aboutLong", v)} rows={4} />
  <label style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Event Banner</label>
  <ImageUpload value={form.imageUrl} onChange={v => u("imageUrl", v)} />
  <label style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Thumbnail (optional)</label>
  <ImageUpload value={form.thumbnailUrl} onChange={v => u("thumbnailUrl", v)} />
</>
```

**Step 1 — Registration:**
```tsx
<>
  <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
    {[{ v: false, l: "Free Registration" }, { v: true, l: "Paid Registration" }].map(opt => (
      <button key={opt.l} type="button" onClick={() => u("paid", opt.v)}
        style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
          background: form.paid === opt.v ? "rgba(230,57,70,0.15)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${form.paid === opt.v ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.08)"}`,
          color: form.paid === opt.v ? "#ff6b74" : "#9ca3af" }}>{opt.l}</button>
    ))}
  </div>
  {form.paid && (
    <>
      <FormRow>
        <FormInput label="Entry Fee (display)" value={form.entryFee} onChange={v => u("entryFee", v)} placeholder="e.g. ₹500/team" />
        <FormInput label="Entry Fee Amount (₹)" value={form.entryFeeAmount} onChange={v => u("entryFeeAmount", Number(v) as never)} type="number" />
      </FormRow>
      <FormRow>
        <FormInput label="GST %" value={form.gstPercent} onChange={v => u("gstPercent", Number(v) as never)} type="number" />
        <FormInput label="Convenience Fee %" value={form.convenienceFeePct} onChange={v => u("convenienceFeePct", Number(v) as never)} type="number" />
      </FormRow>
      <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>GST & convenience fee are stored now; they are charged once the payment slice wires them in. Razorpay currently charges the base amount.</p>
    </>
  )}
  <FormRow>
    <FormInput label="Maximum Participants" value={form.maxParticipants} onChange={v => u("maxParticipants", Number(v) as never)} type="number" />
    <FormInput label="Registration Deadline" value={form.registrationDeadline} onChange={v => u("registrationDeadline", v)} type="date" required />
  </FormRow>
  <FormRow>
    <FormInput label="Start Date" value={form.startDate} onChange={v => u("startDate", v)} type="date" required />
    <FormInput label="End Date" value={form.endDate} onChange={v => u("endDate", v)} type="date" required />
  </FormRow>
  <FormInput label="Date (display text)" value={form.date} onChange={v => u("date", v)} placeholder="e.g. July 10–12, 2026" />
  <FormSelect label="Approval Mode" value={form.approvalMode} onChange={v => u("approvalMode", v as "auto" | "manual")} options={[{ value: "auto", label: "Auto Approve" }, { value: "manual", label: "Manual Approval" }]} />
</>
```

**Step 2 — Details** (Overview + Format + Prizes + Schedule):
```tsx
<>
  <FormTextarea label="Requirements (one per line)" value={arrToLines(form.requirements)} onChange={v => u("requirements", linesToArr(v))} rows={3} placeholder={"Valid ID\nSports attire"} />
  <FormTextarea label="What Participants Get (one per line)" value={arrToLines(form.whatYouGet)} onChange={v => u("whatYouGet", linesToArr(v))} rows={3} placeholder={"Certificate\nT-shirt\nRefreshments"} />
  <FormTextarea label="Venue Information" value={form.venueInfo} onChange={v => u("venueInfo", v)} rows={3} />
  <FormRow>
    <FormInput label="Match Format" value={form.matchFormat} onChange={v => u("matchFormat", v)} placeholder="e.g. Best of 3 sets" />
    <FormInput label="Team Size" value={form.teamSize} onChange={v => u("teamSize", v)} placeholder="e.g. 5v5" />
  </FormRow>
  <FormRow>
    <FormInput label="Number of Rounds" value={form.numRounds} onChange={v => u("numRounds", v)} placeholder="e.g. 4" />
    <FormSelect label="Structure" value={form.structure} onChange={v => u("structure", v)} options={[{ value: "", label: "—" }, ...STRUCTURES.map(s => ({ value: s, label: s }))]} />
  </FormRow>
  <FormTextarea label="Eligibility" value={form.eligibility} onChange={v => u("eligibility", v)} rows={2} />
  <FormTextarea label="Rules (one per line)" value={arrToLines(form.rules)} onChange={v => u("rules", linesToArr(v))} rows={3} />
  <FormInput label="Prize Pool (display)" value={form.prizePool} onChange={v => u("prizePool", v)} placeholder="e.g. ₹50,000" />
  <FormTextarea label="Prizes (one per line)" value={arrToLines(form.prizes)} onChange={v => u("prizes", linesToArr(v))} rows={3} placeholder={"🥇 Winner – ₹25,000\n🥈 Runner Up – ₹10,000"} />
  <FormTextarea label="Additional Rewards (one per line)" value={arrToLines(form.additionalRewards)} onChange={v => u("additionalRewards", linesToArr(v))} rows={2} placeholder={"Certificates\nMerchandise"} />
  <label style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Schedule</label>
  <ScheduleEditor rows={form.schedule} onChange={r => u("schedule", r)} />
</>
```

**Step 3 — Location:**
```tsx
<>
  <FormInput label="Venue Name" value={form.location} onChange={v => u("location", v)} />
  <VenueLocationPicker
    address={form.address} lat={form.lat} lng={form.lng}
    onChange={(n) => setForm(f => ({
      ...f,
      ...(n.address !== undefined ? { address: n.address } : {}),
      ...(n.lat !== undefined ? { lat: n.lat ?? null } : {}),
      ...(n.lng !== undefined ? { lng: n.lng ?? null } : {}),
    }))}
  />
  <FormRow>
    <FormInput label="City" value={form.city} onChange={v => u("city", v)} />
    <FormInput label="State" value={form.state} onChange={v => u("state", v)} />
  </FormRow>
  <FormRow>
    <FormInput label="Country" value={form.country} onChange={v => u("country", v)} />
    <FormInput label="Pincode" value={form.pincode} onChange={v => u("pincode", v)} />
  </FormRow>
  <FormInput label="Google Maps Link" value={form.mapsLink} onChange={v => u("mapsLink", v)} placeholder="https://maps.google.com/…" />
  <FormRow>
    <FormInput label="Organizer" value={form.organizer} onChange={v => u("organizer", v)} />
    <FormInput label="Organizer Contact" value={form.organizerContact} onChange={v => u("organizerContact", v)} />
  </FormRow>
</>
```

> `VenueLocationPicker`'s real props are `address: string`, `lat: number | null`, `lng: number | null`, and `onChange: (next: { address?; lat?; lng? }) => void` — verified against `src/components/admin/VenueLocationPicker.tsx` and the existing `/admin/venues` usage. The call above matches.

**Step 4 — Review:**
```tsx
<div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#d1d5db" }}>
  {[
    ["Name", form.title], ["Sport / Type", `${form.sport} · ${form.type}`],
    ["When", `${form.startDate} → ${form.endDate}`], ["Deadline", form.registrationDeadline],
    ["Capacity", String(form.maxParticipants)], ["Entry", form.paid ? `${form.entryFee} (₹${form.entryFeeAmount})` : "Free"],
    ["Approval", form.approvalMode], ["Venue", `${form.location}, ${form.city}`],
    ["Schedule entries", String(form.schedule.length)], ["Prizes", String(form.prizes.length)],
  ].map(([k, v]) => (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
      <span style={{ color: "#6b7280" }}>{k}</span><span style={{ fontWeight: 600, color: "#fff" }}>{v || "—"}</span>
    </div>
  ))}
  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>Save as Draft to keep editing privately, or Publish to make it visible to users.</p>
</div>
```

- [ ] **Step 6: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors in `EventWizard.tsx` (fix the `VenueLocationPicker` call if its props differ).

- [ ] **Step 7: Commit.**

```bash
git add src/components/admin/EventWizard.tsx
git commit -m "feat(events): 5-step admin event authoring wizard component"
```

---

## Task 7: Wire the wizard into `/admin/events`

**Files:**
- Modify: `src/app/admin/events/page.tsx`

Replace the inline `<form>` inside the add/edit `AdminModal` with `<EventWizard>`, and convert between `EventForm` and the API payload.

- [ ] **Step 1: Update imports + types.** At the top of `src/app/admin/events/page.tsx`:
  - Add: `import { EventWizard, EMPTY_EVENT, type EventForm } from "@/components/admin/EventWizard";`
  - Remove the now-unused `FormInput, FormTextarea, FormSelect, FormRow, FormActions` from the `AdminModal` import (keep `AdminModal`, `DeleteConfirm`), and remove the `ImageUpload`, `EVENT_TYPES/…` imports that only the old form used (keep whatever the cards still use). Keep `Ev` type for the table/cards.

- [ ] **Step 2: Add form/payload converters** (above the component):

```tsx
function toForm(e: Ev): EventForm {
  return {
    ...EMPTY_EVENT, ...e,
    paid: (e.entryFeeAmount ?? 0) > 0,
    startDate: toDateInput(e.startDate), endDate: toDateInput(e.endDate), registrationDeadline: toDateInput(e.registrationDeadline),
    approvalMode: (e as Ev & { approvalMode?: string }).approvalMode === "manual" ? "manual" : "auto",
    schedule: Array.isArray((e as Ev & { schedule?: unknown }).schedule) ? (e as Ev & { schedule: EventForm["schedule"] }).schedule : [],
    lat: (e as Ev & { lat?: number | null }).lat ?? null, lng: (e as Ev & { lng?: number | null }).lng ?? null,
  } as EventForm;
}

function toPayload(form: EventForm, published: boolean, id?: string) {
  return {
    ...form, id,
    entryFee: form.paid ? form.entryFee : "Free",
    entryFeeAmount: form.paid ? Number(form.entryFeeAmount) : 0,
    published,
  };
}
```

Note: `Ev` (the page's existing type) must be widened to include the new optional fields (`approvalMode`, `schedule`, `lat`, `lng`, etc.) — simplest is to import `SportEvent` from `@/hooks/useData` and set `type Ev = SportEvent`. Do that and delete the local `Ev` definition.

- [ ] **Step 3: Replace the add/edit `AdminModal` body.** Find the `<AdminModal open={modal === "add" || modal === "edit"} …>` block and replace its `<form>…</form>` children with:

```tsx
<EventWizard
  mode={modal === "add" ? "add" : "edit"}
  initial={modal === "edit" ? toForm(form as Ev) : EMPTY_EVENT}
  saving={save.isPending}
  error={error}
  onCancel={closeModal}
  onSubmit={(f, published) => save.mutate(toPayload(f, published, (form as Ev).id))}
/>
```

  - Change the add/edit modal `width` from `620` to `720`.
  - The page's `form` state now holds an `Ev` for edit (set in `openEdit`) — keep `openEdit` setting `setForm(e)` (raw event) and `openAdd` setting `setForm(EMPTY as Ev)`; the wizard does its own internal form state from `initial`, so the page-level `form` is only used to pass the edit target + id. Simplify `save.mutate` to take the already-built payload (the wizard calls `onSubmit`).

- [ ] **Step 4: Adjust the `save` mutation** so it sends the payload as-is (it already POSTs/PUTs by presence of `id`). Confirm `mutationFn` still keys off `d.id` to pick PUT vs POST — `toPayload` includes `id` only for edits, so this works unchanged.

- [ ] **Step 5: Typecheck + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors; no unused-import warnings (remove any leftover unused imports).

- [ ] **Step 6: Commit.**

```bash
git add src/app/admin/events/page.tsx
git commit -m "feat(events): replace inline event form with 5-step wizard"
```

---

## Task 8: Render new fields on the detail page

**Files:**
- Modify: `src/app/events/[id]/page.tsx`

Enrich the Overview / Format / Prizes / Schedule tabs. Every new block renders **only when its data is present**, so old events don't show empty sections.

- [ ] **Step 1: Add a schedule normaliser** near the top of the component (after `const spotsLeft …`), to bridge old/new shapes:

```tsx
type SchedRow = { title: string; date: string; time: string; location: string };
const scheduleRows: SchedRow[] = (event.schedule ?? []).map((s: Record<string, string>) =>
  "title" in s
    ? { title: s.title, date: s.date ?? "", time: s.time ?? "", location: s.location ?? "" }
    : { title: s.event ?? "", date: s.day ?? "", time: s.time ?? "", location: "" }
);
const hasFormatSpecs = !!(event.matchFormat || event.teamSize || event.numRounds || event.structure || event.eligibility);
```

- [ ] **Step 2: Enrich the Overview tab.** Inside the `{tab === "overview" && (…)}` block, after the existing "About"/`description` card, render `aboutLong` (if present and different from description), then add cards for `whatYouGet` and `venueInfo` guarded by presence. Pattern for a guarded bullet card (reuse the existing card styling):

```tsx
{!!event.whatYouGet?.length && (
  <Reveal>
    <div style={cardStyle}>
      <h3 className="eyebrow" style={{ marginBottom: 16 }}>What you get</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {event.whatYouGet.map((x, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e63946", flexShrink: 0, marginTop: 7 }} />
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{x}</span>
          </div>
        ))}
      </div>
    </div>
  </Reveal>
)}
{!!event.venueInfo && (
  <Reveal><div style={cardStyle}>
    <h3 className="eyebrow" style={{ marginBottom: 12 }}>Venue information</h3>
    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>{event.venueInfo}</p>
  </div></Reveal>
)}
```

  Define `cardStyle` once near the top of the render (extract the repeated inline object: `const cardStyle: React.CSSProperties = { background: "rgba(13,13,13,0.7)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px 28px" };`).

- [ ] **Step 3: Enrich the Format tab.** Inside `{tab === "format" && (…)}`, render a structured spec grid when `hasFormatSpecs`, then `rules`, then keep the legacy `format[]` list below:

```tsx
{hasFormatSpecs && (
  <div style={cardStyle}>
    {([["Match format", event.matchFormat], ["Team size", event.teamSize], ["Rounds", event.numRounds], ["Structure", event.structure], ["Eligibility", event.eligibility]] as const)
      .filter(([, v]) => !!v)
      .map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{k}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", textAlign: "right" }}>{v}</span>
        </div>
      ))}
  </div>
)}
{!!event.rules?.length && (
  <div style={cardStyle}>
    <h3 className="eyebrow" style={{ marginBottom: 12 }}>Rules</h3>
    {event.rules.map((r, i) => (
      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <span style={{ color: "#ff6b74", fontWeight: 800, fontSize: 13 }}>{i + 1}.</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{r}</span>
      </div>
    ))}
  </div>
)}
{/* keep existing event.format.map(...) list as-is, below */}
```

  Update the Format tab count badge to `event.format.length + (event.rules?.length ?? 0)`. If both `format` and the new specs are empty, show an empty-state line: `No format details yet.`

- [ ] **Step 4: Enrich the Prizes tab.** After the existing `event.prizes.map(...)` cards, render `additionalRewards` as a secondary card list when present:

```tsx
{!!event.additionalRewards?.length && (
  <div style={cardStyle}>
    <h3 className="eyebrow" style={{ marginBottom: 12 }}>Additional rewards</h3>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {event.additionalRewards.map((x, i) => (
        <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 100, background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }}>{x}</span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Update the Schedule tab** to use `scheduleRows` instead of `event.schedule`, rendering `title` (bold), `date`+`time` (meta row), and `location` (if present). Replace the field reads inside the existing `event.schedule.map(...)` with `scheduleRows.map((item) => …)` using `item.title`, `item.date`, `item.time`, `item.location`. Update the Schedule tab count to `scheduleRows.length`. Add an empty state when `scheduleRows.length === 0`: `Schedule to be announced.`

- [ ] **Step 6: Typecheck + build.**

Run: `npx tsc --noEmit && npm run build`
Expected: compiles; build succeeds.

- [ ] **Step 7: Commit.**

```bash
git add "src/app/events/[id]/page.tsx"
git commit -m "feat(events): render enriched content on event detail page"
```

---

## Task 9: Full verification

- [ ] **Step 1: Run the unit tests.**

Run: `npm test`
Expected: all pass, including the new `src/lib/events.test.ts`.

- [ ] **Step 2: Lint + typecheck + build.**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 3: Manual smoke test (dev server).** Run `npm run dev`, then as an admin:
  1. `/admin/events` → "Add Event" → walk all 5 steps → **Save Draft**. Confirm the draft appears in the admin cards but **not** in `/events` (logged out / as a normal user).
  2. Open the draft's detail URL directly while logged out → expect 404/"Event not found"; as admin the preview loads.
  3. Edit the draft → **Publish** → confirm it now shows on `/events` and the detail page renders Overview/Format/Prizes/Schedule with the authored content, and empty sections are absent on a sparsely-filled event.
  4. Confirm an **existing** (pre-migration) event still loads on `/events` and its detail page (back-compat: legacy schedule + empty new fields render without breakage).

- [ ] **Step 4: Final commit (if any smoke-test fixes were needed).**

```bash
git add -A && git commit -m "fix(events): smoke-test adjustments for authoring slice"
```

---

## Notes for the implementer

- **DRY:** `cardStyle` on the detail page and `navBtn` in the wizard are extracted to kill repetition. Don't re-inline them.
- **YAGNI:** GST/convenience/currency are stored and displayed only — do **not** wire them into Razorpay here (that's a later slice). Approval mode is stored only; do **not** add approve/reject UI here.
- **Don't touch:** the register/cancel POST/DELETE logic (beyond the one draft-guard line in Task 4 Step 2), the Razorpay routes, or the admin registrations table.
- **Status:** never store derived statuses (Live/Completed/Registration Closed/Draft) — they're computed by `deriveEventStatus` on read.
