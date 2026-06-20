/**
 * Resolve the canonical site origin from NEXT_PUBLIC_APP_URL, tolerating a value
 * that omits the scheme (e.g. "www.gameground.net") or has a trailing slash.
 * Always returns an absolute origin like "https://www.gameground.net" with no
 * trailing slash — safe to pass to `new URL()`.
 */
export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gameground.net").trim();
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}
