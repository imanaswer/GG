// Shared Google Maps link builder. Used wherever a venue/coach location is
// shown so players can tap straight through to directions. Prefers precise
// coordinates; falls back to the free-text address. No API key required — the
// Maps URL scheme works for everyone.

export type MapTarget = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  location?: string | null;
};

/** A Google Maps search URL pointing at the location (coords if known, else text). */
export function mapsHref(loc: MapTarget): string {
  const query =
    loc.lat != null && loc.lng != null
      ? `${loc.lat},${loc.lng}`
      : [loc.location, loc.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Whether there's enough information to build a meaningful maps link. */
export function hasMapTarget(loc: MapTarget): boolean {
  return (loc.lat != null && loc.lng != null) || !!(loc.location || loc.address);
}
