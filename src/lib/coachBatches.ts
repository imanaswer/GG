// Pure batch normalize/diff helpers used by the admin coaches API.
// No DB, no React — unit-tested in coachBatches.test.ts.

export type NormalizedBatch = {
  id?: string;
  day: string;
  time: string;
  level: string;
  seats: number;
};

export class BatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchValidationError";
  }
}

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
