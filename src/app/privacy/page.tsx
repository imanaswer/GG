import { NavBar } from "@/components/NavBar";
import Link from "next/link";

export const metadata = { title: "Privacy Policy — Game Ground", description: "How Game Ground collects, uses, and protects your personal data." };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.85 }}>{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>Last updated: April 2026 · GDPR & IT Act 2000 compliant.</p>
        </div>

        <Section title="1. What Data We Collect">
          <p><strong style={{ color: "#fff" }}>Account data:</strong> Name, email address, username, encrypted password, phone number (optional).</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#fff" }}>Profile data:</strong> Bio, location, sports preferences, avatar image (if uploaded).</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#fff" }}>Activity data:</strong> Games joined, bookings made, camps registered, events attended, reviews written.</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#fff" }}>Child data (camps only):</strong> Child's name and age, collected only for camp registration purposes.</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#fff" }}>Payment data:</strong> Transaction IDs only. Full card/UPI details are handled by Razorpay and are never stored on our servers.</p>
        </Section>

        <Section title="2. How We Use Your Data">
          <p>We use your data to provide the Game Ground service, including matching you with coaches and games, sending booking confirmations and reminders, processing payments, improving our recommendations (via Claude AI), and complying with legal obligations.</p>
          <p style={{ marginTop: 8 }}>We do not sell your data to third parties. We do not use your data for advertising.</p>
        </Section>

        <Section title="3. Who Sees Your Data">
          <p><strong style={{ color: "#fff" }}>Coaches</strong> can see the name and contact details of players who book their sessions.</p>
          <p style={{ marginTop: 6 }}><strong style={{ color: "#fff" }}>Game organisers</strong> can see the names and WhatsApp numbers of players who join their games.</p>
          <p style={{ marginTop: 6 }}><strong style={{ color: "#fff" }}>Camp organisers</strong> can see child registration details (name and age) for their camps.</p>
          <p style={{ marginTop: 6 }}><strong style={{ color: "#fff" }}>Other players</strong> can see your public profile: name, username, sports, reliability score, and profile photo.</p>
          <p style={{ marginTop: 6 }}><strong style={{ color: "#fff" }}>Your email and phone</strong> are never publicly visible.</p>
        </Section>

        <Section title="4. Data Storage and Security">
          <p>Data is stored on Supabase (PostgreSQL) servers in secure data centres. Passwords are hashed using bcrypt (minimum cost factor 12). All connections use HTTPS/TLS. Access to the database is restricted to authorised personnel only.</p>
        </Section>

        <Section title="5. Your Rights">
          <p>You have the right to access your data at any time through your profile page. You can edit your information at any time. You can request complete deletion of your account and all associated data through Settings → Delete Account. Deletion is permanent and irrevocable.</p>
        </Section>

        <Section title="6. Cookies">
          <p>We use a single httpOnly session cookie (gg_token) for authentication. This cookie does not track you across other websites. We do not use advertising cookies or third-party tracking cookies.</p>
        </Section>

        <Section title="7. Children's Data">
          <p>Camp registration requires children's names and ages, provided by parents or legal guardians. This data is used solely for camp administration and is not shared beyond the relevant camp organiser. Parents may request deletion of their child's data by contacting us.</p>
        </Section>

        <Section title="8. Contact">
          <p>For privacy requests, data access, or deletion requests: <a href="mailto:privacy@gameground.in" style={{ color: "#e63946" }}>privacy@gameground.in</a></p>
        </Section>

        <p style={{ fontSize: 13, color: "#4b5563", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, marginTop: 8 }}>
          Also read our <Link href="/terms" style={{ color: "#e63946", textDecoration: "none", fontWeight: 600 }}>Terms of Service</Link>
        </p>
      </main>
    </div>
  );
}
