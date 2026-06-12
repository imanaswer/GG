# Event System Slice 1 — Admin Authoring + Content Model

**Date:** 2026-06-12
**Status:** Approved (design)
**Slice:** 1 of an incremental event-system rebuild

## Context

The event system is **not greenfield**. The codebase already has a substantial,
working implementation that must be preserved:

- **Schema:** `SportEvent`, `EventRegistration`, `Payment` (Razorpay fields).
- **Payments:** a complete Razorpay flow end-to-end — `create-order`, `verify`,
  `webhook`, `history` — already handling `entityType: "event"` with
  registration payment-status sync.
- **User pages:** `/events` (list) and `/events/[id]` (detail, with working
  Overview / Format / Prizes / Schedule tabs).
- **Admin:** `/admin/events` — CRUD via a single cramped modal form, plus a
  read-only registrations table.
- **APIs:** list, detail (register/cancel), admin CRUD.
- **Libs:** `paymentStatus`, `razorpay`, `taxonomy`, reputation service, admin
  form components (`AdminModal`, `FormInput`, `ImageUpload`,
  `VenueLocationPicker`, …).

The full brief (wizard, approval workflow, participant dashboard, admin
registration management, event updates, normalized sub-tables) is **4–5
independent subsystems** — too large for one spec. Decision (confirmed with the
user): build **incrementally**, keep the working payment/registration core, and
do **Slice 1 = Admin Authoring + Content Model** first because it unblocks a
richer detail page and fixes the most visible "incomplete/broken" complaints.

Data-model decision (confirmed): **add only what's needed** — keep existing
JSON/array fields, add new optional columns; no normalized sub-tables in this
slice.

Migration baseline verified clean: `prisma migrate status` → "Database schema is
up to date!" (13 migrations applied). An additive migration is safe.

## Scope

**In scope**

- A 5-step create/edit **wizard** replacing the single add/edit modal in
  `/admin/events`.
- An enriched **content model** (new optional columns on `SportEvent`).
- **Draft / Publish** with a public read-path draft guard.
- **Detail-page rendering** of the new fields (confirmed: included in this slice,
  so authored content is actually visible and empty sections stop looking broken).

**Out of scope (later slices — left untouched)**

- Approval / reject / refund, auto-vs-manual approval *enforcement*.
- Admin registration management actions + CSV export.
- Participant "My Registrations" dashboard.
- Event updates / announcements.
- Payment fee math (GST / convenience fee) — fields are **captured now, math
  wired later** (confirmed). Razorpay keeps charging the base `entryFeeAmount`.

The existing read-only registrations table and the entire Razorpay flow are not
modified.

## Data model — migration `add_event_authoring_fields`

All new columns are **optional with defaults**, so existing `SportEvent` rows
stay valid and visible. No existing column is removed or repurposed.

| Field | Type / default | Purpose |
|---|---|---|
| `published` | `Boolean @default(true)` | Draft = `false`. Existing rows stay visible. |
| `thumbnailUrl` | `String @default("")` | Card thumbnail; banner stays `imageUrl`. |
| `aboutLong` | `String @default("")` | Overview · long "About" (markdown-lite text). |
| `whatYouGet` | `String[] @default([])` | Overview · "What participants get" bullets. |
| `venueInfo` | `String @default("")` | Overview · venue information text. |
| `matchFormat` | `String @default("")` | Format · e.g. "Best of 3 sets". |
| `teamSize` | `String @default("")` | Format · e.g. "5v5". |
| `numRounds` | `String @default("")` | Format · e.g. "4 rounds" (string for flexibility). |
| `structure` | `String @default("")` | Format · Knockout / League / Hybrid. |
| `eligibility` | `String @default("")` | Format · eligibility text. |
| `rules` | `String[] @default([])` | Format · rules list. |
| `additionalRewards` | `String[] @default([])` | Prizes · certificates / merch / vouchers. |
| `city` | `String @default("")` | Location. |
| `state` | `String @default("")` | Location. |
| `country` | `String @default("India")` | Location. |
| `pincode` | `String @default("")` | Location. |
| `mapsLink` | `String @default("")` | Location · Google Maps URL. |
| `lat` | `Float?` | Location · coordinate (via `VenueLocationPicker`). |
| `lng` | `Float?` | Location · coordinate. |
| `approvalMode` | `String @default("auto")` | "auto" / "manual". Stored now, **enforced in the approval slice**. |
| `currency` | `String @default("INR")` | Registration setting (display now). |
| `gstPercent` | `Int @default(0)` | Captured now, fee-math deferred. |
| `convenienceFeePct` | `Int @default(0)` | Captured now, fee-math deferred. |

**Reused existing fields:** `title`, `sport`, `type`, `date`, `startDate`,
`endDate`, `registrationDeadline`, `location` (venue name), `address`,
`maxParticipants`, `prizePool`, `prizes[]`, `entryFee`, `entryFeeAmount`,
`difficulty`, `imageUrl`, `featured`, `status`, `description` (short),
`requirements[]`, `format[]`, `organizer`, `organizerContact`, `tags[]`,
`schedule` (JSON).

**Schedule JSON shape** is enriched from `{ day, time, event }` to
`{ title, date, time, location }`. The detail page keeps a **back-compat read**
for legacy items (map `day`→`title`, `event`→subtitle) so existing data renders.

