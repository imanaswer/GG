import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDB, saveDB, uid, type User } from "@/lib/db";
import { signToken, cookieOpts } from "@/lib/auth";
import { ok, fail, handleErr, RegisterSchema } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = RegisterSchema.parse(body);
    const db = getDB();

    if (db.users.find(u => u.email === input.email))
      return fail("Email already registered", 409);
    if (db.users.find(u => u.username === input.username))
      return fail("Username already taken", 409);

    const user: User = {
      id: uid("u_"), email: input.email, name: input.name,
      username: input.username, passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role, reliabilityScore: 5.0,
      gamesPlayed: 0, gamesOrganized: 0, attendanceRate: 100,
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    saveDB(db);

    const sessionUser = { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, avatarUrl: user.avatarUrl };
    const token = await signToken(sessionUser);
    const res = ok({ user: sessionUser, token }, 201);
    res.cookies.set(cookieOpts(token));
    return res;
  } catch (e) { return handleErr(e); }
}
