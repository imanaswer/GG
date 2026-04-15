import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 8) return fail("Invalid request", 400);

    const user = await prisma.user.findFirst({ where: { passwordResetToken: token } });
    if (!user || !user.passwordResetExpiry) return fail("Invalid or expired reset link", 400);
    if (user.passwordResetExpiry < new Date()) return fail("Reset link has expired. Please request a new one.", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return ok({ reset: true });
  } catch (e) { return handleErr(e); }
}
