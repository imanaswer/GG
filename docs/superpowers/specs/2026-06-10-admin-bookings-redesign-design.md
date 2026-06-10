# Admin Bookings Redesign — Design Spec

**Date:** 2026-06-10
**Status:** Approved (with adjustments folded in)

## Goal

Replace the single mixed admin bookings table with a scalable, category-driven
booking management system that feels like a professional SaaS admin panel. Five
booking categories — **Coaches, Play Sessions, Workshops, Camps, Events** — each
get a dedicated, server-filtered, paginated view with summary cards, a details
drawer, per-category quick actions, bulk actions, and CSV export.

The admin reaches any action in 2–3 clicks: **Bookings → category → status →
act**.

---

## Key constraint: status semantics differ per category

Only **Coaches** have a true approval lifecycle in the data model today. The
other four are pay-and-join registrations. We **adapt per category** rather than
forcing a fake uniform lifecycle (decided during brainstorming).

| Category | Backing model(s) | Reality |
|---|---|---|
| Coaches | `Booking` | Full lifecycle: pending/approved/rejected/completed/cancelled + audit timestamps + notes |
| Play Sessions | `Game` + `GamePlayer` | Players join directly; `attended` true/false; game has its own status |
| Workshops | `WorkshopRegistration` | Registration + `paymentStatus` |
| Camps | `CampRegistration` | Registration + `paymentStatus` (+ childName/age) |
| Events | `EventRegistration` | Registration + `paymentStatus` (+ teamName) |

Payments are tracked in a polymorphic `Payment` table keyed by
`entityType` (camp/event/game/workshop) + `entityId` + `userId`. **There are no
coach payments.**

---

## 1. Architecture — configuration-driven framework

A single reusable client component, `BookingsCategoryView`, is driven by a
per-category **config object**. Adding or changing a category means editing
config, not rewriting a page.

```
src/lib/adminBookings/
  config.ts        // CATEGORY_CONFIGS: columns, status buckets, actions,
                   //   bulk actions, apiPath, searchable fields, drawer mapping,
                   //   landing-card metric mapping
  query.ts         // shared server helpers: parse date range, pagination,
                   //   sort mapping, search builders
  types.ts         // shared TS types for rows, counts, list responses

src/components/admin/bookings/
  BookingsCategoryView.tsx   // table + filters + summary cards + selection +
                             //   bulk bar + drawer host
  BookingsToolbar.tsx        // status tabs, date filter, search, sort, export
  SummaryCards.tsx
  BookingDrawer.tsx          // detail sections + quick actions
  BulkActionBar.tsx          // appears when rows selected
```

A category config declares its identity once:

```ts
interface CategoryConfig {
  key: "coaches" | "play-sessions" | "workshops" | "camps" | "events";
  label: string;
  apiPath: string;                       // /api/admin/bookings/<key>
  columns: ColumnDef[];                  // header + row accessor
  statuses: StatusBucket[];              // filter tabs + summary cards
  rowActions: ActionDef[];               // per-row quick actions
  bulkActions: BulkActionDef[];          // selection actions
  searchFields: string[];                // display hint only; server owns search
  landingMetrics: LandingMetricMap;      // total/pending/active/completed/cancelled
  drawerSections: DrawerSectionDef[];
}
```

### Routes

- `/admin/bookings` — landing page with 5 category cards.
- `/admin/bookings/coaches`
- `/admin/bookings/play-sessions`
- `/admin/bookings/workshops`
- `/admin/bookings/camps`
- `/admin/bookings/events`

### Sidebar

"Bookings" becomes an **expandable parent** with the 5 children. The existing
top-level *entity-management* pages (Coaches / Camps / Events / Workshops /
Games — which manage the listings themselves, not bookings) are left untouched.

### APIs

Per category, under `/api/admin/bookings/<key>`:

- `GET` — paginated + filtered list, plus per-status counts and total.
- `PATCH` — single-row and bulk actions (accepts one id or an array of ids).
- `GET …?format=csv` — CSV export of the **full filtered set** (no pagination),
  respecting status + date + search.

All routes are admin-guarded via the existing `getAdminSessionFromRequest`.
Shared query helpers live in `src/lib/adminBookings/query.ts`.

---

## 2. Database migration (minimal)

Add only the fields the agreed actions need — **not** a generic audit-log table.

- `CampRegistration`, `EventRegistration`, `WorkshopRegistration`:
  - `status String @default("registered")`  // values: `registered`, `cancelled`
  - `cancelledAt DateTime?`
  - `updatedAt DateTime @updatedAt`
