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

// Identities reserved for the built-in demo player account, which is always
// routed to the in-memory mock DB (see prisma.ts resolveClient). Real users
// must not be able to register these, or they'd be silently routed to mock
// data with their real records invisible and writes lost.
export const DEMO_EMAIL = "test@gameground.net";
export const DEMO_USERNAME = "testplayer";

export function isReservedDemoIdentity(email?: string, username?: string): boolean {
  return (
    (!!email && email.trim().toLowerCase() === DEMO_EMAIL) ||
    (!!username && username.trim().toLowerCase() === DEMO_USERNAME)
  );
}
