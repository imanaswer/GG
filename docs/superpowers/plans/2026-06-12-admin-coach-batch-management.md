# Admin Coach Batch Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins create, edit, and delete a coach's batches inline in the Add/Edit Coach modal, with the API persisting them and deriving coach seat totals from them.

**Architecture:** A new pure, unit-tested helper (`src/lib/coachBatches.ts`) normalizes and diffs batch rows. The admin coaches API (`/api/admin/coaches`) POST creates nested batches and PUT reconciles them inside a transaction (detaching bookings before deleting a batch). The admin coaches page gains an inline repeatable "Batches" editor. No schema change — the `Batch` model already exists. Public coach page and booking flow are already batch-aware and need no changes.

**Tech Stack:** Next.js 16, TypeScript, Prisma, React, @tanstack/react-query, Vitest.

---

## File Structure

- **Create** `src/lib/coachBatches.ts` — pure batch normalize/diff/sum logic (no DB, no React).
- **Create** `src/lib/coachBatches.test.ts` — vitest unit tests for the above.
- **Modify** `src/app/api/admin/coaches/route.ts` — POST + PUT persist batches; derive coach seats.
- **Modify** `src/app/admin/coaches/page.tsx` — inline batch editor in the Add/Edit modal; derived-seats display; batch count in the table.

---

## Task 1: Pure batch logic helper (`coachBatches.ts`)

**Files:**
- Create: `src/lib/coachBatches.ts`
- Test: `src/lib/coachBatches.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/coachBatches.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeBatches,
  reconcileBatches,
  sumSeats,
  BatchValidationError,
} from "./coachBatches";

describe("normalizeBatches", () => {
  it("returns [] for null/undefined", () => {
    expect(normalizeBatches(undefined)).toEqual([]);
    expect(normalizeBatches(null)).toEqual([]);
  });

  it("throws when not an array", () => {
    expect(() => normalizeBatches({})).toThrow(BatchValidationError);
  });

  it("trims strings, defaults level, coerces and floors seats", () => {
    expect(
      normalizeBatches([{ day: " Mon ", time: " 6 AM ", level: "", seats: "8.9" }]),
    ).toEqual([{ day: "Mon", time: "6 AM", level: "All Levels", seats: 8 }]);
  });

  it("keeps an existing id when present", () => {
    expect(
      normalizeBatches([{ id: "b1", day: "Mon", time: "6 AM", level: "Beginner", seats: 5 }]),
    ).toEqual([{ id: "b1", day: "Mon", time: "6 AM", level: "Beginner", seats: 5 }]);
  });

  it("drops fully-empty rows", () => {
    expect(normalizeBatches([{ day: "", time: "", level: "All Levels", seats: 0 }])).toEqual([]);
    expect(normalizeBatches([{ day: "", time: "", seats: "" }])).toEqual([]);
  });

  it("requires day and time on a non-empty row", () => {
    expect(() => normalizeBatches([{ day: "", time: "6 AM", seats: 5 }])).toThrow(BatchValidationError);
    expect(() => normalizeBatches([{ day: "Mon", time: "", seats: 5 }])).toThrow(BatchValidationError);
  });

  it("rejects negative or non-numeric seats", () => {
    expect(() => normalizeBatches([{ day: "Mon", time: "6 AM", seats: -1 }])).toThrow(BatchValidationError);
    expect(() => normalizeBatches([{ day: "Mon", time: "6 AM", seats: "abc" }])).toThrow(BatchValidationError);
  });
});

describe("sumSeats", () => {
  it("sums seats and handles empty", () => {
    expect(sumSeats([])).toBe(0);
    expect(sumSeats([{ seats: 3 }, { seats: 7 }])).toBe(10);
  });
});

describe("reconcileBatches", () => {
  it("classifies create / update / delete", () => {
    const existingIds = ["a", "b", "c"];
    const incoming = normalizeBatches([
      { id: "a", day: "Mon", time: "6 AM", level: "Beginner", seats: 5 }, // update
      { day: "Tue", time: "7 AM", level: "All Levels", seats: 4 }, // create
    ]);
    const r = reconcileBatches(existingIds, incoming);
    expect(r.toUpdate.map(b => b.id)).toEqual(["a"]);
    expect(r.toCreate.map(b => b.day)).toEqual(["Tue"]);
    expect(r.toDeleteIds.sort()).toEqual(["b", "c"]);
  });

  it("empty incoming deletes everything", () => {
    const r = reconcileBatches(["a", "b"], []);
    expect(r.toCreate).toEqual([]);
    expect(r.toUpdate).toEqual([]);
    expect(r.toDeleteIds.sort()).toEqual(["a", "b"]);
  });

  it("ignores an incoming id that does not exist (stale)", () => {
    const incoming = normalizeBatches([{ id: "zzz", day: "Mon", time: "6 AM", seats: 5 }]);
    const r = reconcileBatches(["a"], incoming);
    expect(r.toUpdate).toEqual([]);
    expect(r.toDeleteIds).toEqual(["a"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/coachBatches.test.ts`