- `GamePlayer`:
  - `status String @default("joined")`       // values: `joined`, `cancelled`
  - `cancelledAt DateTime?`
  - `updatedAt DateTime @updatedAt`
- Coach `Booking`: unchanged (already complete).

### Payment status standardization (Change 3)

Payment statuses must be **centralized**, not scattered strings.

```
src/lib/paymentStatus.ts
  export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
  export type PaymentStatus = typeof PAYMENT_STATUSES[number];
  // helpers: isPaymentStatus(), PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS
```

- Canonical values: `pending · paid · failed · refunded`.
- Migration: change `paymentStatus` default from `"unpaid"` to `"pending"` on
  all three registration models, and **backfill** existing `"unpaid"` rows to
  `"pending"`.
- Update existing references (payment `verify`, `webhook`, registration sync,
  any admin/registration UI) to import from `paymentStatus.ts` — no inline
  string literals.

### Add indexes for filter/sort performance

Add composite indexes to support the common server filters/sorts, e.g.
`@@index([campId, status, registeredAt(sort: Desc)])` (and the event/workshop
equivalents), and `@@index([gameId, status, joinedAt(sort: Desc)])`. Keep the
set minimal and driven by the actual query shapes.

---

## 3. Status buckets per category (one derived dimension each)

- **Coaches:** `Pending · Approved · Rejected · Completed · Cancelled`
  (the real `Booking.status` field).
- **Camps / Events / Workshops:** `Pending payment · Paid · Failed · Refunded ·
  Cancelled`.
  Derivation: `status == "cancelled"` → **Cancelled**; else map `paymentStatus`
  (`pending`→Pending payment, `paid`→Paid, `failed`→Failed, `refunded`→Refunded).
- **Play Sessions:** `Joined · Attended · No-show · Cancelled`.
  Derivation: `status == "cancelled"` → **Cancelled**; else `attended === true`
  → Attended; `attended === false` → No-show; else **Joined**.

Server-side filtering translates a requested bucket back into the concrete
`where` clause for that model.

---

## 4. Columns per category

| Category | Columns |
|---|---|
| **Coaches** | Booking ID · User · Coach · Session (batch label or "1:1") · Date (session/created) · Status · Created · Actions |
| **Play Sessions** | Booking ID · User · Game · Sport · Date (`scheduledAt`) · Status · Joined · Actions |
| **Workshops** | Booking ID · User · Workshop · Participant · Date (`startDate`) · Status · Created · Actions |
| **Camps** | Booking ID · User · Camp · Child (name / age) · Date (`startDate`) · Status · Created · Actions |
| **Events** | Booking ID · User · Event · Team · Date (`startDate`) · Status · Created · Actions |

A leading **selection checkbox column** is added for bulk actions (Change 1).

---

## 5. Filters / Search / Sort (every view)

- **Status:** category buckets + `All`.
- **Date:** `Today · This Week · This Month · Custom Range`. Basis = the
  booking/registration creation date (`createdAt` / `registeredAt` / `joinedAt`).
- **Search:** user name · email · booking ID · entity name
  (coach / game / workshop / camp / event).
- **Sort:** `Newest first` (created desc) · `Oldest first` (created asc) ·
  `Upcoming first` (by session/event date asc, future first) · `Recently
  updated` (`updatedAt` desc).

All applied server-side via Prisma `where` / `orderBy`.

---

## 6. Summary cards

