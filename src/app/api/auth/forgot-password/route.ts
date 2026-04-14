import { NextRequest } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { sendEmail, emails } from "@/lib/email";
import { ok, handleErr } from "@/lib/api";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return ok({ sent: true }); // always 200 to prevent email enumeration

    const db   = getDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      const token  = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600_000).toISOString(); // 1 hour
      user.passwordResetToken  = token;
      user.passwordResetExpiry = expiry;
      saveDB(db);

      const baseUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendEmail({ to: user.email, ...emails.passwordReset(user.name, resetUrl) });
    }

    return ok({ sent: true });
  } catch (e) { return handleErr(e); }
}
