import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, cookieOpts } from "@/lib/auth";
import { ok, fail, handleErr, LoginSchema } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = LoginSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) return fail("Invalid email or password", 401);
    // Google-only accounts have no password — guide them to the right flow.
    if (!user.passwordHash) return fail("This account uses Google sign-in — continue with Google.", 401);
    if (!await bcrypt.compare(input.password, user.passwordHash))
      return fail("Invalid email or password", 401);

    const sessionUser = { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, avatarUrl: user.avatarUrl ?? undefined };
    const token = await signToken(sessionUser);
    const res = ok({ user: sessionUser, token });
    res.cookies.set(cookieOpts(token));
    return res;
  } catch (e) { return handleErr(e); }
}
