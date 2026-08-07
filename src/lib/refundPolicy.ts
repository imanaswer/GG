import { CANCEL_CUTOFF_MIN } from "@/lib/gameTime";

// The refund terms actually in force, in one place, so the app, the website and
// the published policy page cannot say three different things.
//
// The app previously hardcoded "Full refund if the organizer cancels. Player
// cancellations follow the cutoff shown at checkout." Neither half was true, so
// the card was removed. Everything below describes what the code does — if a
// rule changes, this file changes with it and both clients follow.

export type RefundableEntity = "game" | "camp" | "workshop" | "event" | "coach";

const CUTOFF = `${CANCEL_CUTOFF_MIN} minutes`;

/**
 * Player-hosted games: Game Ground is not the merchant. It never collects the
 * entry fee, so it has nothing to refund and cannot arbitrate one.
 */
const GAME_POLICY =
  `Game Ground does not process payments for player-hosted games. The entry fee is paid ` +
  `directly to the host, so any refund is arranged between you and the host — Game Ground ` +
  `cannot issue, hold or reverse it. You can leave a game up to ${CUTOFF} before the start ` +
  `time, which frees your spot for the next player waiting.`;

/**
 * Everything Game Ground actually sells. Cancelling raises a refund for the team
 * to process; it is not automatic, and it is not instant.
 */
const MERCHANT_POLICY =
  `Cancel up to ${CUTOFF} before the start time and your payment is marked for refund. ` +
  `Refunds are reviewed and returned to the original payment method by the Game Ground team, ` +
  `usually within 5–7 working days. Cancellations inside the final ${CUTOFF} are not accepted ` +
  `and are not refundable. If Game Ground or the organiser cancels, contact support and your ` +
  `payment will be refunded in full.`;

const POLICIES: Record<RefundableEntity, string> = {
  game: GAME_POLICY,
  camp: MERCHANT_POLICY,
  workshop: MERCHANT_POLICY,
  event: MERCHANT_POLICY,
  coach: MERCHANT_POLICY,
};

/**
 * The policy in force for an entity. Free items return null — there is no
 * payment, so a refund section would be noise. Clients render the card only when
 * this is non-null.
 */
export function refundPolicy(entity: RefundableEntity, price: number): string | null {
  if (!price || price <= 0) return null;
  return POLICIES[entity];
}

/** Sections for the published policy page Razorpay requires before going live. */
export const REFUND_POLICY_SECTIONS = [
  { title: "Player-hosted games", body: GAME_POLICY },
  { title: "Camps, workshops, events and coaching", body: MERCHANT_POLICY },
  {
    title: "How to cancel",
    body:
      `Open the booking from your profile and choose Cancel. The seat is released ` +
      `immediately and, where a refund applies, the payment is flagged for our team the ` +
      `moment you cancel — you do not need to email anyone to start it.`,
  },
  {
    title: "Contact",
    body: "Questions about a refund: reach us through the contact page and quote the payment reference from your confirmation email.",
  },
] as const;
