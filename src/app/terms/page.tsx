import { NavBar } from "@/components/NavBar";
import Link from "next/link";

export const metadata = { title: "Terms of Service — Game Ground", description: "Terms of Service for Game Ground, the hyperlocal sports platform for Kozhikode, Kerala." };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-0.01em" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.85 }}>{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>Terms of Service</h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>Last updated: April 2026 · Applies to all Game Ground users in Kozhikode, Kerala and beyond.</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By registering for or using Game Ground ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform. Use of the Platform constitutes acceptance of the most current version of these Terms.</p>
        </Section>

        <Section title="2. User Accounts">
          <p>You must be at least 16 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials. You agree to provide accurate, complete, and current information. Game Ground reserves the right to suspend or terminate accounts that violate these Terms.</p>
        </Section>

        <Section title="3. Coach Listings">
          <p>Coaches listed on the Platform are independent professionals. Game Ground facilitates the connection between players and coaches but is not a party to the coaching relationship. Game Ground does not guarantee the quality, safety, or legality of coaching services offered. Coaches are responsible for their own certifications, insurance, and compliance with applicable law.</p>
        </Section>

        <Section title="4. Payments and Refunds">
          <p>Payments for sessions, camps, and events are processed through Razorpay. Refund policies vary by service and are determined by the organiser or coach. Game Ground collects a service fee on applicable transactions. In case of a payment dispute, contact us at support@gameground.in within 7 days of the transaction.</p>
        </Section>

        <Section title="5. User Conduct">
          <p>Users agree not to post false or misleading information, harass or harm other users, use the Platform for any unlawful purpose, scrape or copy content without permission, or attempt to circumvent Platform security measures.</p>
        </Section>

        <Section title="6. Child Safety (Camps)">
          <p>Camp registrations for children require accurate child details including name and age. Parents or legal guardians are responsible for ensuring the appropriateness of the camp for their child. Game Ground processes child data only for the purpose of camp registration and does not share it with third parties beyond the camp organiser.</p>
        </Section>

        <Section title="7. Liability Limitation">
          <p>Game Ground is provided "as is" without warranties of any kind. We are not liable for any injury, loss, or damage arising from sports activities facilitated through the Platform. Users participate in physical activities at their own risk. Our total liability is limited to fees paid in the preceding 30 days.</p>
        </Section>

        <Section title="8. Changes to Terms">
          <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms. We will notify registered users of material changes by email.</p>
        </Section>

        <Section title="9. Governing Law">
          <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Kozhikode, Kerala, India.</p>
        </Section>

        <Section title="10. Contact">
          <p>For questions about these Terms, contact us at <a href="mailto:legal@gameground.in" style={{ color: "#e63946" }}>legal@gameground.in</a> or write to: Game Ground, Kozhikode, Kerala 673001, India.</p>
        </Section>

        <p style={{ fontSize: 13, color: "#4b5563", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, marginTop: 8 }}>
          Also read our <Link href="/privacy" style={{ color: "#e63946", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
        </p>
      </main>
    </div>
  );
}
