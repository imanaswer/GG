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

export type Coords = { lat: number; lng: number };

/**
 * Great-circle (haversine) distance in km, or null when the target has no
 * coordinates. ponytail: straight-line, not road distance — good enough to rank
 * "near me"; swap in a routing API only if riders complain about the ordering.
 */
export function distanceKm(from: Coords, to: MapTarget): number | null {
  if (to.lat == null || to.lng == null) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLng = (to.lng - from.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Nearest first. Entries without coordinates sink to the bottom (never NaN —
 * a NaN comparator silently scrambles the caller's existing order), and the
 * incoming order is otherwise preserved because Array#sort is stable.
 */
export function sortByDistance<T extends MapTarget>(items: T[], from: Coords | null): T[] {
  if (!from) return items;
  return [...items].sort((a, b) => {
    const da = distanceKm(from, a), db = distanceKm(from, b);
    if (da == null) return db == null ? 0 : 1;
    if (db == null) return -1;
    return da - db;
  });
}

/** Short human distance: "450 m" under a km, "2.4 km" above. */
export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
