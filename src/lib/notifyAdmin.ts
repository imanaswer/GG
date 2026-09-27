/**
 * Admin alerting. A thin wrapper over sendEmail so the ops team learns that
 * something happened without anyone opening the dashboard.
 *
 * ADMIN_EMAIL is comma-separated — the whole ops team on one alert, no groups or
 * distribution list to maintain. Unset means no-op, matching sendEmail's behaviour
 * without RESEND_API_KEY: a missing env var must never break a booking.
 */
import { sendEmail, escapeHtml } from "@/lib/email";
import { logger } from "@/lib/logger";

export function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map(e => e.trim())
    .filter(Boolean);
}

/**
 * Returns true when the alert was accepted for every recipient. Never throws —
 * an alert is a courtesy on top of an action that already succeeded, exactly as
 * lib/push.ts treats a push.
 */
export async function notifyAdmin(subject: string, html: string): Promise<boolean> {
  const to = adminRecipients();
  if (to.length === 0) {
    logger.warn("admin alert not sent: ADMIN_EMAIL unset", { subject });
    return true; // graceful no-op, same contract as sendEmail in dev
  }
  try {
    // One call per recipient: Resend treats a multi-address `to` as a single visible
    // thread, which leaks the ops team's addresses to each other on reply-all.
    const results = await Promise.all(to.map(addr => sendEmail({ to: addr, subject, html })));
    return results.every(Boolean);
  } catch (err) {
    logger.error("admin alert failed", { subject, err });
    return false;
  }
}

/** Minimal branded shell, so an alert is readable on a phone at 2am. */
export function adminAlertHtml(opts: {
  heading: string;
  lines: { label: string; value: string }[];
  link?: { href: string; label: string };
}): string {
  const rows = opts.lines
    .map(l => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px">${escapeHtml(l.label)}</td>`
            + `<td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">${escapeHtml(l.value)}</td></tr>`)
    .join("");
  const cta = opts.link
    ? `<p style="margin:18px 0 0"><a href="${opts.link.href}" style="background:#fff;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">${opts.link.label}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px">
    <h2 style="margin:0 0 12px;font-size:17px;color:#111">${escapeHtml(opts.heading)}</h2>
    <table style="border-collapse:collapse">${rows}</table>${cta}
  </div>`;
}
