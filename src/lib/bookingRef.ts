/**
 * Short reference an admin can read out loud: the tail of the cuid, upper-cased.
 * Display only — the stored id is untouched, and because the code is a *suffix*
 * of that id the `id contains q` search still finds the row, provided the "GG-"
 * prefix is stripped from the query first (searchTerm below).
 *
 * One namespace across all five admin categories (coach bookings, play sessions,
 * workshop/camp/event registrations) — the code is only ever read inside a
 * category tab, which is what disambiguates it.
 *
 * ponytail: 6 chars, so two rows — even in different tables — can share a code.
 * That costs a search an extra hit; a code unique on its own means a column and
 * a sequence per table.
 */
export function bookingRef(id: string): string {
  return `GG-${id.slice(-6).toUpperCase()}`;
}

/** Normalises an admin's search box input: a pasted GG- code matches the id. */
export function searchTerm(q: string): string {
  return q.trim().replace(/^gg-/i, "");
}
