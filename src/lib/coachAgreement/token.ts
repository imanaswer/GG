import { SignJWT, jwtVerify } from "jose";

// Stateless per-coach signing token. Lets a coach open /onboarding-terms and sign
// WITHOUT a password login, while still proving which account is signing. Signed
// with AUTH_SECRET and stamped with a purpose claim so it can never be used as a
// normal login session (and a login cookie can never be used as a signing token).
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? (() => {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET env var is required in production");
    return "gridgame-dev-secret-key-minimum-32-chars!!";
  })()
);
const PURPOSE = "coach-agreement";

export async function signAgreementToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

/** Returns the coach userId the token authorizes, or null if invalid/expired/wrong-purpose. */
export async function verifyAgreementToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== PURPOSE || typeof payload.uid !== "string") return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/** Absolute /onboarding-terms link carrying the token (for emails / admin copy). */
export function buildSignLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/onboarding-terms?token=${encodeURIComponent(token)}`;
}
