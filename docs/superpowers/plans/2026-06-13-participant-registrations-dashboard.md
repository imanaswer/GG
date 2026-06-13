# Event System Slice 3 — Participant "My Registrations" Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the profile Events registration list into a participant dashboard — approval + payment status, Cancel, and a printable ticket — by enhancing the existing `BookingsTab` Events section (events-only).

**Architecture:** Two pure helpers (grouping fix + cancel-eligibility) land in `profileGrouping.ts` with tests. The `/api/users/[id]` events mapping + the `ProfileRegItem` type gain `entityId`/`rejectionReason`. A new presentational `EventRegCard` renders the richer Events rows (reusing the canonical payment label/color maps). `useCancelEvent` gains a profile-refresh invalidation. A new print-optimized `/events/[id]/ticket` route renders a ticket for an approved registration via `window.print()`.

**Tech Stack:** Next.js 16.2 (App Router), React 19, `@tanstack/react-query`, vitest. Inline-style design system.

**Spec:** `docs/superpowers/specs/2026-06-13-participant-registrations-dashboard-design.md`

## Pre-flight
- [ ] Per `AGENTS.md`, skim the relevant Next 16 guide in `node_modules/next/dist/docs/` before adding the new `app` route (`/events/[id]/ticket`).

---

## File Structure
- Modify `src/lib/profileGrouping.ts` (+ `profileGrouping.test.ts`) — `rejected→cancelled`, `canCancelEventRegistration`.
- Modify `src/app/api/users/[id]/route.ts` — events mapping `entityId` + `rejectionReason`.
- Modify `src/hooks/useData.ts` — `ProfileRegItem` type; `useCancelEvent` invalidation.
- Create `src/components/profile/EventRegCard.tsx` — richer event registration card.
- Modify `src/components/profile/BookingsTab.tsx` — use `EventRegCard` for the Events section.
- Create `src/app/events/[id]/ticket/page.tsx` — printable ticket route.

---

## Task 1: Grouping fix + cancel-eligibility helper (TDD)

**Files:** Modify `src/lib/profileGrouping.ts`; Test `src/lib/profileGrouping.test.ts`.

- [ ] **Step 1: Add failing tests.** In `src/lib/profileGrouping.test.ts`, EXTEND the import on line 2 to add `canCancelEventRegistration`, then append:

```ts
describe("registrationGroupStatus — rejected", () => {
  const NOW2 = new Date("2026-06-13T00:00:00Z");
  it("groups rejected under cancelled regardless of date", () => {
    expect(registrationGroupStatus("rejected", "2026-12-01T00:00:00Z", NOW2)).toBe("cancelled");
    expect(registrationGroupStatus("rejected", "2026-01-01T00:00:00Z", NOW2)).toBe("cancelled");
  });
});

describe("canCancelEventRegistration", () => {
  const NOW2 = new Date("2026-06-13T00:00:00Z");
  it("false for terminal statuses", () => {
    expect(canCancelEventRegistration({ status: "rejected", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(false);
    expect(canCancelEventRegistration({ status: "cancelled", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(false);
  });
  it("true for active + future (>90 min)", () => {
    expect(canCancelEventRegistration({ status: "pending", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(true);
    expect(canCancelEventRegistration({ status: "approved", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(true);
  });
  it("false when within 90 minutes of start", () => {
    const soon = new Date(NOW2.getTime() + 60 * 60_000).toISOString(); // 60 min away
    expect(canCancelEventRegistration({ status: "approved", startDate: soon }, NOW2)).toBe(false);
  });
  it("true when no startDate is known", () => {
    expect(canCancelEventRegistration({ status: "approved" }, NOW2)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify fail.**

Run: `npx vitest run src/lib/profileGrouping.test.ts`
Expected: FAIL (`canCancelEventRegistration` undefined; rejected test fails).

- [ ] **Step 3: Implement.** In `src/lib/profileGrouping.ts`:
  - Change `registrationGroupStatus` so the first line handles rejected:

```ts
export function registrationGroupStatus(status: string, parentEnd: string, now: Date): GroupStatus {
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return new Date(parentEnd).getTime() < now.getTime() ? "completed" : "upcoming";
}
```

  - Append the new helper:

```ts
/**
 * Whether the user may cancel their own event registration — mirrors the server
 * rule in DELETE /api/events/[id]: only an active (pending/approved) registration,
 * and only ≥ 90 minutes before the event start.
 */
