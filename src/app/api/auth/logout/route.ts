import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = clearCookie();
  res.cookies.set(opts.name, opts.value, { httpOnly: opts.httpOnly, path: opts.path, maxAge: opts.maxAge });
  return res;
}
