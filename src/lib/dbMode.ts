// Side-effect-free DB-mode helpers. Kept separate from prisma.ts so the
// admin auth route (and anything else) can gate on demo mode without importing
// the Prisma module and triggering its connection-pool / mock-client side effects.

export function isPlaceholderUrl(url: string): boolean {
  return (
    url.includes("placeholder") ||
    url.includes("password@localhost") ||
    url.includes("example") ||
    url === ""
  );
}

// "Demo mode" = no real database is configured, so the app runs against the
// in-memory mock DB. Used to scope the demo/test admin login to this mode only.
export function isDemoMode(): boolean {
  return isPlaceholderUrl(process.env.DATABASE_URL ?? "");
}