export function canCancelEventRegistration(
  r: { status: string; startDate?: string },
  now: Date,
): boolean {
  if (r.status !== "pending" && r.status !== "approved") return false;
  if (!r.startDate) return true;
  return new Date(r.startDate).getTime() - now.getTime() >= 90 * 60_000;
}
```

- [ ] **Step 4: Run — verify pass.**

Run: `npx vitest run src/lib/profileGrouping.test.ts`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/profileGrouping.ts src/lib/profileGrouping.test.ts
git commit -m "feat(profile): group rejected registrations as cancelled + cancel-eligibility helper"
```
(End every commit message in this plan with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: API + type — `entityId` + `rejectionReason` on event registrations

**Files:** Modify `src/app/api/users/[id]/route.ts`, `src/hooks/useData.ts`.

- [ ] **Step 1: Extend the events mapping.** In `src/app/api/users/[id]/route.ts`, the `registrations` object maps events (around line 101). It currently reads:
```ts
      events: eventRegs.map(r => ({ id: r.id, title: r.event?.title ?? "Event", startDate: r.event?.startDate, endDate: r.event?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.event?.endDate ?? r.event?.startDate ?? new Date()).toISOString(), now) })),
```
Add `entityId: r.eventId` and `rejectionReason: r.rejectionReason`:
```ts
      events: eventRegs.map(r => ({ id: r.id, entityId: r.eventId, title: r.event?.title ?? "Event", startDate: r.event?.startDate, endDate: r.event?.endDate, status: r.status, paymentStatus: r.paymentStatus, rejectionReason: r.rejectionReason, groupStatus: registrationGroupStatus(r.status, (r.event?.endDate ?? r.event?.startDate ?? new Date()).toISOString(), now) })),
```
(`r.eventId` and `r.rejectionReason` are columns on `EventRegistration`; the `eventRegs` query already returns the full row. Leave camps/workshops mappings unchanged.)

- [ ] **Step 2: Extend the client type.** In `src/hooks/useData.ts`, the `ProfileRegItem` type (around line 53) is:
```ts
export type ProfileRegItem = {
  id: string; title: string; startDate?: string; endDate?: string;
  status: string; paymentStatus: string; groupStatus: "upcoming" | "completed" | "cancelled";
};
```
Add the two optional fields (optional so camp/workshop items still type-check):
```ts
export type ProfileRegItem = {
  id: string; title: string; startDate?: string; endDate?: string;
  status: string; paymentStatus: string; groupStatus: "upcoming" | "completed" | "cancelled";
  entityId?: string; rejectionReason?: string | null;
};
```

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/api/users/[id]/route.ts" src/hooks/useData.ts
git commit -m "feat(profile): expose eventId + rejectionReason on event registrations"
```

---

## Task 3: `useCancelEvent` refreshes the profile dashboard

**Files:** Modify `src/hooks/useData.ts`.

- [ ] **Step 1: Add the invalidation.** In `useCancelEvent` (around line 406), the `onSuccess` currently invalidates `["events"]` and `["event", eventId]`. Add a profile invalidation so the dashboard refetches:
```ts
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast.success("Registration cancelled.");
    },
```
(Broad `["user"]` refreshes whichever profile is open. The detail-page cancel flow is unaffected — it just also invalidates user, which is harmless there.)

- [ ] **Step 2: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add src/hooks/useData.ts
git commit -m "feat(profile): refresh profile dashboard after event cancel"
```

---

## Task 4: `EventRegCard` + wire into `BookingsTab`

**Files:** Create `src/components/profile/EventRegCard.tsx`; Modify `src/components/profile/BookingsTab.tsx`.

- [ ] **Step 1: Create `src/components/profile/EventRegCard.tsx`:**

