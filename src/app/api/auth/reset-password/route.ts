import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import { hashResetToken } from "@/lib/auth";
import { revokeRefreshTokens } from "@/lib/refreshToken";
import bcrypt from "bcryptjs";

// Both fields MUST be strings: an untyped `token` reached Prisma as a filter
// object, so `{ token: { not: null } }` matched any user with a pending reset.
const ResetSchema = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = ResetSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid request", 400);
    const { token, password } = parsed.data;

    // Tokens are stored hashed (see forgot-password); expiry is enforced in the
    // query so an expired token can never select a row.
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: hashResetToken(token), passwordResetExpiry: { gt: new Date() }, deletedAt: null },
      select: { id: true },
    });
    if (!user) return fail("Invalid or expired reset link", 400);

    // Single-use: clearing the token inside the same update means two racing
    // requests with the same link cannot both succeed.
    const updated = await prisma.user.updateMany({
      where: { id: user.id, passwordResetToken: hashResetToken(token) },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
    if (updated.count === 0) return fail("Invalid or expired reset link", 400);

    // The reason people reset a password is that someone else may hold the
    // account. Kill every mobile refresh-token family; web JWTs expire on their own.
    await revokeRefreshTokens(user.id, { all: true });

    return ok({ reset: true });
  } catch (e) { return handleErr(e); }
}
