# Event System Slice 3 — Participant "My Registrations" Dashboard

**Date:** 2026-06-13
**Status:** Approved (design)
**Slice:** 3 of the incremental event-system rebuild (Slice 1 authoring, Slice 2 approval — both shipped)

## Context

A "My Registrations" view already partially exists: the profile page
`/profile/[id]` renders a `BookingsTab` (owner-only, gated by `isOwn`) that lists
the user's coach bookings + camp/workshop/**event** registrations, grouped into
Upcoming / Completed / Cancelled via `registrationGroupStatus`. Data comes from
`/api/users/[id]` (`useUserProfile`, query key `["user", id]`), mapping each
registration to a `ProfileRegItem` (`id`, `title`, `startDate`, `endDate`,
`status`, `paymentStatus`, `groupStatus`).

Today each event registration is a bare read-only `Row` (title + date + raw
`status`). This slice enriches the **Events** section into a participant
dashboard per the brief: clear approval + payment status, **Cancel
Registration**, and **Download Ticket**.

Confirmed decisions: enhance the existing profile Events section (not a new page);
**events only** (coach/workshop/camp rows untouched); ticket = a dedicated
print-optimized **`/events/[id]/ticket`** route → browser Print → Save as PDF (no
new dependency); a `rejected` registration groups under **Cancelled** with a
"Rejected" badge.

## Scope

**In scope**
- Richer Events card in `BookingsTab`: approval-status badge + payment-status
  badge (+ rejection reason), Cancel action, Download-ticket link.
- A dedicated `/events/[id]/ticket` print page.
- Data: add `entityId` + `rejectionReason` to the events `ProfileRegItem`.
- Correctness fix: `registrationGroupStatus` maps `rejected → cancelled`.
- Cancel refreshes the dashboard (`["user"]` invalidation).

**Out of scope**
- Camps/workshops card upgrades (their own future slice).
- Real PDF generation / QR codes / email tickets.
- Re-registration after cancel/reject (existing register flow already allows a
  new registration once no active one exists).

## 1. Data / API

- `src/app/api/users/[id]/route.ts`: in the `registrations.events` map, add
  `entityId: r.eventId` and `rejectionReason: r.rejectionReason`. (`eventId` is
  already on the row; `rejectionReason` was added in Slice 2.) Camps/workshops
  mappings unchanged.
- `src/hooks/useData.ts`: extend `ProfileRegItem` with optional
  `entityId?: string` and `rejectionReason?: string | null` (optional so
  camp/workshop items, which omit them, still type-check).

## 2. Grouping fix — `src/lib/profileGrouping.ts`

`registrationGroupStatus(status, parentEnd, now)` currently returns `cancelled`
only when `status === "cancelled"`, so a `rejected` event registration falls
through to Upcoming/Completed by date. Change to also treat `rejected` as
`cancelled`:

```ts
export function registrationGroupStatus(status: string, parentEnd: string, now: Date): GroupStatus {
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return new Date(parentEnd).getTime() < now.getTime() ? "completed" : "upcoming";
}
```

This is also correct for any future approval-bearing registration type.

## 3. Cancel gating helper — `src/lib/profileGrouping.ts`

A pure, unit-tested helper so the card's Cancel rule lives in one place and
mirrors the server (`DELETE /api/events/[id]`: active status + 90-minute cutoff):

```ts
export function canCancelEventRegistration(
  r: { status: string; startDate?: string },
  now: Date,
): boolean {
  if (r.status !== "pending" && r.status !== "approved") return false; // terminal states can't cancel
  if (!r.startDate) return true;
  return new Date(r.startDate).getTime() - now.getTime() >= 90 * 60_000;  // 90-min cutoff
}
```

## 4. UI — richer Events card in `BookingsTab`

The `TypeSection` already accepts a per-type `render`. Pass a new `EventRegCard`
for the Events section only (coach/workshop/camp keep the shared `Row`):

- **Header:** title + event date.
- **Badges:** approval status via `EVENT_STATUS_LABELS` + a small color map
  (pending=amber, approved=green, rejected=red, cancelled=grey); payment status
  via `PAYMENT_STATUS_LABELS`/`PAYMENT_STATUS_COLORS`. For `rejected`, show the
  `rejectionReason` line when present.
- **Download ticket:** a link to `/events/{entityId}/ticket`, shown only when
  `status === "approved"`.
- **Cancel registration:** shown only when `canCancelEventRegistration(...)` is
  true; on click `confirm(...)` then `useCancelEvent().mutate(entityId)`.

`EventRegCard` is a new small component (e.g. inline in `BookingsTab.tsx` or
`src/components/profile/EventRegCard.tsx` if it grows). It receives the
`ProfileRegItem` and the cancel mutation.

## 5. Cancel wiring — `src/hooks/useData.ts`

`useCancelEvent` currently invalidates `["events"]` and `["event", eventId]`. Add
`qc.invalidateQueries({ queryKey: ["user"] })` so the profile dashboard refetches
after a cancel. (Broad `["user"]` key refreshes whichever profile is open.)

## 6. Ticket page — `src/app/events/[id]/ticket/page.tsx`

A client route, print-optimized:
- Uses the existing `useEvent(id)` (returns the event + `userRegistration` with
  `status`, `paymentStatus`, `teamName`) and `useAuth()` for the attendee name.
- **Guard:** while loading → skeleton; if no `userRegistration` or
  `userRegistration.status !== "approved"` → a "No ticket available" card with a
  link back to the event. (A pending/rejected/cancelled registration has no
  ticket.)
- **Ticket layout:** event banner/title, date, venue (`location`/`address`),
  organizer, attendee name, team name (if any), entry-fee/paid-or-free badge, and
  a **booking reference** = the registration id (`userRegistration.id`).
- **Print:** a "Print / Save as PDF" button calling `window.print()`, plus a
  `@media print` style block that hides nav/buttons and lays the ticket out
  cleanly on paper.

## 7. Testing

- `registrationGroupStatus` — `rejected → cancelled`, plus the existing
  cancelled/completed/upcoming cases (vitest, extend `profileGrouping.test.ts`).
- `canCancelEventRegistration` — terminal statuses return false; active + future
  (>90 min) true; active + within 90 min false; active + no startDate true.

## Component boundaries

- `profileGrouping.ts` — pure grouping + cancel-eligibility helpers; no IO.
- `EventRegCard` — presentational; renders a `ProfileRegItem`, delegates cancel to
  the passed mutation and ticket to a link.
- Ticket page — self-contained route; reads via `useEvent`, guards on approval,
  owns its print styling.
- `useCancelEvent` — the single cancel entry point; gains a `["user"]`
  invalidation.

## Later slices (reference)

4. Event updates / announcements. 5. Payment fee math (GST/convenience).
Notifications (email on approve/reject/cancel) may fold into a cross-cutting slice.