```tsx
"use client";
import Link from "next/link";
import { Ticket, X } from "lucide-react";
import type { ProfileRegItem } from "@/hooks/useData";
import { canCancelEventRegistration } from "@/lib/profileGrouping";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, isPaymentStatus } from "@/lib/paymentStatus";

// Approval-axis labels/colors for the registration's `status`. Kept local so the
// profile UI doesn't depend on the admin bookings lib.
const APPROVAL: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "Pending approval", bg: "rgba(234,179,8,0.15)",  color: "#eab308" },
  approved:  { label: "Approved",         bg: "rgba(34,197,94,0.15)",  color: "#4ade80" },
  rejected:  { label: "Rejected",         bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
  cancelled: { label: "Cancelled",        bg: "rgba(107,114,128,0.15)",color: "#9ca3af" },
};

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: bg, color }}>{label}</span>;
}

export function EventRegCard({ reg, onCancel, cancelling }: {
  reg: ProfileRegItem;
  onCancel: (eventId: string) => void;
  cancelling: boolean;
}) {
  const approval = APPROVAL[reg.status] ?? { label: reg.status, bg: "rgba(255,255,255,0.07)", color: "#9ca3af" };
  const pay = isPaymentStatus(reg.paymentStatus) ? { label: PAYMENT_STATUS_LABELS[reg.paymentStatus], ...PAYMENT_STATUS_COLORS[reg.paymentStatus] } : null;
  const canCancel = canCancelEventRegistration({ status: reg.status, startDate: reg.startDate }, new Date());
  const showTicket = reg.status === "approved" && !!reg.entityId;

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{reg.title}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            {reg.startDate ? new Date(reg.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill label={approval.label} bg={approval.bg} color={approval.color} />
          {pay && <Pill label={pay.label} bg={pay.bg} color={pay.color} />}
        </div>
      </div>

      {reg.status === "rejected" && reg.rejectionReason && (
        <div style={{ fontSize: 11.5, color: "rgba(248,113,113,0.85)" }}>Reason: {reg.rejectionReason}</div>
      )}

      {(showTicket || canCancel) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {showTicket && (
            <Link href={`/events/${reg.entityId}/ticket`} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 100, background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", color: "#ff6b74", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              <Ticket size={13} /> Download ticket
            </Link>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => { if (reg.entityId && confirm("Cancel your registration for this event?")) onCancel(reg.entityId); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 100, background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: cancelling ? 0.6 : 1 }}>
              <X size={13} /> {cancelling ? "Cancelling…" : "Cancel registration"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `BookingsTab`.** In `src/components/profile/BookingsTab.tsx`:
  - Add imports at top:
```tsx
import { EventRegCard } from "./EventRegCard";
import { useCancelEvent } from "@/hooks/useData";
```
  - Inside the `BookingsTab` component body (before the `return`), add the cancel mutation:
```tsx
  const cancel = useCancelEvent();
```
  - Replace the Events `TypeSection`'s `render` (the line rendering `<Row ... />` for events, ~line 53-54) with the rich card:
```tsx
      <TypeSection label="Events" items={registrations?.events ?? []} statusOf={regStatus}
        render={(r) => <EventRegCard key={r.id} reg={r} onCancel={(id) => cancel.mutate(id)} cancelling={cancel.isPending} />} />
```
  Leave the Coach Sessions / Workshops / Camps `TypeSection`s (using `Row`) unchanged.

- [ ] **Step 3: Typecheck + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no new errors).

- [ ] **Step 4: Commit.**

```bash
git add src/components/profile/EventRegCard.tsx src/components/profile/BookingsTab.tsx
git commit -m "feat(profile): rich event registration card with status, cancel, ticket link"
```

---

## Task 5: Printable ticket page `/events/[id]/ticket`

**Files:** Create `src/app/events/[id]/ticket/page.tsx`.

- [ ] **Step 1: Create the route.** Create `src/app/events/[id]/ticket/page.tsx`:

```tsx
"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Ticket as TicketIcon } from "lucide-react";
import { useEvent } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";

