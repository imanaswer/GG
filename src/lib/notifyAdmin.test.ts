import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

import { notifyAdmin, adminRecipients } from "./notifyAdmin";

beforeEach(() => {
  vi.clearAllMocks();
  sendEmailMock.mockResolvedValue(true);
  delete process.env.ADMIN_EMAIL;
});

describe("adminRecipients", () => {
  it("splits and trims a comma-separated list, dropping blanks", () => {
    process.env.ADMIN_EMAIL = " a@x.com , b@x.com ,, ";
    expect(adminRecipients()).toEqual(["a@x.com", "b@x.com"]);
  });
  it("is empty when unset", () => expect(adminRecipients()).toEqual([]));
});

describe("notifyAdmin", () => {
  it("no-ops when ADMIN_EMAIL is unset, and reports success", async () => {
    // Fail-open: a missing env var must never break the booking that triggered it.
    await expect(notifyAdmin("subject", "<p>body</p>")).resolves.toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends one separate email per recipient", async () => {
    // One call each rather than a multi-address `to`: Resend renders that as a
    // single thread, exposing the ops team's addresses to each other on reply-all.
    process.env.ADMIN_EMAIL = "a@x.com,b@x.com";
    await notifyAdmin("subject", "<p>body</p>");
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock.mock.calls.map(c => c[0].to)).toEqual(["a@x.com", "b@x.com"]);
  });

  it("reports failure when any recipient fails", async () => {
    process.env.ADMIN_EMAIL = "a@x.com,b@x.com";
    sendEmailMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(notifyAdmin("s", "b")).resolves.toBe(false);
  });

  it("never throws when the mail provider blows up", async () => {
    process.env.ADMIN_EMAIL = "a@x.com";
    sendEmailMock.mockRejectedValue(new Error("network"));
    await expect(notifyAdmin("s", "b")).resolves.toBe(false);
  });
});
