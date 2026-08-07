// Player-hosted games are paid host-to-player, outside Game Ground. GG is a
// discovery and coordination platform here, not the merchant: it never collects,
// holds, refunds or settles this money, and no Razorpay order exists for a game.
//
// Pure module — no DB, no I/O — so the API, the create form, the game card and
// the detail page all render the same rules from one place.

export const HOST_PAYMENT_METHODS = ["upi", "cash", "upi_cash"] as const;
export type HostPaymentMethod = (typeof HOST_PAYMENT_METHODS)[number];

export const HOST_PAYMENT_METHOD_LABELS: Record<HostPaymentMethod, string> = {
  upi: "UPI",
  cash: "Cash",
  upi_cash: "UPI + Cash",
};

/** Shown wherever a player-hosted game's fee appears. */
export const HOST_PAYMENT_DISCLAIMER =
  "Game Ground does not process payments for player-hosted games.";

/** Shown when the host is collecting on behalf of a venue or organization. */
export const VENUE_PAYMENT_DISCLAIMER =
  "The host is responsible for paying the venue/organization. Game Ground is not involved in this transaction.";

export function isHostPaymentMethod(v: unknown): v is HostPaymentMethod {
  return typeof v === "string" && (HOST_PAYMENT_METHODS as readonly string[]).includes(v);
}

/** UPI details are only meaningful for methods that actually accept UPI. */
export function acceptsUpi(method: string | null | undefined): boolean {
  return method === "upi" || method === "upi_cash";
}

export type HostPaymentSource = {
  costAmount: number;
  currency?: string | null;
  paymentMethod?: string | null;
  hostUpiId?: string | null;
  hostQrUrl?: string | null;
  paymentNote?: string | null;
  venueNote?: string | null;
};

export type HostPayment = {
  amount: number;
  currency: string;
  method: HostPaymentMethod;
  methodLabel: string;
  upiId: string | null;
  qrUrl: string | null;
  instructions: string | null;
  venueNote: string | null;
  disclaimer: string;
};

/**
 * The payment block for a game, or null when the game is free (nothing to pay,
 * so no payment section and no disclaimer).
 *
 * Falls back to "upi_cash" for paid games created before the method picker
 * existed, and drops UPI details for cash-only games so a stale UPI id from an
 * earlier edit can't be shown as the way to pay.
 */
export function hostPayment(game: HostPaymentSource): HostPayment | null {
  if (!game.costAmount || game.costAmount <= 0) return null;

  const method: HostPaymentMethod = isHostPaymentMethod(game.paymentMethod)
    ? game.paymentMethod
    : "upi_cash";
  const upi = acceptsUpi(method);

  return {
    amount: game.costAmount,
    currency: game.currency || "INR",
    method,
    methodLabel: HOST_PAYMENT_METHOD_LABELS[method],
    upiId: upi ? game.hostUpiId?.trim() || null : null,
    qrUrl: upi ? game.hostQrUrl?.trim() || null : null,
    instructions: game.paymentNote?.trim() || null,
    venueNote: game.venueNote?.trim() || null,
    disclaimer: HOST_PAYMENT_DISCLAIMER,
  };
}

/** "₹125 / player", or "Free". The one place this string is built. */
export function feeLabel(costAmount: number, currency = "INR"): string {
  if (!costAmount || costAmount <= 0) return "Free";
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${costAmount} / player`;
}

// A UPI id is `handle@psp`. Deliberately permissive on the handle (banks allow
// dots, hyphens and underscores) and strict only about the shape, because
// rejecting a valid id is worse than accepting a typo the host can see and fix.
const UPI_ID = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}$/;

export function isValidUpiId(v: string): boolean {
  return UPI_ID.test(v.trim());
}