export default function EventTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event, isLoading } = useEvent(id);
  const { user } = useAuth();
  const reg = event?.userRegistration ?? null;
  const hasTicket = !!reg && reg.status === "approved";

  if (isLoading) {
    return <main style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Loading ticket…</main>;
  }

  if (!event || !hasTicket) {
    return (
      <main style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No ticket available</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 18 }}>
            A ticket is issued only once your registration is approved.
          </p>
          <Link href={`/events/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 100, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to event
          </Link>
        </div>
      </main>
    );
  }

  const isFree = event.entryFeeAmount === 0;

  return (
    <main style={{ background: "#050505", minHeight: "100vh", padding: "40px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div className="ticket-card" style={{ width: "100%", maxWidth: 460, background: "#0d0d0d", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#e63946,#b91c2d)", padding: "18px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <TicketIcon size={20} color="#fff" />
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>Event ticket</span>
        </div>
        <div style={{ padding: "22px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 14 }}>{event.title}</h1>
          {[
            ["Attendee", user?.name ?? "—"],
            ["Team", reg!.teamName || "—"],
            ["Date", event.date || (event.startDate ? new Date(event.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—")],
            ["Venue", [event.location, event.address].filter(Boolean).join(" · ") || "—"],
            ["Organizer", event.organizer || "—"],
            ["Entry", isFree ? "Free" : `${event.entryFee} · ${reg!.paymentStatus}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Booking reference</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#ff6b74", fontFamily: "monospace", letterSpacing: "0.05em", wordBreak: "break-all" }}>{reg!.id}</p>
          </div>
        </div>
      </div>

      <div className="ticket-actions" style={{ display: "flex", gap: 10 }}>
        <button onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 44, padding: "0 20px", borderRadius: 100, background: "#e63946", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Printer size={15} /> Print / Save as PDF
        </button>
        <Link href={`/events/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 44, padding: "0 20px", borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
          <ArrowLeft size={15} /> Back to event
        </Link>
      </div>

      <style>{`
        @media print {
          body { background: #fff !important; }
          .ticket-actions { display: none !important; }
          main { background: #fff !important; padding: 0 !important; }
          .ticket-card { border: 1px solid #000 !important; box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck + build.**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; the `/events/[id]/ticket` route appears in the build output.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/events/[id]/ticket/page.tsx"
git commit -m "feat(events): printable ticket page for approved registrations"
```

---

## Task 6: Full verification

- [ ] **Step 1: Unit tests.** Run: `npm test` — all pass (incl. the new grouping/cancel tests).
- [ ] **Step 2: Static gates.** Run: `npx tsc --noEmit && npm run lint && npm run build` — clean.
- [ ] **Step 3: Manual smoke** (`npm run dev`, signed in as a user with event registrations; if local auth is awkward, seed registrations directly with the `PrismaPg`-adapter script pattern from `src/lib/prisma.ts`):
  1. On `/profile/<own-id>` → **Bookings** tab → Events section: an `approved` reg shows green "Approved" + a payment pill + **Download ticket**; a `pending` reg shows amber "Pending approval" + **Cancel**; a `rejected` reg appears under **Cancelled** with a red "Rejected" pill + reason and no ticket/cancel.
  2. Click **Cancel** on an active future registration → confirms, the row leaves the list (participants decremented), dashboard refreshes.
  3. Click **Download ticket** on an approved reg → `/events/<id>/ticket` renders the ticket; **Print / Save as PDF** opens the print dialog with a clean ticket-only layout.
  4. Visit `/events/<id>/ticket` for an event the user is NOT approved for → "No ticket available".
- [ ] **Step 4: Commit any smoke fix.** `git add -A && git commit -m "fix(profile): slice 3 smoke-test adjustments"` (only if needed).

---

## Notes for the implementer
- **Reuse:** payment labels/colors come from `@/lib/paymentStatus`; cancel uses the existing `useCancelEvent`; the ticket reuses `useEvent`. Don't re-implement these.
- **Events only:** do not touch the Coach/Workshop/Camp `Row` rendering or their registration logic.
- **YAGNI:** no QR codes, no real PDF lib, no re-registration flow — the booking reference is the registration id and the ticket prints via the browser.
- **Cancel gating** mirrors the server (`DELETE /api/events/[id]`: active status + 90-min cutoff) via `canCancelEventRegistration`; the server remains the source of truth (the UI gate is convenience only).
