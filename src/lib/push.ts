import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Push notifications, sent through Expo's push service — the app is an Expo
// build, so this needs no FCM service account or APNs key of its own, and one
// call reaches both platforms.
//
// Nothing here may throw. A push is a courtesy on top of an action that already
// succeeded; a notification failure must never roll back a booking, a promotion
// or a payment. Every entry point swallows and logs.

export const PUSH_CATEGORIES = [
  "reminder",      // your game is tomorrow
  "waitlist",      // a seat opened and it's yours
  "announcement",  // organiser posted an update
  "payment",       // payment captured / refund due
  "tier",          // you reached a new tier
  "cancellation",  // a game you joined was cancelled
  "review",        // a coaching booking finished — you can review it now
] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export function isPushCategory(v: unknown): v is PushCategory {
  return typeof v === "string" && (PUSH_CATEGORIES as readonly string[]).includes(v);
}

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";
// Expo's documented ceiling per request.
const BATCH = 100;

export type PushMessage = {
  category: PushCategory;
  title: string;
  body: string;
  /** Deep-link payload the app routes on, e.g. { url: "/game/abc" }. */
  data?: Record<string, unknown>;
};

type ExpoTicket = { status: "ok" | "error"; details?: { error?: string } };

/**
 * Send to every device of every named user that hasn't muted the category.
 * Returns how many devices were addressed. Never throws.
 */
export async function sendPush(userIds: string | string[], msg: PushMessage): Promise<number> {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return 0;

    const devices = await prisma.deviceToken.findMany({
      where: {
        userId: { in: ids },
        // A device that hasn't muted this category wants it — including
        // categories added after the device registered.
        NOT: { mutedCategories: { has: msg.category } },
      },
      select: { token: true },
    });
    if (devices.length === 0) return 0;

    const tokens = devices.map(d => d.token);
    for (let i = 0; i < tokens.length; i += BATCH) {
      await deliver(tokens.slice(i, i + BATCH), msg);
    }
    return tokens.length;
  } catch (e) {
    logger.error("push dispatch failed", { category: msg.category, err: e });
    return 0;
  }
}

async function deliver(tokens: string[], msg: PushMessage): Promise<void> {
  const res = await fetch(EXPO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Only needed if the project enables enhanced push security.
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(tokens.map(to => ({
      to,
      title: msg.title,
      body: msg.body,
      data: { category: msg.category, ...msg.data },
      sound: "default",
      channelId: msg.category,
    }))),
  });

  if (!res.ok) {
    logger.error("expo push rejected the batch", { status: res.status, count: tokens.length });
    return;
  }

  // Expo answers per message, in order. A DeviceNotRegistered ticket means the
  // app was uninstalled — drop the row so it isn't retried on every send forever.
  const json = await res.json().catch(() => null) as { data?: ExpoTicket[] } | null;
  const dead = (json?.data ?? [])
    .map((ticket, i) => (ticket?.details?.error === "DeviceNotRegistered" ? tokens[i] : null))
    .filter((t): t is string => !!t);

  if (dead.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
    logger.info("pruned uninstalled push targets", { count: dead.length });
  }
}
