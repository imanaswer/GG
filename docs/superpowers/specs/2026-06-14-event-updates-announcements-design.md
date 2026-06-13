# Event System Slice 4 — Event Updates / Announcements

**Date:** 2026-06-14
**Status:** Approved (design)
**Slice:** 4 of the incremental event-system rebuild (Slices 1 authoring, 2 approval, 3 participant dashboard — all shipped)

## Context

The brief's "Add event updates" (admin) / "View updates" (user) is the one
genuinely relational sub-table deferred by the Slice 1 data-model decision
("add tables only for genuinely relational needs: event updates"). No updates
feature exists today.

- The event detail page (`src/app/events/[id]/page.tsx`) already has a tab system
  (`type Tab = "overview" | "format" | "prizes" | "schedule"`) with count badges
  — an "Updates" tab slots in.
- The admin events page (`/admin/events`) renders event cards with Edit/Delete
  icon buttons — a Megaphone "Updates" button extends that pattern.
- The public detail `GET /api/events/[id]` (post-Slice-3) destructures the raw
  `registrations` relation out of the response and returns a mapped payload —
  updates fold into the same pattern.

Confirmed decisions: an update has an optional **title**, a **body**, a **pinned**
flag, and a timestamp; admins post/delete (no edit) from a **per-event modal** on
`/admin/events`; updates are delivered **in the detail GET** (one fetch) and the
Updates tab shows a **count badge**; **no notifications** (pull-only).

## Scope

**In scope:** `EventUpdate` model + migration; ordering helper + input schema;
updates in the public detail GET; admin list/create/delete API; admin
per-event updates modal; user Updates tab.

**Out of scope:** editing an update (delete + repost); notifications/email/push;
reactions/comments; per-update read tracking.

## 1. Data model — `EventUpdate` (migration `add_event_updates`, additive)

```prisma
model EventUpdate {
  id        String   @id @default(cuid())
  eventId   String
  title     String   @default("")
  body      String
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())
  event SportEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  @@index([eventId, pinned, createdAt(sort: Desc)])
}
```

Add `updates EventUpdate[]` to `model SportEvent`. `onDelete: Cascade` removes an
event's updates when the event is deleted (the admin event DELETE need not delete
them explicitly).

## 2. Pure helpers — `src/lib/eventUpdates.ts` (+ test)

- `EventUpdateItem` type: `{ id: string; title: string; body: string; pinned: boolean; createdAt: string }`.
- `sortEventUpdates(updates)` — returns a new array ordered **pinned first, then
  newest-first** (`createdAt` desc). Pure; unit-tested.
- `eventUpdateInputSchema` (zod): `body` required, `min(1).max(2000)`; `title`
  `max(120)` default `""`; `pinned` boolean default `false`. Used by the admin
  POST.

## 3. APIs

**Public — extend `GET /api/events/[id]`:**
- Add `updates: true` to the `include` (alongside the existing `registrations`).
- After computing status/userRegistration, destructure both relations out and
  return a mapped, ordered `updates`:
  ```ts
  const { registrations, updates, ...eventPublic } = event;
  return ok({ ...eventPublic, status, registeredCount: registrations.length, userRegistration,
    updates: sortEventUpdates(updates.map(u => ({ id: u.id, title: u.title, body: u.body, pinned: u.pinned, createdAt: u.createdAt.toISOString() }))) });
  ```
- Drafts remain admin-only (existing guard unchanged).

**Admin — new `src/app/api/admin/events/[id]/updates/route.ts`** (all
`getAdminSessionFromRequest`-guarded; Next 16 `params: Promise<{ id }>`):
- `GET` — list the event's updates (ordered via `sortEventUpdates`).
- `POST` — validate body with `eventUpdateInputSchema`; create
  `{ eventId, title, body, pinned }`; 422 on validation error; return the created
  update.
- `DELETE` — read `{ updateId }` from the body; delete that update (scoped to the
  event id); 400 if missing.

## 4. Admin UI

- `src/app/admin/events/page.tsx`: add a **Megaphone** icon button to each event
  card (beside Edit/Delete) that opens the updates modal for that event.
- `src/components/admin/EventUpdatesModal.tsx` (new): rendered in an `AdminModal`.
  - React Query list keyed `["admin-event-updates", eventId]` →
    `GET /api/admin/events/[id]/updates`.
  - **Post form:** title `FormInput` (optional), body `FormTextarea` (required),
    a "Pin this update" checkbox, and a Post button (create mutation → invalidate
    the list).
  - **List:** each update shows a pinned badge (when pinned), the timestamp, the
    title (if any) + body, and a delete button (delete mutation → invalidate).
  - Empty state: "No updates posted yet."

## 5. User UI — Updates tab (`src/app/events/[id]/page.tsx`)

- Add `"updates"` to the `Tab` union and a `TabButton` with
  `count={event.updates?.length ?? 0}`.
- Render an Updates timeline when `tab === "updates"`: items already ordered by
  the API (pinned first, then newest). Each card: a "Pinned" marker when pinned,
  the formatted date, an optional bold title, and the body (preserve line breaks
  with `whiteSpace: "pre-line"`). Empty state: "No updates yet."
- Extend the client `SportEvent` type (`src/hooks/useData.ts`) with
  `updates?: EventUpdateItem[]` (import the type from `@/lib/eventUpdates`).

## 6. Testing

- `sortEventUpdates` — pinned items precede unpinned; within each group,
  newest-first; stable for equal inputs (vitest).
- `eventUpdateInputSchema` — empty/whitespace body rejected; valid (body only)
  passes with `title=""`, `pinned=false` defaults.

## Component boundaries

- `eventUpdates.ts` — pure ordering + input schema; no IO.
- Admin route — thin: auth + validate + Prisma.
- `EventUpdatesModal` — self-contained admin widget (its own queries/mutations).
- Detail page Updates tab — presentational; renders the API-ordered array.

## Later slices (reference)

5. Payment fee math (GST/convenience). Notifications (email/push on
approve/reject/cancel/new-update) may fold into a cross-cutting slice.
