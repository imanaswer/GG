import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, cookieOpts } from "@/lib/auth";
import { ok, fail, handleErr, RegisterSchema } from "@/lib/api";
import { isMobileClient, issueMobileSession } from "@/lib/refreshToken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = RegisterSchema.parse(body);

    const [emailTaken, usernameTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
      prisma.user.findUnique({ where: { username: input.username }, select: { id: true } }),
    ]);
    if (emailTaken)    return fail("Email already registered", 409);
    if (usernameTaken) return fail("Username already taken", 409);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        username: input.username,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: input.role,
      },
    });

    const sessionUser = { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, avatarUrl: user.avatarUrl ?? undefined };
    // Always null on a fresh account — carried anyway so every auth response has
    // the same user shape for the app to parse.
    const clientUser = { ...sessionUser, phone: user.phone ?? undefined };

    if (isMobileClient(req)) {
      const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
      const session = await issueMobileSession(sessionUser, deviceId);
      const res = ok({ user: clientUser, ...session, isNew: true }, 201);
      res.cookies.set(cookieOpts(session.token));
      return res;
    }

    const token = await signToken(sessionUser);
    const res = ok({ user: clientUser, token, isNew: true }, 201);
    res.cookies.set(cookieOpts(token));
    return res;
  } catch (e) { return handleErr(e); }
}
