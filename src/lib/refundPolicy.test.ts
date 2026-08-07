import { describe, it, expect } from "vitest";
import { refundPolicy, REFUND_POLICY_SECTIONS } from "./refundPolicy";
import { CANCEL_CUTOFF_MIN } from "./gameTime";

describe("refundPolicy", () => {
  it("says nothing about refunds on a free item", () => {
    // A free game has no payment, so a refund card would be noise.
    expect(refundPolicy("game", 0)).toBeNull();
    expect(refundPolicy("camp", 0)).toBeNull();
  });

  it("tells players Game Ground is not the merchant for player-hosted games", () => {
    const p = refundPolicy("game", 125)!;
    expect(p).toContain("does not process payments for player-hosted games");
    expect(p).toContain("directly to the host");
  });

  it("does NOT promise a Game Ground refund on a player-hosted game", () => {
    // The app previously claimed "Full refund if the organizer cancels", which
    // was never true. GG holds no game money, so it can promise no refund.
    const p = refundPolicy("game", 125)!;
    expect(p).not.toMatch(/we will refund|full refund/i);
  });

  it("applies merchant terms to everything Game Ground actually sells", () => {
    for (const entity of ["camp", "workshop", "event", "coach"] as const) {
      expect(refundPolicy(entity, 500)).toContain("marked for refund");
    }
  });

  it("quotes the cutoff the routes actually enforce", () => {
    // If CANCEL_CUTOFF_MIN is retuned, the published wording follows it.
    expect(refundPolicy("camp", 500)).toContain(String(CANCEL_CUTOFF_MIN));
    expect(refundPolicy("game", 125)).toContain(String(CANCEL_CUTOFF_MIN));
  });

  it("publishes a page section for both the merchant and non-merchant cases", () => {
    const titles = REFUND_POLICY_SECTIONS.map(s => s.title).join(" ");
    expect(titles).toMatch(/player-hosted/i);
    expect(titles).toMatch(/camps/i);
    for (const s of REFUND_POLICY_SECTIONS) expect(s.body.length).toBeGreaterThan(40);
  });
});
