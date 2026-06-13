# Event System Slice 4 — Event Updates / Announcements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins post timestamped, pinnable announcements to an event (per-event modal on `/admin/events`) and let users read them in a new Updates tab on the event detail page.

**Architecture:** A new `EventUpdate` table (cascade-deleted with its event). A pure `eventUpdates.ts` lib holds the ordering helper + zod input schema (tested). The public detail GET includes updates inline (ordered, mapped). A new admin route handles list/create/delete. A self-contained `EventUpdatesModal` provides the admin UI; the detail page gains an Updates tab.

**Tech Stack:** Next.js 16.2 (App Router route handlers), Prisma 7 + PostgreSQL (Supabase), React 19, `@tanstack/react-query`, zod, vitest. Inline-style design system.

**Spec:** `docs/superpowers/specs/2026-06-14-event-updates-announcements-design.md`

## Pre-flight
- [ ] Per `AGENTS.md`, skim the relevant Next 16 route-handler guide in `node_modules/next/dist/docs/` before adding the new API route (note `params` is a `Promise`).
- [ ] **Local Prisma note:** any throwaway DB script must use the `PrismaPg` adapter (see `src/lib/prisma.ts`); a bare `new PrismaClient()` fails (no datasource URL).

---

## File Structure
- Modify `prisma/schema.prisma` (+ migration) — `EventUpdate` model + relation.
- Create `src/lib/eventUpdates.ts` (+ `eventUpdates.test.ts`) — ordering helper + input schema + `EventUpdateItem` type.
- Modify `src/app/api/events/[id]/route.ts` (GET) — include + return ordered updates.
- Modify `src/hooks/useData.ts` — `SportEvent.updates` type.
- Create `src/app/api/admin/events/[id]/updates/route.ts` — admin list/create/delete.
- Create `src/components/admin/EventUpdatesModal.tsx` — admin updates widget.
- Modify `src/app/admin/events/page.tsx` — Megaphone button + modal state.
- Modify `src/app/events/[id]/page.tsx` — Updates tab.

---

## Task 1: Migration — `EventUpdate` model

**Files:** Modify `prisma/schema.prisma`; new migration dir.

- [ ] **Step 1: Add the model + relation.** In `prisma/schema.prisma`, inside `model SportEvent`, add a relation field next to the existing `registrations EventRegistration[]` line:
```prisma
  updates       EventUpdate[]
```
Then add a new model (place it right after the `SportEvent` model's closing `}`):
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

- [ ] **Step 2: Create + apply the migration.**

Run: `npm run db:migrate -- --name add_event_updates`
Expected: a new `prisma/migrations/…_add_event_updates/` with `CREATE TABLE "EventUpdate"`, applied; "Your database is now in sync with your schema."

**DB SAFETY GUARD:** real Supabase DB. If `prisma migrate dev` reports drift / asks to reset / warns of data loss — STOP, do NOT reset, report BLOCKED with the exact output.

- [ ] **Step 3: Verify + regenerate.**

Run: `npx prisma migrate status` → "Database schema is up to date!"
Run: `npx prisma generate`

- [ ] **Step 4: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(events): EventUpdate model for announcements"
```
(End every commit message in this plan with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: `eventUpdates.ts` — ordering helper + input schema (TDD)

**Files:** Create `src/lib/eventUpdates.ts`; Test `src/lib/eventUpdates.test.ts`.

- [ ] **Step 1: Write the failing tests.** Create `src/lib/eventUpdates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortEventUpdates, eventUpdateInputSchema } from "./eventUpdates";

const mk = (id: string, pinned: boolean, createdAt: string) => ({ id, title: "", body: "b", pinned, createdAt });

describe("sortEventUpdates", () => {
  it("pinned first, then newest-first within each group", () => {
    const out = sortEventUpdates([
      mk("a", false, "2026-06-01T00:00:00Z"),
      mk("b", true,  "2026-05-01T00:00:00Z"),
      mk("c", false, "2026-06-10T00:00:00Z"),
      mk("d", true,  "2026-06-05T00:00:00Z"),
    ]);
    expect(out.map(u => u.id)).toEqual(["d", "b", "c", "a"]);
  });
  it("does not mutate its input", () => {
    const input = [mk("a", false, "2026-06-01T00:00:00Z"), mk("b", true, "2026-06-02T00:00:00Z")];
    const copy = JSON.parse(JSON.stringify(input));
    sortEventUpdates(input);
    expect(input).toEqual(copy);
  });
});

