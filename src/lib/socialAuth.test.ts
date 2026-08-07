import { describe, it, expect } from "vitest";
import { isNewAccount, NEW_ACCOUNT_WINDOW_MS } from "./socialAuth";

/**
 * isNew decides whether the app routes a social sign-in into account setup or
 * straight to Home, so both directions matter: a false positive sends an
 * established user back through setup, a false negative is the reported bug —
 * a first-ever Google user landing on Home and never being offered setup.
 */
describe("isNewAccount", () => {
  const ago = (ms: number) => new Date(Date.now() - ms);

  it("says yes to a row created by the sign-in in progress", () => {
    expect(isNewAccount(new Date())).toBe(true);
    expect(isNewAccount(ago(5_000))).toBe(true);
  });

  it("covers the whole handoff-code lifetime with room to spare", () => {
    // The code TTL is 90s (mobileHandoff.ts). A user who takes the full window
    // to finish the browser hop must still read as new when they come back.
    expect(isNewAccount(ago(90_000))).toBe(true);
    expect(NEW_ACCOUNT_WINDOW_MS).toBeGreaterThan(90_000);
  });

  it("says no to an established account", () => {
    expect(isNewAccount(ago(NEW_ACCOUNT_WINDOW_MS + 1_000))).toBe(false);
    expect(isNewAccount(ago(86_400_000))).toBe(false);
  });

  it("is inclusive of nothing beyond the window — the boundary is exact", () => {
    expect(isNewAccount(ago(NEW_ACCOUNT_WINDOW_MS - 500))).toBe(true);
    expect(isNewAccount(ago(NEW_ACCOUNT_WINDOW_MS))).toBe(false);
  });
});
