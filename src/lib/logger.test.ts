import { describe, it, expect } from "vitest";
import { formatLine } from "./logger";
import { Prisma } from "@prisma/client";

describe("logger redaction", () => {
  it("redacts sensitive keys recursively (nested + arrays)", () => {
    const line = formatLine("info", "req", {
      user: { name: "Asha", password: "hunter2", passwordResetToken: "rst_abc" },
      headers: { authorization: "Bearer eyJ.jwt.tok", cookie: "session=abc" },
      items: [{ apiKey: "sk_live_123" }, { razorpay_signature: "sig_xyz" }],
    });
    expect(line).not.toContain("hunter2");
    expect(line).not.toContain("rst_abc");
    expect(line).not.toContain("Bearer eyJ.jwt.tok");
    expect(line).not.toContain("session=abc");
    expect(line).not.toContain("sk_live_123");
    expect(line).not.toContain("sig_xyz");
    expect(line).toContain("Asha"); // non-sensitive survives
    expect(line).toContain("[REDACTED]");
  });

  it("scrubs known secret VALUES even from a non-sensitive field or an error message", () => {
    const prev = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "super-long-secret-value-1234567890";
    try {
      // secret embedded in a field the key-filter would NOT catch, and in an Error message
      const err = new Error(`db connect failed for super-long-secret-value-1234567890`);
      const line = formatLine("error", "boom", { note: "leaked super-long-secret-value-1234567890", err });
      expect(line).not.toContain("super-long-secret-value-1234567890");
      expect(line).toContain("[REDACTED]");
    } finally {
      process.env.AUTH_SECRET = prev;
    }
  });

  it("unwraps a Prisma-error shape so its code surfaces but secrets don't", () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://user:hunter2pw@host:5432/db?sslmode=require";
    try {
      const e = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.0.0",
      });
      const line = formatLine("error", "prisma failed", { err: e, connection: process.env.DATABASE_URL });
      expect(line).toContain("P2002");           // useful diagnostic preserved
      expect(line).not.toContain("hunter2pw");    // password inside DATABASE_URL scrubbed
    } finally {
      process.env.DATABASE_URL = prev;
    }
  });
});