## Status model — read-time derived (no cron; matches existing pattern)

**Stored:** `published` (bool) and `status` for the lifecycle values that can't
be derived: `Registration Open` / `Full` / `Cancelled`.

**Derived on read** (a pure helper, e.g. `deriveEventStatus(event, now)`):

1. not `published` → `Draft` (admin only)
2. `status === "Cancelled"` → `Cancelled`
3. `now ∈ [startDate, endDate]` → `Live`
4. `endDate < now` → `Completed`
5. `registrationDeadline < now` (and not yet started) → `Registration Closed`
6. else → stored `status` (`Registration Open` / `Full`)

(Order matters: `Completed` is checked **before** `Registration Closed` because a
finished event has both `endDate` and `registrationDeadline` in the past.)

This extends the current `Live`-only read-time derivation; nothing schedules
background transitions.

## Draft-leak guard (must-fix)

The current public list filters `status notIn [Completed, Archived, Cancelled]`
— a draft would slip through, and the detail route has no draft guard. Fix:

- `GET /api/events` (public list): add `published: true` to the `where`.
- `GET /api/events/[id]`: if `!published` and the requester is **not** an admin
  → `404`. An **admin session receives the draft** — this doubles as the
  wizard's Step-5 "preview exactly as users will see it."

Admin detection on the detail route reuses `getAdminSessionFromRequest`.

## Wizard UX — `/admin/events`

A 5-step stepper inside a wider modal (~720px), reusing existing admin form
components. State held in one `Partial<EventForm>`; `Back` / `Next` with per-step
zod validation; edit mode hydrates the same wizard from an existing event.

1. **Basics** — name, type (`EVENT_TYPES`), sport (`SPORTS`), banner
   (`ImageUpload` → `imageUrl`) + thumbnail (`ImageUpload` → `thumbnailUrl`),
   short description, long description (`aboutLong`).
2. **Registration** — Free/Paid radio (Paid reveals entry fee, currency, GST %,
   convenience %), capacity (`maxParticipants`), deadline
   (`registrationDeadline`), approval mode (auto/manual).
3. **Details** — Overview (`aboutLong`, `requirements[]`, `whatYouGet[]`,
   `venueInfo`), Format (`matchFormat`, `teamSize`, `numRounds`, `structure`,
   `eligibility`, `rules[]`), Prizes (`prizePool`, `prizes[]`,
   `additionalRewards[]`), **Schedule** (a small repeatable row editor:
   title/date/time/location → `schedule` JSON).
4. **Location** — `location` (venue name), `address`, `city`, `state`,
   `country`, `pincode`, `mapsLink`, coordinates via `VenueLocationPicker`.
5. **Review** — read-only summary + **Save Draft** (`published=false`) and
   **Publish** (`published=true`). Optional "Open live preview" link to the
   draft-preview detail route.

Simple string-list fields keep the existing "one per line" textarea pattern;
**Schedule** and **Prizes** get structured row editors (a small reusable
`RepeatableRows` helper). New component files:
`src/components/admin/EventWizard.tsx` (+ small sub-parts as needed).

## Detail-page rendering — `/events/[id]`

Enrich the existing tabs; every new field renders **only when present** with a
graceful fallback so old/empty events don't show broken sections:

- **Overview:** About (`aboutLong` || `description`), Requirements, What you get
  (`whatYouGet`), Venue info (`venueInfo`).
- **Format:** a clean spec list of the structured fields, then `rules[]`; falls
  back to legacy `format[]` when structured fields are empty.
- **Prizes:** `prizePool` + `prizes[]` cards + `additionalRewards[]`.
- **Schedule:** timeline using the new `{ title, date, time, location }` shape,
  with back-compat for legacy items.
- Hero/sidebar: surface `thumbnailUrl`/location fields where useful.

## APIs / validation / types

- New `src/lib/events.ts`: a shared `zod` `eventInputSchema`, the
  `deriveEventStatus` helper, and the enriched `ScheduleItem` type.
- `POST` / `PUT /api/admin/events`: extend the field whitelist to persist all
  new columns, validated by `eventInputSchema`; `published` is driven by
  Save-Draft vs Publish.
- `GET /api/events` (list): add `published: true`; apply `deriveEventStatus`.
- `GET /api/events/[id]`: draft guard + admin preview; apply `deriveEventStatus`.
- The admin page `Ev` type and `EMPTY` default expand to the new fields.

## Testing

- Vitest, following the existing `src/lib/*.test.ts` pattern:
  - `deriveEventStatus` — Draft / Live / Registration Closed / Completed /
    Cancelled / Open transitions across boundary times.
  - `eventInputSchema` — valid payload passes; invalid (missing title, bad fee,
    bad dates) fails.

## Implementation note

Per `AGENTS.md`, this repo's Next.js (16.2) has breaking changes vs training
data. **Read the relevant guides in `node_modules/next/dist/docs/` before
writing any route handler / form / `next/image` code**, and heed deprecation
notices.

## Later slices (for reference, not this spec)

2. Registration approval + admin management (approve/reject/refund, manual mode
   enforcement, real payment status in the table, CSV export).
3. Participant "My Registrations" dashboard (status, payment, ticket, cancel).
4. Event updates / announcements.
5. Payment fee math (GST + convenience wired into create-order/verify).
