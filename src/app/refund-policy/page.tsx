import { PremiumNav } from "@/components/premium/PremiumNav";
import Link from "next/link";
import { REFUND_POLICY_SECTIONS } from "@/lib/refundPolicy";

export const metadata = {
  title: "Refund & Cancellation Policy — Game Ground",
  description: "When bookings can be cancelled, what is refundable, and how refunds are processed.",
};

// The wording comes from src/lib/refundPolicy.ts — the same constant the API
// serves to the apps. A published policy page is also a Razorpay prerequisite for
// going live, and having it drift from what the product actually enforces is how
// that goes wrong.
export default function RefundPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>
            Refund &amp; Cancellation Policy
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>Last updated: August 2026</p>
        </div>

        {REFUND_POLICY_SECTIONS.map((s, i) => (
          <section key={s.title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              {i + 1}. {s.title}
            </h2>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.85 }}>{s.body}</p>
          </section>
        ))}

        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 40 }}>
          See also our{" "}
          <Link href="/terms" style={{ color: "#fff", textDecoration: "underline" }}>Terms of Service</Link> and{" "}
          <Link href="/privacy" style={{ color: "#fff", textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