describe("eventUpdateInputSchema", () => {
  it("rejects an empty body", () => {
    expect(() => eventUpdateInputSchema.parse({ body: "" })).toThrow();
  });
  it("defaults title to '' and pinned to false", () => {
    const p = eventUpdateInputSchema.parse({ body: "Venue changed to Court 2" });
    expect(p.title).toBe("");
    expect(p.pinned).toBe(false);
    expect(p.body).toBe("Venue changed to Court 2");
  });
});
```

- [ ] **Step 2: Run — verify fail.**

Run: `npx vitest run src/lib/eventUpdates.test.ts`
Expected: FAIL ("Cannot find module './eventUpdates'").

- [ ] **Step 3: Implement `src/lib/eventUpdates.ts`:**

```ts
import { z } from "zod";

export type EventUpdateItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string; // ISO
};

/**
 * Order updates for display: pinned items first, then newest-first by createdAt.
 * Pure and non-mutating (returns a new array). Works on any row carrying
 * `pinned` + an ISO `createdAt` string.
 */
export function sortEventUpdates<T extends { pinned: boolean; createdAt: string }>(updates: T[]): T[] {
  return [...updates].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Admin input for posting an update. */
export const eventUpdateInputSchema = z.object({
  title: z.string().max(120).default(""),
  body: z.string().min(1, "Update body is required").max(2000),
  pinned: z.boolean().default(false),
});

export type EventUpdateInput = z.infer<typeof eventUpdateInputSchema>;
```

- [ ] **Step 4: Run — verify pass.**

Run: `npx vitest run src/lib/eventUpdates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/eventUpdates.ts src/lib/eventUpdates.test.ts
git commit -m "feat(events): event-update ordering helper + input schema"
```

---

## Task 3: Public detail GET returns ordered updates

**Files:** Modify `src/app/api/events/[id]/route.ts` (GET), `src/hooks/useData.ts`.

- [ ] **Step 1: Include + return updates.** In `src/app/api/events/[id]/route.ts`:
  - Add import: `import { sortEventUpdates } from "@/lib/eventUpdates";`
  - Change the `findUnique` include from `include: { registrations: true },` to:
```ts
      include: { registrations: true, updates: true },
```
  - Replace the final two lines of the GET (`const { registrations, ...eventPublic } = event;` and the `return ok(...)`) with:
```ts
    const { registrations, updates, ...eventPublic } = event;
    return ok({
      ...eventPublic,
      status,
      registeredCount: registrations.length,
      userRegistration,
      updates: sortEventUpdates(updates.map(u => ({ id: u.id, title: u.title, body: u.body, pinned: u.pinned, createdAt: u.createdAt.toISOString() }))),
    });
```

- [ ] **Step 2: Extend the client type.** In `src/hooks/useData.ts`:
  - Add import near the top (with the other type imports): `import type { EventUpdateItem } from "@/lib/eventUpdates";`
  - In the `SportEvent` type, add a field (near `registeredCount?`):
```ts
  updates?: EventUpdateItem[];
```

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean. (Run `npx prisma generate` first if the client lacks `updates`/`eventUpdate`.)

- [ ] **Step 4: Commit.**

```bash
git add "src/app/api/events/[id]/route.ts" src/hooks/useData.ts
git commit -m "feat(events): include ordered updates in event detail response"
```

---

## Task 4: Admin updates API

**Files:** Create `src/app/api/admin/events/[id]/updates/route.ts`.

- [ ] **Step 1: Create the route** with EXACTLY this content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { eventUpdateInputSchema, sortEventUpdates } from "@/lib/eventUpdates";

type Ctx = { params: Promise<{ id: string }> };

async function listUpdates(eventId: string) {
  const rows = await prisma.eventUpdate.findMany({ where: { eventId } });
  return sortEventUpdates(rows.map(u => ({ id: u.id, title: u.title, body: u.body, pinned: u.pinned, createdAt: u.createdAt.toISOString() })));
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ updates: await listUpdates(id) });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = eventUpdateInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  const event = await prisma.sportEvent.findUnique({ where: { id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  await prisma.eventUpdate.create({ data: { eventId: id, title: parsed.data.title, body: parsed.data.body, pinned: parsed.data.pinned } });
  return NextResponse.json({ updates: await listUpdates(id) }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { updateId } = await req.json().catch(() => ({}));
  if (!updateId) return NextResponse.json({ error: "Missing updateId" }, { status: 400 });
  await prisma.eventUpdate.deleteMany({ where: { id: updateId, eventId: id } });
  return NextResponse.json({ updates: await listUpdates(id) });
}
```

(All three handlers return the fresh ordered list, so the client just replaces its cache with the response.)

- [ ] **Step 2: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/api/admin/events/[id]/updates/route.ts"
git commit -m "feat(events): admin API to list/post/delete event updates"
```

---

## Task 5: `EventUpdatesModal` + Megaphone button on the admin card

**Files:** Create `src/components/admin/EventUpdatesModal.tsx`; Modify `src/app/admin/events/page.tsx`.

- [ ] **Step 1: Create `src/components/admin/EventUpdatesModal.tsx`:**

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, Trash2 } from "lucide-react";
import { AdminModal, FormInput, FormTextarea } from "./AdminModal";
import type { EventUpdateItem } from "@/lib/eventUpdates";

export function EventUpdatesModal({ eventId, eventTitle, open, onClose }: {
  eventId: string | null;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const key = ["admin-event-updates", eventId];
  const { data } = useQuery<{ updates: EventUpdateItem[] }>({
    queryKey: key,
    queryFn: () => fetch(`/api/admin/events/${eventId}/updates`).then(r => r.json()),
    enabled: open && !!eventId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setTitle(""); setBody(""); setPinned(false); setError(null); };

  const post = useMutation({
    mutationFn: () => fetch(`/api/admin/events/${eventId}/updates`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, pinned }),
    }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: (res) => { qc.setQueryData(key, res); reset(); },
    onError: () => setError("Could not post the update. A body is required."),
  });

  const remove = useMutation({
    mutationFn: (updateId: string) => fetch(`/api/admin/events/${eventId}/updates`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateId }),
    }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: (res) => qc.setQueryData(key, res),
  });

  const updates = data?.updates ?? [];

  return (
    <AdminModal open={open} onClose={() => { reset(); onClose(); }} title={`Updates · ${eventTitle}`} width={560}>
      <form onSubmit={e => { e.preventDefault(); if (body.trim()) post.mutate(); else setError("A body is required."); }}>
        <FormInput label="Title (optional)" value={title} onChange={setTitle} placeholder="e.g. Venue changed" />
        <FormTextarea label="Update" value={body} onChange={setBody} rows={3} placeholder="What do participants need to know?" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#d1d5db", cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ accentColor: "#e63946" }} />
          Pin this update to the top
        </label>
        {error && <p style={{ fontSize: 13, color: "#f87171", marginBottom: 8 }}>{error}</p>}
        <button type="submit" disabled={post.isPending} style={{ height: 40, borderRadius: 9, background: "#e63946", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, padding: "0 18px", cursor: "pointer", fontFamily: "inherit", opacity: post.isPending ? 0.6 : 1 }}>
          {post.isPending ? "Posting…" : "Post update"}
        </button>
      </form>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {updates.length === 0 && <p style={{ fontSize: 13, color: "#6b7280" }}>No updates posted yet.</p>}
        {updates.map(u => (
          <div key={u.id} style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {u.pinned && <Pin size={12} color="#eab308" />}
                <span style={{ fontSize: 11, color: "#6b7280" }}>{new Date(u.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              </div>
              <button type="button" onClick={() => remove.mutate(u.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} title="Delete"><Trash2 size={13} color="#f87171" /></button>
            </div>
            {u.title && <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{u.title}</div>}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-line" }}>{u.body}</div>
          </div>
        ))}
      </div>
    </AdminModal>
  );
}
```

- [ ] **Step 2: Wire the Megaphone button + modal into `src/app/admin/events/page.tsx`.**
  - Add to the `lucide-react` import: `Megaphone` (the line currently imports `Plus, Pencil, Trash2`).
  - Add the modal import: `import { EventUpdatesModal } from "@/components/admin/EventUpdatesModal";`
  - Add state near the other `useState`s: `const [updatesTarget, setUpdatesTarget] = useState<Ev | null>(null);`
  - In the event card's icon-button row (which currently holds the Edit + Delete buttons), add a Megaphone button BEFORE the Edit button:
```tsx
                  <button onClick={() => setUpdatesTarget(e)} style={iconBtn} title="Updates"><Megaphone size={13} color="#fbbf24" /></button>
```
  - Render the modal once, near the other modals at the bottom of the returned JSX (e.g. after the delete `AdminModal`):
```tsx
        <EventUpdatesModal
          eventId={updatesTarget?.id ?? null}
          eventTitle={updatesTarget?.title ?? ""}
          open={!!updatesTarget}
          onClose={() => setUpdatesTarget(null)}
        />
```

- [ ] **Step 3: Typecheck + lint (touched files).**

Run: `npx tsc --noEmit`
Run: `npx eslint src/components/admin/EventUpdatesModal.tsx src/app/admin/events/page.tsx`
Expected: clean (no errors in these files). Note: a repo-wide `npm run lint` currently reports pre-existing errors in `src/app/page.tsx` (a user-edited file) — ignore those; keep YOUR files clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/admin/EventUpdatesModal.tsx src/app/admin/events/page.tsx
git commit -m "feat(events): admin per-event updates modal"
```

---

## Task 6: User Updates tab on the detail page

**Files:** Modify `src/app/events/[id]/page.tsx`.

- [ ] **Step 1: Extend the Tab union.** Change `type Tab = "overview" | "format" | "prizes" | "schedule";` to:
```ts
type Tab = "overview" | "format" | "prizes" | "schedule" | "updates";
```

- [ ] **Step 2: Add a derived const** near the other derived values (e.g. after `scheduleRows`):
```tsx
  const updates = event.updates ?? [];
```

- [ ] **Step 3: Add the TabButton.** In the tab row (after the `schedule` `TabButton`), add:
```tsx
                    <TabButton id="updates"  active={tab} onClick={setTab} label="Updates"  count={updates.length} />
```

- [ ] **Step 4: Render the Updates tab.** After the `{tab === "schedule" && ( … )}` block, add:
```tsx
                {tab === "updates" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {updates.length === 0 && (
                      <div style={cardStyle}>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>No updates yet.</p>
                      </div>
                    )}
                    {updates.map((u) => (
                      <Reveal key={u.id}>
                        <div style={{ ...cardStyle, borderColor: u.pinned ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.06)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            {u.pinned && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pinned</span>}
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                              {new Date(u.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          {u.title && <h4 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{u.title}</h4>}
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{u.body}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}
```
(`cardStyle` and `Reveal` already exist in this file from Slice 1.)

- [ ] **Step 5: Typecheck + build.**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; build succeeds.

- [ ] **Step 6: Commit.**

```bash
git add "src/app/events/[id]/page.tsx"
git commit -m "feat(events): Updates tab on the event detail page"
```

---

## Task 7: Full verification

- [ ] **Step 1: Unit tests.** Run: `npm test` — all pass (incl. the new `eventUpdates` tests).
- [ ] **Step 2: Static gates.** Run: `npx tsc --noEmit && npm run build` — clean. (For lint, run the targeted `npx eslint` on the slice's files; the repo-wide lint has pre-existing errors in the user's `src/app/page.tsx`.)
- [ ] **Step 3: Runtime smoke** (use the `PrismaPg`-adapter script pattern from `src/lib/prisma.ts`; run from repo root; `dotenv config({quiet:true})`):
  1. Seed a published event; insert two `EventUpdate` rows (one `pinned:true` older, one `pinned:false` newer).
  2. `GET /api/events/<id>` → confirm `updates` is present and ordered **pinned-first then newest** (the pinned older one is index 0).
  3. Create a third update via `apply`-style direct `prisma.eventUpdate.create`, then delete one via `prisma.eventUpdate.deleteMany({ where: { id, eventId } })` — confirm counts.
  4. Confirm deleting the event cascades (after `prisma.sportEvent.delete`, `prisma.eventUpdate.count({ where: { eventId } })` is 0).
  5. Delete seeded rows / event.
- [ ] **Step 4: Manual UI check** (optional, needs admin auth): `/admin/events` → Megaphone on a card → post a pinned update + a normal one + delete one; then open `/events/<id>` → Updates tab shows the count + pinned-first list.
- [ ] **Step 5: Commit any smoke fix.** `git add -A && git commit -m "fix(events): slice 4 smoke-test adjustments"` (only if needed).

---

## Notes for the implementer
- **Reuse:** `AdminModal`/`FormInput`/`FormTextarea` for the modal; `cardStyle`/`Reveal` already in the detail page; `sortEventUpdates` is the single ordering source (used by both the public GET and the admin route).
- **YAGNI:** no edit action (delete + repost), no notifications, no read-tracking.
- **Cascade:** `EventUpdate.onDelete: Cascade` means the admin event DELETE needs no change — updates clean up automatically.
- **Ordering authority:** the API returns updates already ordered; the UI renders the array as-is (don't re-sort in the component).
