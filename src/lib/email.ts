/**
 * Email service using Resend.
 * Set RESEND_API_KEY and FROM_EMAIL in .env to enable real email sending.
 * Without these, emails are logged to console (dev mode).
 */
import { logger } from "@/lib/logger";

/** Escape user-supplied text before it is interpolated into email HTML. */
export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[]; // content = base64
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? "hello@gameground.net";

  if (!apiKey) {
    console.log(`[EMAIL — no RESEND_API_KEY] To: ${payload.to} | Subject: ${payload.subject}`);
    return true; // Graceful no-op in dev
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html,
        ...(payload.attachments ? { attachments: payload.attachments } : {}) }),
    });
    return res.ok;
  } catch (err) {
    // Redacting logger: a Resend/network error must not leak RESEND_API_KEY.
    logger.error("email send failed", { to: payload.to, err });
    return false;
  }
}

const brand = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#fff;padding:20px 28px">
      <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.02em"></span>
    </div>
`;
const footer = `
    <div style="padding:20px 28px;background:#111;font-size:12px;color:#666;text-align:center">
      Game Ground · Kozhikode, Kerala · <a href="https://www.gameground.net/privacy" style="color:#fff">Privacy</a>
    </div>
  </div>
`;

export const emails = {
  bookingMade: (playerName: string, coachName: string, batch: string) => ({
    subject: "Booking Request Sent — Game Ground",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Booking Request Sent ✓</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(playerName)}, your request to book <strong style="color:#fff">${escapeHtml(coachName)}</strong> for <strong style="color:#fff">${escapeHtml(batch)}</strong> is now pending.</p>
      <p style="color:#9ca3af;margin-top:12px">The coach will confirm within 24–48 hours. We'll notify you immediately.</p>
      <div style="margin-top:24px;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #fff">
        <p style="color:#fff;font-weight:600;margin:0">What's next?</p>
        <p style="color:#9ca3af;font-size:13px;margin:6px 0 0">Once confirmed, you'll receive the coach's contact details and batch address.</p>
      </div>
    </div>${escapeHtml(footer)}`,
  }),

  bookingConfirmed: (playerName: string, coachName: string, batch: string, address: string, phone: string) => ({
    subject: "Your Booking is Confirmed! 🎉 — Game Ground",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Booking Confirmed! 🎉</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(playerName)}, your session with <strong style="color:#fff">${escapeHtml(coachName)}</strong> is confirmed.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#fff;font-weight:700;margin:0 0 8px">Session Details</p>
        <p style="color:#9ca3af;margin:4px 0">📅 ${escapeHtml(batch)}</p>
        <p style="color:#9ca3af;margin:4px 0">📍 ${escapeHtml(address)}</p>
        <p style="color:#9ca3af;margin:4px 0">📞 ${escapeHtml(phone)}</p>
      </div>
    </div>${escapeHtml(footer)}`,
  }),

  gameJoined: (playerName: string, gameTitle: string, location: string, time: string, organizerName: string) => ({
    subject: `You're In! — ${gameTitle}`,
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">You're in the game! 🏃</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(playerName)}, you've joined <strong style="color:#fff">${escapeHtml(gameTitle)}</strong>.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#9ca3af;margin:4px 0">📍 ${escapeHtml(location)}</p>
        <p style="color:#9ca3af;margin:4px 0">🕐 ${escapeHtml(time)}</p>
        <p style="color:#9ca3af;margin:4px 0">👤 Organised by ${escapeHtml(organizerName)}</p>
      </div>
    </div>${escapeHtml(footer)}`,
  }),

  campRegistered: (parentName: string, childName: string, campName: string, dates: string, contact: string) => ({
    subject: `Camp Registration Confirmed — ${campName}`,
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Camp Registration Confirmed ☀️</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(parentName)}, <strong style="color:#fff">${escapeHtml(childName)}</strong> is registered for <strong style="color:#fff">${escapeHtml(campName)}</strong>.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#9ca3af;margin:4px 0">📅 ${escapeHtml(dates)}</p>
        <p style="color:#9ca3af;margin:4px 0">📞 Organiser: ${escapeHtml(contact)}</p>
      </div>
      <p style="color:#9ca3af;margin-top:16px;font-size:13px">Payment is collected at the venue on Day 1. Please bring this confirmation.</p>
    </div>${escapeHtml(footer)}`,
  }),

  passwordReset: (userName: string, resetUrl: string) => ({
    subject: "Reset Your Game Ground Password",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Password Reset Request</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(userName)}, we received a request to reset your Game Ground password.</p>
      <div style="margin-top:24px;text-align:center">
        <a href="${resetUrl}" style="display:inline-block;padding:13px 32px;background:#fff;color:#fff;border-radius:9px;font-weight:700;text-decoration:none;font-size:15px">Reset My Password</a>
      </div>
      <p style="color:#6b7280;font-size:12px;margin-top:20px;text-align:center">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>${escapeHtml(footer)}`,
  }),

  newBookingForCoach: (coachName: string, playerName: string, batch: string, note?: string) => ({
    subject: `New Booking Request — ${playerName}`,
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">New Booking Request 📩</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(coachName)}, <strong style="color:#fff">${escapeHtml(playerName)}</strong> has requested a booking.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#9ca3af;margin:4px 0">🕐 Batch: ${escapeHtml(batch)}</p>
        ${note ? `<p style="color:#9ca3af;margin:4px 0">📝 Note: ${escapeHtml(note)}</p>` : ""}
      </div>
      <p style="color:#9ca3af;margin-top:16px;font-size:13px">Log in to your coach dashboard to confirm or reject this booking.</p>
    </div>${escapeHtml(footer)}`,
  }),

  bookingApproved: (playerName: string, coachName: string, slot: string, address: string, phone: string) => ({
    subject: "Your coaching session has been approved 🎉 — Game Ground",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Session Approved! 🎉</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(playerName)}, your coaching session with <strong style="color:#fff">${escapeHtml(coachName)}</strong> has been approved.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#fff;font-weight:700;margin:0 0 8px">Session Details</p>
        <p style="color:#9ca3af;margin:4px 0">📅 ${escapeHtml(slot)}</p>
        ${address ? `<p style="color:#9ca3af;margin:4px 0">📍 ${escapeHtml(address)}</p>` : ""}
        ${phone ? `<p style="color:#9ca3af;margin:4px 0">📞 ${escapeHtml(phone)}</p>` : ""}
      </div>
    </div>${escapeHtml(footer)}`,
  }),

  bookingRejected: (playerName: string, coachName: string, slot: string, reason?: string) => ({
    subject: "Update on your coaching session request — Game Ground",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Booking Request Rejected</h2>
      <p style="color:#9ca3af">Hi ${escapeHtml(playerName)}, your coaching session request with <strong style="color:#fff">${escapeHtml(coachName)}</strong> (${escapeHtml(slot)}) was rejected.</p>
      ${reason ? `<div style="margin-top:16px;padding:14px;background:#1a1a1a;border-radius:8px;border-left:3px solid #fff"><p style="color:#9ca3af;margin:0">Reason: ${escapeHtml(reason)}</p></div>` : ""}
      <p style="color:#9ca3af;margin-top:16px;font-size:13px">You can browse other coaches and request a new session anytime.</p>
    </div>${escapeHtml(footer)}`,
  }),

  agreementSigned: (name: string, agreementNumber: string, version: string, signedDate: string, pdfUrl: string) => ({
    subject: "GameGround Coach Agreement Successfully Signed",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Agreement Signed ✓</h2>
      <p style="color:#9ca3af">Thank you, ${escapeHtml(name)}. Your Coach Partnership Agreement is now on file.</p>
      <p style="color:#9ca3af;margin-top:12px">Agreement Number: <strong style="color:#fff">${escapeHtml(agreementNumber)}</strong><br/>
         Version: ${escapeHtml(version)}<br/>Signed: ${escapeHtml(signedDate)}</p>
      <a href="${pdfUrl}" style="display:inline-block;margin-top:16px;background:#fff;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Download PDF</a>
    </div>${escapeHtml(footer)}`,
  }),

  coachInvite: (name: string, setPasswordUrl: string) => ({
    subject: "Your Game Ground coach portal login",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Your coach portal is ready, ${escapeHtml(name)}</h2>
      <p style="color:#9ca3af">Set a password to sign in and see your profile, batches and booking requests.</p>
      <div style="margin-top:24px;text-align:center">
        <a href="${setPasswordUrl}" style="display:inline-block;padding:13px 32px;background:#fff;color:#000;border-radius:9px;font-weight:700;text-decoration:none;font-size:15px">Set my password</a>
      </div>
      <p style="color:#6b7280;font-size:12px;margin-top:20px;text-align:center">This link expires in 72 hours. After that, use “Forgot password” on the coach sign-in page.</p>
    </div>${escapeHtml(footer)}`,
  }),

  agreementInvite: (name: string, signLink: string) => ({
    subject: "Sign your GameGround Coach Partnership Agreement",
    html: `${escapeHtml(brand)}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Welcome to Game Ground, ${escapeHtml(name)}! 🎉</h2>
      <p style="color:#9ca3af">Before you can go live as a coach, please review and sign your Coach Partnership Agreement. No login needed — just open your secure link below.</p>
      <a href="${signLink}" style="display:inline-block;margin-top:18px;background:#fff;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:700">Review &amp; Sign Agreement</a>
      <p style="color:#6b7280;font-size:12px;margin-top:18px">This link is unique to you — please don't share it. It expires in 30 days.</p>
    </div>${escapeHtml(footer)}`,
  }),
};
