/**
 * Email service using Resend.
 * Set RESEND_API_KEY and FROM_EMAIL in .env to enable real email sending.
 * Without these, emails are logged to console (dev mode).
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.FROM_EMAIL ?? "noreply@gameground.in";

  if (!apiKey) {
    console.log(`[EMAIL — no RESEND_API_KEY] To: ${payload.to} | Subject: ${payload.subject}`);
    return true; // Graceful no-op in dev
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html }),
    });
    return res.ok;
  } catch (err) {
    console.error("[EMAIL ERROR]", err);
    return false;
  }
}

const brand = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#e63946;padding:20px 28px">
      <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.02em">G Game Ground</span>
    </div>
`;
const footer = `
    <div style="padding:20px 28px;background:#111;font-size:12px;color:#666;text-align:center">
      Game Ground · Kozhikode, Kerala · <a href="https://gameground.in/privacy" style="color:#e63946">Privacy</a>
    </div>
  </div>
`;

export const emails = {
  bookingMade: (playerName: string, coachName: string, batch: string) => ({
    subject: "Booking Request Sent — Game Ground",
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Booking Request Sent ✓</h2>
      <p style="color:#9ca3af">Hi ${playerName}, your request to book <strong style="color:#fff">${coachName}</strong> for <strong style="color:#fff">${batch}</strong> is now pending.</p>
      <p style="color:#9ca3af;margin-top:12px">The coach will confirm within 24–48 hours. We'll notify you immediately.</p>
      <div style="margin-top:24px;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #e63946">
        <p style="color:#fff;font-weight:600;margin:0">What's next?</p>
        <p style="color:#9ca3af;font-size:13px;margin:6px 0 0">Once confirmed, you'll receive the coach's contact details and batch address.</p>
      </div>
    </div>${footer}`,
  }),

  bookingConfirmed: (playerName: string, coachName: string, batch: string, address: string, phone: string) => ({
    subject: "Your Booking is Confirmed! 🎉 — Game Ground",
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#e63946;margin:0 0 12px">Booking Confirmed! 🎉</h2>
      <p style="color:#9ca3af">Hi ${playerName}, your session with <strong style="color:#fff">${coachName}</strong> is confirmed.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#fff;font-weight:700;margin:0 0 8px">Session Details</p>
        <p style="color:#9ca3af;margin:4px 0">📅 ${batch}</p>
        <p style="color:#9ca3af;margin:4px 0">📍 ${address}</p>
        <p style="color:#9ca3af;margin:4px 0">📞 ${phone}</p>
      </div>
    </div>${footer}`,
  }),

  gameJoined: (playerName: string, gameTitle: string, location: string, time: string, organizerName: string) => ({
    subject: `You're In! — ${gameTitle}`,
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">You're in the game! 🏃</h2>
      <p style="color:#9ca3af">Hi ${playerName}, you've joined <strong style="color:#fff">${gameTitle}</strong>.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#9ca3af;margin:4px 0">📍 ${location}</p>
        <p style="color:#9ca3af;margin:4px 0">🕐 ${time}</p>
        <p style="color:#9ca3af;margin:4px 0">👤 Organised by ${organizerName}</p>
      </div>
    </div>${footer}`,
  }),

  campRegistered: (parentName: string, childName: string, campName: string, dates: string, contact: string) => ({
    subject: `Camp Registration Confirmed — ${campName}`,
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Camp Registration Confirmed ☀️</h2>
      <p style="color:#9ca3af">Hi ${parentName}, <strong style="color:#fff">${childName}</strong> is registered for <strong style="color:#fff">${campName}</strong>.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#9ca3af;margin:4px 0">📅 ${dates}</p>
        <p style="color:#9ca3af;margin:4px 0">📞 Organiser: ${contact}</p>
      </div>
      <p style="color:#9ca3af;margin-top:16px;font-size:13px">Payment is collected at the venue on Day 1. Please bring this confirmation.</p>
    </div>${footer}`,
  }),

  passwordReset: (userName: string, resetUrl: string) => ({
    subject: "Reset Your Game Ground Password",
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Password Reset Request</h2>
      <p style="color:#9ca3af">Hi ${userName}, we received a request to reset your Game Ground password.</p>
      <div style="margin-top:24px;text-align:center">
        <a href="${resetUrl}" style="display:inline-block;padding:13px 32px;background:#e63946;color:#fff;border-radius:9px;font-weight:700;text-decoration:none;font-size:15px">Reset My Password</a>
      </div>
      <p style="color:#6b7280;font-size:12px;margin-top:20px;text-align:center">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>${footer}`,
  }),

  newBookingForCoach: (coachName: string, playerName: string, batch: string, note?: string) => ({
    subject: `New Booking Request — ${playerName}`,
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">New Booking Request 📩</h2>
      <p style="color:#9ca3af">Hi ${coachName}, <strong style="color:#fff">${playerName}</strong> has requested a booking.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#9ca3af;margin:4px 0">🕐 Batch: ${batch}</p>
        ${note ? `<p style="color:#9ca3af;margin:4px 0">📝 Note: ${note}</p>` : ""}
      </div>
      <p style="color:#9ca3af;margin-top:16px;font-size:13px">Log in to your coach dashboard to confirm or reject this booking.</p>
    </div>${footer}`,
  }),
};
