// Mobile kill switch. The one lever that still works when the bug is in the
// shipped bundle: set MIN_MOBILE_VERSION in Vercel and redeploy, and every app
// build below it gets a 426 that routes to a no-dismiss upgrade wall.
//
// Two properties matter more than anything this file does positively:
//   1. Unset or unparseable MIN_MOBILE_VERSION is a NO-OP. A malformed env var
//      must never lock every user out of the product.
//   2. A request with no (or an unreadable) X-App-Version passes. That is every
//      web browser, every uptime monitor, and curl.
// Both fail open, deliberately. The gate exists to stop a known-bad release,
// not to enforce that callers identify themselves.

export const APP_VERSION_HEADER = "x-app-version";

/** Parse a dotted numeric version. Returns null for anything not "1", "1.2", "1.2.3"… */
function parts(v: string | null | undefined): number[] | null {
  const trimmed = v?.trim();
  if (!trimmed) return null;
  const segs = trimmed.split(".");
  const nums = segs.map((s) => (/^\d+$/.test(s) ? Number(s) : NaN));
  return nums.some(Number.isNaN) ? null : nums;
}

/**
 * True when `actual` is strictly older than `minimum` — i.e. the caller must upgrade.
 * Compared segment-by-segment as INTEGERS: "1.10.0" is newer than "1.9.0", which a
 * string compare gets backwards. Missing segments count as 0, so "1.2" == "1.2.0".
 */
export function isBelowMinimum(actual: string | null | undefined, minimum: string | null | undefined): boolean {
  const min = parts(minimum);
  if (!min) return false;        // not configured / malformed → gate is off
  const cur = parts(actual);
  if (!cur) return false;        // not a versioned client (browser, monitor) → pass

  for (let i = 0; i < Math.max(cur.length, min.length); i++) {
    const a = cur[i] ?? 0, b = min[i] ?? 0;
    if (a !== b) return a < b;
  }
  return false;                  // equal → allowed
}
