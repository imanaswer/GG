import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emails } from "@/lib/email";
import { ok, handleErr } from "@/lib/api";
import crypto from "crypto";
import { hashResetToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    // Same 200 for any input: this route must never confirm whether an email exists.
    if (typeof email !== "string" || !email) return ok({ sent: true });

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (user) {
      const token  = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600_000);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: hashResetToken(token), passwordResetExpiry: expiry },
      });

      const baseUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendEmail({ to: user.email, ...emails.passwordReset(user.name, resetUrl) });
    }

    return ok({ sent: true });
  } catch (e) { return handleErr(e); }
}
