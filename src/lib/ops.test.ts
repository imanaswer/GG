import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, notifyAdminMock, sendEmailMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    opsEvent: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  };
  prismaMock.user = { findUnique: vi.fn() };
  return { prismaMock, notifyAdminMock: vi.fn(), sendEmailMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifyAdmin", () => ({ notifyAdmin: notifyAdminMock }));
vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
  escapeHtml: (v: unknown) => String(v ?? ""),
  emails: { bookingMade: () => ({ subject: "s", html: "h" }) },
}));

import { logOps, logOpsSafe, dispatchPending, MAX_ATTEMPTS } from "./ops";

const P2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
// Admin-only by default: coach.pending_approval has no customer template.
const row = (over: Record<string, unknown> = {}) => ({
  id: "e1", type: "coach.pending_approval", title: "New coach", body: "x", link: "/admin",
  channels: [], userId: null, meta: null, ...over,
});
// Two-channel: booking.created maps to emails.bookingMade for the customer.
const dualRow = (over: Record<string, unknown> = {}) =>
  row({ type: "booking.created", userId: "u1", meta: { playerName: "P", coachName: "C", batch: "Mon 6pm" }, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  notifyAdminMock.mockResolvedValue(true);
  sendEmailMock.mockResolvedValue(true);
  prismaMock.user.findUnique.mockResolvedValue({ email: "player@x.com" });
  prismaMock.opsEvent.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.opsEvent.create.mockResolvedValue({ id: "e1" });
});

describe("logOps", () => {
  it("returns the row id on success", async () => {
    await expect(logOps({ type: "t", title: "T" })).resolves.toBe("e1");
  });

  it("swallows a duplicate dedupeKey — P2002 IS the dedupe, not an error", async () => {
    prismaMock.opsEvent.create.mockRejectedValue(P2002);
    await expect(logOps({ type: "refund.due", title: "T", dedupeKey: "refund.due:p1" })).resolves.toBeNull();
  });

  it("never throws, even when the database is unreachable", async () => {
    // A booking already committed. An alert failure must not surface as a 500.
    prismaMock.opsEvent.create.mockRejectedValue(new Error("connection refused"));
    await expect(logOps({ type: "t", title: "T" })).resolves.toBeNull();
  });
});

describe("dispatchPending", () => {
  it("sends an undelivered event and marks the channel delivered", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([row()]);

    const res = await dispatchPending();

    expect(notifyAdminMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ sent: 1, failed: 0 });
    expect(prismaMock.opsEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ channels: { push: ["admin-email"] } }),
    }));
  });

  it("sends exactly once when two sweeps race — the loser's claim matches no rows", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([row()]);
    prismaMock.opsEvent.updateMany.mockResolvedValue({ count: 0 }); // someone else claimed it

    const res = await dispatchPending();

    expect(notifyAdminMock).not.toHaveBeenCalled();
    expect(res).toEqual({ sent: 0, failed: 0 });
  });

  it("leaves deliveredAt unset when the send fails, so the next sweep retries", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([row()]);
    notifyAdminMock.mockResolvedValue(false);

    const res = await dispatchPending();

    expect(res).toEqual({ sent: 0, failed: 1 });
    expect(prismaMock.opsEvent.update).not.toHaveBeenCalled(); // nothing marked delivered
  });

  it("marks deliveredAt only when nothing is still owed", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([row()]);
    await dispatchPending();
    // Every intended channel went out, so the row leaves the sweep.
    expect(prismaMock.opsEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deliveredAt: expect.any(Date) }),
    }));
  });

  it("does not re-send a channel already delivered", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([row({ channels: ["admin-email"] })]);

    const res = await dispatchPending();

    expect(notifyAdminMock).not.toHaveBeenCalled();
    expect(res.sent).toBe(1);
  });

  it("stops retrying past the attempt cap", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([]);
    await dispatchPending();
    // The cap is expressed in the query, so assert the query — a row at the cap is
    // never selected, and stays visible as a failed alert rather than looping.
    expect(prismaMock.opsEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ attempts: { lt: MAX_ATTEMPTS } }),
    }));
  });

  it("never delivers audit rows — they are a record, not an announcement", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([]);
    await dispatchPending();
    expect(prismaMock.opsEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ severity: { in: ["info", "action"] } }),
    }));
  });

  it("never throws when the sweep itself fails", async () => {
    prismaMock.opsEvent.findMany.mockRejectedValue(new Error("db down"));
    await expect(dispatchPending()).resolves.toEqual({ sent: 0, failed: 0 });
  });
});


// ── Phase 3: the customer channel ────────────────────────────────────────────
describe("dispatchPending — customer email", () => {
  it("sends both channels for an event that has a customer template", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([dualRow()]);

    const res = await dispatchPending();

    expect(notifyAdminMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "player@x.com" }));
    expect(res).toEqual({ sent: 1, failed: 0 });
    expect(prismaMock.opsEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ channels: { push: ["admin-email", "customer-email"] } }),
    }));
  });

  it("retries ONLY the failed channel — the bug this shape exists to prevent", async () => {
    // Admin mail already went out; the customer mail did not. A whole-row skip
    // would strand the customer send forever and report the row as delivered.
    prismaMock.opsEvent.findMany.mockResolvedValue([dualRow({ channels: ["admin-email"] })]);

    await dispatchPending();

    expect(notifyAdminMock).not.toHaveBeenCalled();       // not re-sent
    expect(sendEmailMock).toHaveBeenCalledTimes(1);       // only the missing one
  });

  it("does not mark delivered while a channel is still outstanding", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([dualRow()]);
    sendEmailMock.mockResolvedValue(false); // customer mail fails

    const res = await dispatchPending();

    expect(res).toEqual({ sent: 0, failed: 1 });
    // admin-email is banked so it is never re-sent, but the row stays in the sweep.
    expect(prismaMock.opsEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { channels: { push: ["admin-email"] } },
    }));
  });

  it("settles rather than retrying when there is no resolvable recipient", async () => {
    // Five retries against an address that will never exist is just noise.
    prismaMock.opsEvent.findMany.mockResolvedValue([dualRow({ userId: null })]);
    const res = await dispatchPending();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(res).toEqual({ sent: 1, failed: 0 });
  });

  it("prefers meta.to, for a coach who may not be a User at all", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([
      dualRow({ meta: { to: "coach@x.com", playerName: "P", coachName: "C", batch: "Mon" } }),
    ]);
    await dispatchPending();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "coach@x.com" }));
  });
});

describe("logOpsSafe", () => {
  it("swallows a throw in the BUILDER, not just the write", async () => {
    // `void logOps({ ...expr })` evaluates the literal in the request path, so one
    // unexpected null while assembling an alert would fail an action that already
    // committed. That inversion is the thing this module exists to prevent.
    expect(() => logOpsSafe(() => { throw new Error("null field"); })).not.toThrow();
    expect(prismaMock.opsEvent.create).not.toHaveBeenCalled();
  });
});