Expected: FAIL — cannot find module `./coachBatches`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/coachBatches.ts`:

```ts
// Pure batch normalize/diff helpers used by the admin coaches API.
// No DB, no React — unit-tested in coachBatches.test.ts.

export type NormalizedBatch = {
  id?: string;
  day: string;
  time: string;
  level: string;
  seats: number;
};

export class BatchValidationError extends Error {}

// Coerce + validate raw batch rows from the admin form.
// - trims strings; defaults level to "All Levels"
// - drops rows that are entirely empty (no day, no time, seats 0/blank)
// - requires day and time on any non-empty row
// - coerces seats via Number, floors it; rejects NaN or negative
export function normalizeBatches(input: unknown): NormalizedBatch[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new BatchValidationError("batches must be an array");

  const out: NormalizedBatch[] = [];
  for (const raw of input) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const day = typeof r.day === "string" ? r.day.trim() : "";
    const time = typeof r.time === "string" ? r.time.trim() : "";
    const level = typeof r.level === "string" && r.level.trim() ? r.level.trim() : "All Levels";
    const seatsRaw = r.seats;

    const seatsBlank = seatsRaw === undefined || seatsRaw === null || seatsRaw === "";
    const isEmpty = !day && !time && (seatsBlank || Number(seatsRaw) === 0);
    if (isEmpty) continue;

    if (!day) throw new BatchValidationError("batch day is required");
    if (!time) throw new BatchValidationError("batch time is required");

    const seats = Number(seatsRaw);
    if (!Number.isFinite(seats) || seats < 0) {
      throw new BatchValidationError("batch seats must be a non-negative number");
    }

    const id = typeof r.id === "string" && r.id ? r.id : undefined;
    out.push({ ...(id ? { id } : {}), day, time, level, seats: Math.floor(seats) });
  }
  return out;
}

export function sumSeats(batches: { seats: number }[]): number {
  return batches.reduce((a, b) => a + (Number(b.seats) || 0), 0);
}

export type BatchReconcile = {
  toCreate: NormalizedBatch[];
  toUpdate: (NormalizedBatch & { id: string })[];
  toDeleteIds: string[];
};

