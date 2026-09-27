import type { Prisma } from "@prisma/client";

/**
 * The public shape of a coach: everything a listing or profile page renders,
 * minus contact details and the account link. `email`, `phone` and `userId`
 * are for the coach, an admin, or a player who has a booking with them — never
 * for an anonymous, CDN-cached list. (`Coach.email` was also the key that let
 * strangers read a coach's bookings, so it must not be harvestable.)
 */
export const COACH_PUBLIC_SELECT = {
  id: true, name: true, sport: true, type: true, skillLevel: true,
  price: true, priceMin: true, priceMax: true, timing: true,
  location: true, address: true, description: true,
  features: true, certifications: true,
  imageUrl: true, coverImageUrl: true, photos: true,
  rating: true, reviewCount: true, totalSeats: true, seatsLeft: true,
  status: true, lat: true, lng: true, createdAt: true, updatedAt: true,
} satisfies Prisma.CoachSelect;

/** Neutralise spreadsheet formula injection: a cell that starts with = + - @ or a tab/CR is prefixed. */
export function csvSafe(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}
