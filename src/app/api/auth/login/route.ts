import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, cookieOpts } from "@/lib/auth";
import { ok, fail, handleErr, LoginSchema } from "@/lib/api";
import { authLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { isMobileClient, issueMobileSession } from "@/lib/refreshToken";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = await authLimit(ip);
    if (!rl.success) return tooManyRequests(rl);
    const body = await req.json();
    const input = LoginSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) return fail("Invalid email or password", 401);
    // Google-only accounts have no password — guide them to the right flow.
    if (!user.passwordHash) return fail("This account uses Google sign-in — continue with Google.", 401);
    if (!await bcrypt.compare(input.password, user.passwordHash))
      return fail("Invalid email or password", 401);

    const sessionUser = { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, avatarUrl: user.avatarUrl ?? undefined };
    // The phone rides in the response but stays out of the token: it is profile
    // data the app needs (so booking stops asking for a number it already has),
    // not session identity, and a token copy would go stale on the next edit.
    const clientUser = { ...sessionUser, phone: user.phone ?? undefined };

    // isNew tells a client whether to run new-member setup. Always false here —
    // login never creates an account. The create-or-find social routes are where
    // this stops being inferable from which button the user tapped.
    if (isMobileClient(req)) {
      // Mobile gets a short access token plus a refresh token, so a 401 is
      // recoverable instead of a logout. The cookie is still set — harmless, and
      // it keeps any webview inside the app signed in.
      const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
      const session = await issueMobileSession(sessionUser, deviceId);
      const res = ok({ user: clientUser, ...session, isNew: false });
      res.cookies.set(cookieOpts(session.token));
      return res;
    }

    const token = await signToken(sessionUser);
    const res = ok({ user: clientUser, token, isNew: false });
    res.cookies.set(cookieOpts(token));
    return res;
  } catch (e) { return handleErr(e); }
}
