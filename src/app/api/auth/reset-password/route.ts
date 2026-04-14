import { NextRequest } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { ok, fail, handleErr } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 8) return fail("Invalid request", 400);

    const db   = getDB();
    const user = db.users.find(u => u.passwordResetToken === token);
    if (!user || !user.passwordResetExpiry) return fail("Invalid or expired reset link", 400);
    if (new Date(user.passwordResetExpiry) < new Date()) return fail("Reset link has expired. Please request a new one.", 400);

    user.passwordHash         = await bcrypt.hash(password, 12);
    user.passwordResetToken   = null;
    user.passwordResetExpiry  = null;
    saveDB(db);

    return ok({ reset: true });
  } catch (e) { return handleErr(e); }
}
