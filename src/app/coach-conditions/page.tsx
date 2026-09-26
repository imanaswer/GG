import { PremiumNav } from "@/components/premium/PremiumNav";
import Link from "next/link";

export const metadata = { title: "Coach Conditions — Game Ground", description: "Game Ground Coach Partnership terms and conditions: financial variables, operational rules, payouts, and the electronic declaration for coaches and academies in Kozhikode, Kerala." };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-0.01em" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.85 }}>{children}</div>
    </section>
  );
}

function Rule({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ marginBottom: 14 }}>
      <strong style={{ color: "#d1d5db", fontWeight: 600 }}>{label}:</strong> {children}
    </p>
  );
}

export default function CoachConditions() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>Game Ground — Coach Partnership Digital Contract</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>Coach Conditions</h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>The specific financial terms and operational rules of your partnership with Game Ground. Applies to all coaches and academies onboarded in Kozhikode, Kerala and beyond.</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 20px", marginBottom: 36 }}>
          <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
            <strong style={{ color: "#fff" }}>Important notice to the partner:</strong> This document sets out the specific financial terms of your partnership with Game Ground. By signing your individual contract, you also confirm that you have read and agreed to the complete platform rules below, which can be viewed online at any time at <a href="https://gameground.net/coach-conditions" style={{ color: "#fff", textDecoration: "underline" }}>gameground.net/coach-conditions</a>.
          </p>
        </div>

        <Section title="1. Partnership Variables">
          <p style={{ marginBottom: 14 }}>The following commercial terms are agreed individually and recorded in your signed contract with Game Ground:</p>
          <Rule label="Coach / Academy Monthly Training Rate">The monthly fee you charge per student, set by you.</Rule>
          <Rule label="One-Time Commission Split">A percentage of the first month&apos;s fee retained by Game Ground.</Rule>
          <Rule label="Maximum Financial Cap on Commission">An upper limit, in rupees, on the commission charged per student.</Rule>
          <Rule label="Photoshoot Early-Exit Reimbursement Cap">A capped reimbursement that applies only if you leave the platform within 6 months of onboarding.</Rule>
        </Section>

        <Section title="2. Key Operational Rules">
          <Rule label="First Month Collection">To prevent fraud, the entire first month&apos;s fee is collected via gameground.net. Direct cash or UPI collection for the first month is strictly prohibited.</Rule>
          <Rule label="14-Day Payout">Your consolidated earnings, minus our one-time commission, are transferred to your bank account or UPI within 14 working days of the following month.</Rule>
          <Rule label="Month 2 Autonomy">From Month 2 onward, Game Ground takes 0% commission. You collect all future fees directly from parents via cash, UPI, or bank transfer.</Rule>
          <Rule label="No Refunds for Absences">If a student misses classes or drops out halfway through Month 1, Game Ground will not refund the parent. Your earnings for that locked slot remain guaranteed.</Rule>
          <Rule label="Masked Contacts">To protect privacy and prevent bypass, direct parent contact numbers are hidden during the first 30 days. All communication happens via our platform.</Rule>
        </Section>

        <Section title="3. Electronic Declaration & Sign-Off">
          <p>By signing your individual contract, you declare that you are authorized to sign for your academy or coaching business. You agree to the custom rates recorded in Section 1 and explicitly accept these full Game Ground Coach Terms &amp; Conditions under the Indian Information Technology Act, 2000.</p>
          <p style={{ marginTop: 14 }}>Each signed contract records the authorized signatory name, academy or coach business name, registered email address, registered phone number, and the coach&apos;s signature, countersigned for Game Ground by the Co-Founder &amp; CEO.</p>
        </Section>

        <Section title="4. Governing Law">
          <p>These conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Kozhikode, Kerala, India.</p>
        </Section>

        <Section title="5. Contact">
          <p>For questions about these conditions, contact us at <a href="mailto:hello@gameground.net" style={{ color: "#fff", textDecoration: "underline" }}>hello@gameground.net</a> or write to: Game Ground, Kozhikode, Kerala 673001, India.</p>
        </Section>

        <p style={{ fontSize: 13, color: "#4b5563", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, marginTop: 8 }}>
          Also read our <Link href="/terms" style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}>Privacy Policy</Link>
        </p>
      </main>
    </div>
  );
}