// Diff incoming normalized batches against the ids currently stored for a coach.
// Rows with no id -> create. Rows whose id exists -> update. Stored ids not in
// the incoming set -> delete. An incoming id that is not in existingIds is stale
// and silently ignored (neither created nor updated).
export function reconcileBatches(existingIds: string[], incoming: NormalizedBatch[]): BatchReconcile {
  const incomingIds = new Set(incoming.filter(b => b.id).map(b => b.id as string));
  const toCreate = incoming.filter(b => !b.id);
  const toUpdate = incoming.filter(
    (b): b is NormalizedBatch & { id: string } => !!b.id && existingIds.includes(b.id),
  );
  const toDeleteIds = existingIds.filter(id => !incomingIds.has(id));
  return { toCreate, toUpdate, toDeleteIds };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/coachBatches.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachBatches.ts src/lib/coachBatches.test.ts
git commit -m "feat(coach): pure batch normalize/diff helpers"
```

---

## Task 2: Persist batches in the admin coaches API

**Files:**
- Modify: `src/app/api/admin/coaches/route.ts`

- [ ] **Step 1: Add the import**

At the top of `src/app/api/admin/coaches/route.ts`, below the existing imports (after the `BILLABLE_STATUSES` import on line 5), add:

```ts
import { normalizeBatches, reconcileBatches, sumSeats, BatchValidationError } from "@/lib/coachBatches";
```

- [ ] **Step 2: Rewrite POST to create nested batches and derive seats**

Replace the entire `POST` function (currently lines 32–61) with:

```ts
export async function POST(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let batches;
  try {
    batches = normalizeBatches(body.batches);
  } catch (e) {
    return NextResponse.json({ error: e instanceof BatchValidationError ? e.message : "Invalid batches" }, { status: 400 });
  }

  const manualTotal = Number.isFinite(Number(body.totalSeats)) ? Number(body.totalSeats) : 20;
  const manualLeft = Number.isFinite(Number(body.seatsLeft ?? body.totalSeats)) ? Number(body.seatsLeft ?? body.totalSeats) : 20;
  const totalSeats = batches.length ? sumSeats(batches) : manualTotal;
  const seatsLeft = batches.length ? totalSeats : manualLeft;

  const coach = await prisma.coach.create({
    data: {
      name: body.name,
      sport: body.sport,
      type: body.type,
      skillLevel: body.skillLevel || "All Levels",
      price: formatPrice(body.priceMin, body.priceMax),
      priceMin: Number(body.priceMin) || 0,
      priceMax: Number(body.priceMax) || 0,
      timing: body.timing || "",
      location: body.location || "",
      address: body.address || "",
      phone: body.phone || "",
      email: body.email || "",
      description: body.description || "",
      features: body.features || [],
      certifications: body.certifications || [],
      imageUrl: body.imageUrl || "/placeholder-coach.jpg",
      coverImageUrl: body.coverImageUrl || "",
      photos: Array.isArray(body.photos) ? body.photos : [],
      totalSeats,
      seatsLeft,
      status: body.status || "active",
      batches: { create: batches.map(b => ({ day: b.day, time: b.time, level: b.level, seats: b.seats })) },
    },
  });
  return NextResponse.json({ coach }, { status: 201 });
}
```

- [ ] **Step 3: Rewrite PUT to reconcile batches in a transaction**

Replace the entire `PUT` function (currently lines 63–94) with:

```ts
export async function PUT(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing coach id" }, { status: 400 });
  const id = body.id as string;

  const hasBatchField = body.batches !== undefined;
  let batches: ReturnType<typeof normalizeBatches> = [];
  if (hasBatchField) {
    try {
      batches = normalizeBatches(body.batches);
    } catch (e) {
      return NextResponse.json({ error: e instanceof BatchValidationError ? e.message : "Invalid batches" }, { status: 400 });
    }
  }

  const coach = await prisma.$transaction(async (tx) => {
    let seatOverride: { totalSeats: number; seatsLeft: number } | object = {};
    if (hasBatchField) {
      const existing = await tx.batch.findMany({ where: { coachId: id }, select: { id: true } });
      const { toCreate, toUpdate, toDeleteIds } = reconcileBatches(existing.map(b => b.id), batches);

      if (toDeleteIds.length) {
        // Bookings keep their coach; only the batch link is removed (batchId is nullable).
        await tx.booking.updateMany({ where: { batchId: { in: toDeleteIds } }, data: { batchId: null } });
        await tx.batch.deleteMany({ where: { id: { in: toDeleteIds } } });
      }
      for (const b of toUpdate) {
        await tx.batch.update({ where: { id: b.id }, data: { day: b.day, time: b.time, level: b.level, seats: b.seats } });
      }
      if (toCreate.length) {
        await tx.batch.createMany({ data: toCreate.map(b => ({ coachId: id, day: b.day, time: b.time, level: b.level, seats: b.seats })) });
      }
      if (batches.length) {
        const total = sumSeats(batches);
        seatOverride = { totalSeats: total, seatsLeft: total };
      }
    }

    return tx.coach.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sport !== undefined && { sport: body.sport }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.skillLevel !== undefined && { skillLevel: body.skillLevel }),
        ...(body.priceMin !== undefined && { priceMin: Number(body.priceMin) }),
        ...(body.priceMax !== undefined && { priceMax: Number(body.priceMax) }),
        ...((body.priceMin !== undefined && body.priceMax !== undefined) && { price: formatPrice(body.priceMin, body.priceMax) }),
        ...(body.timing !== undefined && { timing: body.timing }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.certifications !== undefined && { certifications: body.certifications }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.coverImageUrl !== undefined && { coverImageUrl: body.coverImageUrl }),
        ...(body.photos !== undefined && { photos: Array.isArray(body.photos) ? body.photos : [] }),
        ...(body.totalSeats !== undefined && { totalSeats: Number(body.totalSeats) }),
        ...(body.seatsLeft !== undefined && { seatsLeft: Number(body.seatsLeft) }),
        ...(body.status !== undefined && { status: body.status }),
        ...seatOverride, // when batches exist, this wins over any manual totalSeats/seatsLeft above
      },
    });
  });
  return NextResponse.json({ coach });
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/coaches/route.ts
git commit -m "feat(admin): persist and reconcile coach batches in coaches API"
```

---

## Task 3: Inline batch editor in the admin coaches modal

**Files:**
- Modify: `src/app/admin/coaches/page.tsx`

- [ ] **Step 1: Add a `BatchRow` type and extend `Coach` + `EMPTY`**

In `src/app/admin/coaches/page.tsx`, directly above the `type Coach = {` declaration (line 14), add:

```ts
type BatchRow = { id?: string; day: string; time: string; level: string; seats: number };
```

Then add `batches` to the `Coach` type — change the last line of the `Coach` type (currently `status: string; totalBookings: number; confirmedBookings: number; revenue: number;`) to:

```ts
  status: string; totalBookings: number; confirmedBookings: number; revenue: number;
  batches?: BatchRow[];
```

Then add `batches` to `EMPTY` — change its last line (currently `totalSeats: 20, seatsLeft: 20, status: "active",`) to:

```ts
  totalSeats: 20, seatsLeft: 20, status: "active", batches: [],
```

- [ ] **Step 2: Add batch editor helpers inside the component**

In `src/app/admin/coaches/page.tsx`, immediately after the `update` helper (currently line 82: `const update = <K extends keyof Coach>(key: K, val: Coach[K]) => setForm(f => ({ ...f, [key]: val }));`), add:

```ts
  const batches = form.batches ?? [];
  const addBatch = () => update("batches", [...batches, { day: "", time: "", level: "All Levels", seats: 10 }] as never);
  const rmBatch = (i: number) => update("batches", batches.filter((_, j) => j !== i) as never);
  const setBatch = (i: number, key: keyof BatchRow, val: string | number) =>
    update("batches", batches.map((b, j) => (j === i ? { ...b, [key]: val } : b)) as never);
```

- [ ] **Step 3: Replace the Total/Seats-Left row with a batch-aware version**

Replace the existing seats `FormRow` (currently lines 199–202):

```tsx
            <FormRow>
              <FormInput label="Total Seats" value={form.totalSeats ?? 20} onChange={v => update("totalSeats", Number(v) as never)} type="number" />
              <FormInput label="Seats Left" value={form.seatsLeft ?? 20} onChange={v => update("seatsLeft", Number(v) as never)} type="number" />
            </FormRow>
```

with:

```tsx
            {batches.length > 0 ? (
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                Total seats derived from batches:{" "}
                <strong style={{ color: "#fff" }}>{batches.reduce((a, b) => a + (Number(b.seats) || 0), 0)}</strong>
              </p>
            ) : (
              <FormRow>
                <FormInput label="Total Seats" value={form.totalSeats ?? 20} onChange={v => update("totalSeats", Number(v) as never)} type="number" />
                <FormInput label="Seats Left" value={form.seatsLeft ?? 20} onChange={v => update("seatsLeft", Number(v) as never)} type="number" />
              </FormRow>
            )}
```

- [ ] **Step 4: Add the Batches editor section before the error/actions**

In the same modal `<form>`, insert this block immediately **before** the `{error && ...}` line (currently line 209):

```tsx
            <div style={{ margin: "14px 0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>Batches</label>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{batches.length} batch{batches.length === 1 ? "" : "es"}</span>
              </div>
              {batches.length === 0 && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>No batches yet. Add the schedule slots students can see and join.</p>
              )}
              {batches.map((b, i) => (
                <div key={b.id ?? i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Batch {i + 1}</span>
                    <button type="button" onClick={() => rmBatch(i)} style={iconBtn} title="Remove batch"><Trash2 size={14} color="#f87171" /></button>
                  </div>
                  <FormRow>
                    <FormInput label="Day(s)" value={b.day} onChange={v => setBatch(i, "day", v)} placeholder="Mon–Wed–Fri" />
                    <FormInput label="Time" value={b.time} onChange={v => setBatch(i, "time", v)} placeholder="6:00–8:00 AM" />
                  </FormRow>
                  <FormRow>
                    <FormSelect label="Level" value={b.level} onChange={v => setBatch(i, "level", v)} options={SKILL_LEVELS.map(l => ({ value: l, label: l }))} />
                    <FormInput label="Seats" value={b.seats} onChange={v => setBatch(i, "seats", Number(v))} type="number" />
                  </FormRow>
                </div>
              ))}
              <button type="button" onClick={addBatch} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", color: "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={14} /> Add batch
              </button>
            </div>
```

(`SKILL_LEVELS`, `FormRow`, `FormSelect`, `FormInput`, `Plus`, `Trash2`, and `iconBtn` are all already imported / defined in this file.)

- [ ] **Step 5: Show a batch count in the coaches table Seats cell**

In the Seats `<td>` (currently lines 151–156), add a small batch-count line. Replace:

```tsx
                        <td style={td}>
                          <div style={{ fontSize: 12, marginBottom: 3 }}>{c.seatsLeft}/{c.totalSeats}</div>
                          <div style={{ height: 3, background: "#1c1c1c", borderRadius: 99, width: 60, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                          </div>
                        </td>
```

with:

```tsx
                        <td style={td}>
                          <div style={{ fontSize: 12, marginBottom: 3 }}>{c.seatsLeft}/{c.totalSeats}</div>
                          <div style={{ height: 3, background: "#1c1c1c", borderRadius: 99, width: 60, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                          </div>
                          {!!c.batches?.length && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{c.batches.length} batch{c.batches.length === 1 ? "" : "es"}</div>}
                        </td>
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; lint shows 0 errors (pre-existing cosmetic warnings are acceptable).

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/coaches/page.tsx
git commit -m "feat(admin): inline batch editor in coach add/edit modal"
```

---

## Task 4: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm run test`
Expected: all suites pass, including the new `coachBatches` tests (prior count was 71 passed / 11 files — expect more now).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build completes successfully (Next 16).

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Manual smoke test (optional but recommended)**

Run: `npm run dev`, log in to `/admin/coaches`. Add a coach with two batches; confirm Total Seats becomes read-only and equals the batch-seat sum. Save, reopen Edit, change one batch's seats, remove the other, save. Open the public `/coach/[id]` page in a new tab and confirm the Batches tab reflects the changes. (Authed admin routes may 500 locally if Upstash/rate-limit env is unset — intercept those APIs in the browser if needed.)

---

## Notes for the implementer

- **Do not** modify the public coach page (`src/app/coach/[id]/page.tsx`) or the booking route (`src/app/api/bookings/route.ts`) — they already read `coach.batches` and decrement `Batch.seats`, so they reflect admin changes automatically.
- The `save` mutation in `page.tsx` already serializes the whole form (`JSON.stringify({ ...data, price })`), so `batches` is sent to the API without any change to the mutation itself. Likewise `openEdit` already does `setForm({ ...c })`, loading the coach's batches from the GET response into the form.
- `Booking.batchId` is nullable (`schema.prisma:220`), which is why detaching bookings before deleting a batch is safe and avoids a foreign-key error.