Per-category status counts at the top of each category page, computed as
**independent aggregate queries** (`groupBy` / count over the full filtered set,
**not** derived from the current page). Counts reflect the active **date +
search** filters but show **all** status buckets (so the status filter doesn't
hide the other buckets' totals). They update automatically when filters change.

---

## 7. Landing page — 5 category cards (Additional Requirement)

`/admin/bookings` shows 5 cards (Coaches, Play Sessions, Workshops, Camps,
Events). Each card displays five metrics:

- **Total Bookings**
- **Pending**
- **Active / Open**
- **Completed**
- **Cancelled**

Clicking a card enters that category's detailed page. The metric→bucket mapping
per category (`landingMetrics` in config):

| Card metric | Coaches | Play Sessions | Workshops/Camps/Events |
|---|---|---|---|
| Pending | pending | — (n/a) | pending payment |
| Active/Open | approved | joined (upcoming game) | paid |
| Completed | completed | attended | paid & past end date |
| Cancelled | cancelled + rejected | cancelled + no-show | cancelled + refunded |
| Total | all bookings | all GamePlayer rows | all registrations |

Notes: a `—` means the concept does not exist for that category; the card shows
a dash, not 0. The landing **Completed** metric for registration categories is a
**derived overview number** (paid registrations whose event/camp/workshop end
date has passed) — it is an overview aggregate only, not a status *filter* bucket
(those categories have no Completed filter, per section 3). Each card's five
metrics are produced by the same aggregate-count helpers (one batched query per
category).

---

## 8. Details drawer

Right-side drawer (no navigation away) with sections driven by
`drawerSections`:

- **User Information** — name, email, phone.
- **Booking Information** — entity + category specifics (batch / sport / child /
  team / participant).
- **Payment Information** — joined from the `Payment` table by
  `entityType + entityId + userId` (amount, method, Razorpay ids, paidAt,
  status). Coaches show "No payment on file".
- **Status History** — see Change 4 below.
- **Notes** — rejection reason / coach note (Coaches only).
- **Timestamps** — created, updated, and any lifecycle timestamps.

### Status history (Change 4)

No status-history model exists today. For now the history is **synthesized from
existing timestamps** (Coaches: created/approved/rejected/completed/cancelled;
others: registered/joined, paid via `Payment.paidAt`, cancelled). This is
acceptable per the requirement.

**Critical design rule:** all admin mutations pass through a **central action
service** (`src/lib/adminBookings/actions.ts`) — never inline in routes. Each
action takes `(category, ids, action, actor, meta)` and is the single place that
applies the transition, releases seats, and updates timestamps. This means a
persistent audit-log table can be added later (one `auditLog.create` call inside
the service) **without rewriting any business logic or route**. Coach actions
continue to delegate to the existing `src/lib/bookings.ts` service from within
this layer.

---

## 9. Quick actions + Bulk actions

### Per-row quick actions (inline + drawer, no page leave)

- **Coaches:** Approve · Reject (reason) · Complete · Cancel → existing
  `bookings.ts` service.
- **Camps / Events / Workshops:** Cancel registration (releases the
  participant slot) · Mark paid · Mark refunded.
- **Play Sessions:** Mark attended · Mark no-show · Cancel (releases the game
  slot).

### Bulk actions (Change 1) — built into the framework now

Selecting rows reveals a `BulkActionBar`. Each category exposes the bulk actions
that make sense for it, all behind a **confirmation dialog** showing the count:

- Bulk Approve · Bulk Reject · Bulk Cancel (Coaches)
- Bulk Mark Paid · Bulk Mark Refunded · Bulk Cancel (Camps/Events/Workshops)
- Bulk Mark Attended · Bulk Cancel (Play Sessions)

Bulk actions route through the same central action service (array of ids),
applied transactionally per id with a per-id success/failure summary returned to
the UI (invalid transitions are skipped and reported, not fatal).

### CSV export (Change 2) — every category

A toolbar **Export CSV** button calls `GET …?format=csv`, which streams the
**full filtered set** (respecting status + date + search + sort, ignoring
pagination). Columns mirror the category's table columns plus user email/phone
and payment fields. Useful for finance reporting on events/camps/workshops.

---

## 10. Performance

- Server-side `where` / `orderBy` / `skip` / `take`; default page size **25**.
- Per-status counts via `groupBy`; landing cards via batched count queries.
- New composite indexes (section 2) back the common filter/sort paths.
- Stays responsive at thousands of rows; the page never loads the full set
  except for an explicit CSV export.

---

## 11. Build phasing (scope stays all 5 categories)

- **Phase 1 — Foundation:** schema migration + `paymentStatus.ts` +
  `adminBookings` lib (config/query/types/actions) + sidebar restructure +
  landing page with 5 cards.
- **Phase 2 — Coaches:** `BookingsCategoryView` + drawer + toolbar + summary +
  bulk bar + CSV, wired to an extended Coaches API (pagination/filters/counts)
  and the existing approval service. Proves the framework end-to-end.
- **Phase 3 — Remaining four:** Play Sessions, Workshops, Camps, Events configs
  + their APIs + the new mutation actions (cancel / payment / attendance) +
  bulk + CSV, reusing the Phase 2 components.

---

## Out of scope (YAGNI)

- Generic audit-log table (designed for, not built).
- Real Razorpay refund API calls — "Mark refunded" updates `paymentStatus` only.
- Adding an approval workflow to non-coach registrations (rejected during
  brainstorming).
- Changes to user-facing booking/registration/payment flows beyond the
  paymentStatus value standardization.
