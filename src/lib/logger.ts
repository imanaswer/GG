// Structured JSON logger with two-layer secret redaction. Emits one JSON line
// per event so a log drain (Vercel/Datadog/etc.) can parse level, message,
// timestamp, requestId and context. Redaction is defense-in-depth:
//   1. key-based  — any field whose NAME looks sensitive is dropped, recursively.
//   2. value-based — known secret VALUES from process.env are scrubbed from the
//      final serialized string, so a secret leaks nowhere even if it rode in an
//      unexpected field (a stack trace, a stringified Prisma error, a header).
// This is the trust boundary for logs — never log raw request bodies/headers
// without passing them through here.

export type Level = "debug" | "info" | "warn" | "error";

const REDACTED = "[REDACTED]";

// Case-insensitive: matches password, passwordHash, passwordResetToken, secret,
// *_SECRET, token, authorization, cookie, signature, jwt, apiKey/api_key, razorpay_*.
const SENSITIVE_KEY = /pass(word)?|secret|token|auth(orization)?|cookie|signature|jwt|api[-_]?key|razorpay_/i;

// Env var names whose VALUES must never appear in a log line. Kept explicit so a
// new secret is a conscious addition. NEXT_PUBLIC_* are intentionally excluded
// (they ship to the browser and are not secrets).
const SECRET_ENV = [
  "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "AUTH_SECRET", "ADMIN_JWT_SECRET",
  "ADMIN_PASSWORD", "CLOUDINARY_API_SECRET", "GOOGLE_CLIENT_SECRET", "CRON_SECRET",
  "UPSTASH_REDIS_REST_TOKEN", "ANTHROPIC_API_KEY", "RESEND_API_KEY", "DATABASE_URL",
];

function secretValues(): string[] {
  // length >= 8 guards against scrubbing a short/empty value that would nuke the
  // whole line (e.g. an empty secret matching everywhere).
  return SECRET_ENV.map((n) => process.env[n]).filter((v): v is string => !!v && v.length >= 8);
}

// Recursively drop sensitive keys. Errors are unwrapped (their props aren't
// plain-enumerable) so Prisma error codes/messages still surface — then the
// value-scrub pass catches any secret embedded in the message/stack.
function redactKeys(v: unknown, seen = new WeakSet<object>()): unknown {
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v as object)) return "[Circular]";
  seen.add(v as object);

  if (v instanceof Error) {
    const base: Record<string, unknown> = { name: v.name, message: v.message, stack: v.stack };
    for (const [k, val] of Object.entries(v)) base[k] = SENSITIVE_KEY.test(k) ? REDACTED : redactKeys(val, seen);
    return base;
  }
  if (Array.isArray(v)) return v.map((x) => redactKeys(x, seen));

  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : redactKeys(val, seen);
  }
  return out;
}

function scrubValues(s: string): string {
  let out = s;
  for (const secret of secretValues()) out = out.split(secret).join(REDACTED);
  return out;
}

/** Serialize + fully redact a log record to a single JSON line. Exported for testing. */
export function formatLine(level: Level, msg: string, ctx?: Record<string, unknown>): string {
  const record = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ? { ctx: redactKeys(ctx) } : {}),
  };
  return scrubValues(JSON.stringify(record));
}

export function log(level: Level, msg: string, ctx?: Record<string, unknown>): void {
  const line = formatLine(level, msg, ctx);
  // warn/error → stderr, rest → stdout, so platforms route them correctly.
  (level === "error" || level === "warn" ? console.error : console.log)(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};
