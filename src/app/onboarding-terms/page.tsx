"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAgreement, CURRENT_AGREEMENT_VERSION, estimatedReadingMinutes } from "@/lib/coachAgreement/content";

function OnboardingTerms() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const agreement = useMemo(() => getAgreement(CURRENT_AGREEMENT_VERSION), []);
  const readMins = useMemo(() => estimatedReadingMinutes(CURRENT_AGREEMENT_VERSION), []);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", dateOfBirth: "", address: "",
    emergencyContactName: "", emergencyContactNumber: "",
    signatureName: "", signedDate: new Date().toISOString().slice(0, 10),
  });
  const [checks, setChecks] = useState({ confirmAccurate: false, agreeAgreement: false, consentESign: false, understandTermination: false });
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ agreementNumber: string; id: string; acceptedAt: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const pdfHref = (id: string) => `/api/coach/agreements/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  useEffect(() => {
    if (loading) return;
    const isCoach = !!user && user.role === "coach";
    // Identity comes from a signing token (link) OR a coach login session.
    if (!token && !isCoach) {
      setBlocked("This signing link is invalid or missing. Please use the link sent to you, or sign in as a coach.");
      setReady(true);
      return;
    }
    const statusUrl = token ? `/api/coach/agreements?token=${encodeURIComponent(token)}` : "/api/coach/agreements";
    fetch(statusUrl).then(r => r.json()).then(d => {
      const data = d?.data;
      if (!data) {
        setBlocked("This signing link is invalid or has expired. Please request a new one.");
        setReady(true);
        return;
      }
      if (data.signed && data.agreement) {
        // Already signed — show the confirmation (with token-scoped download).
        setDone({ agreementNumber: data.agreement.agreementNumber, id: data.agreement.id, acceptedAt: data.agreement.acceptedAt });
        setReady(true);
        return;
      }
      if (data.tokenState === "used") { setBlocked("This agreement has already been signed."); setReady(true); return; }
      if (data.tokenState === "expired") { setBlocked("This link has expired. Please request a new agreement link."); setReady(true); return; }
      if (data.tokenState === "invalid") { setBlocked("This signing link is invalid. Please request a new agreement link."); setReady(true); return; }
      const p = data.prefill;
      setForm(f => ({
        ...f,
        fullName: p?.fullName ?? user?.name ?? f.fullName,
        email: p?.email ?? user?.email ?? f.email,
        phone: p?.phone ?? f.phone,
        address: p?.address ?? f.address,
      }));
      setReady(true);
    }).catch(() => {
      setBlocked("Could not verify your signing link. Please try again.");
      setReady(true);
    });
  }, [token, user, loading]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const pct = Math.min(100, Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100));
    setProgress(Number.isFinite(pct) ? pct : 0);
  };

  const allChecked = Object.values(checks).every(Boolean);
  const sigMatches = form.signatureName.trim().length > 0 && form.signatureName.trim() === form.fullName.trim();
  const canSubmit = allChecked && sigMatches && !submitting && Object.values(form).every(v => String(v).trim().length > 0);

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/coach/agreements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...checks, ...(token ? { token } : {}) }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) { setError(json.error ?? "Submission failed"); return; }
      if (json.data.alreadySigned) {
        if (user?.role === "coach") { router.push("/coach/dashboard"); return; }
        setError("This agreement has already been signed.");
        return;
      }
      const a = json.data.agreement ?? json.data;
      setDone({ agreementNumber: a.agreementNumber, id: a.id, acceptedAt: a.acceptedAt });
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  if (loading || !ready) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  if (blocked) {
    return (
      <main style={{ minHeight: "100vh", background: "#fff", color: "#111", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <strong style={{ color: "#980808", fontSize: 18 }}>GAME GROUND</strong>
          <p style={{ color: "#555", marginTop: 16 }}>{blocked}</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main style={{ minHeight: "100vh", background: "#fff", color: "#111", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>Agreement Successfully Signed</h1>
          <p style={{ color: "#555", marginTop: 8 }}>Agreement Number: <strong>{done.agreementNumber}</strong></p>
          <p style={{ color: "#555" }}>Version: {CURRENT_AGREEMENT_VERSION}</p>
          <p style={{ color: "#555" }}>Date Signed: {new Date(done.acceptedAt).toLocaleDateString()}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <a href={pdfHref(done.id)} style={btnPrimary}>Download PDF</a>
            {user?.role === "coach" ? (
              <button onClick={() => router.push("/coach/dashboard")} style={btnGhost}>Continue Onboarding</button>
            ) : (
              <button onClick={() => router.push("/login")} style={btnGhost}>Sign in</button>
            )}
          </div>
          {!user && <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 16 }}>A copy has been emailed to you. You can close this page.</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#111" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #eee", padding: "12px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 820, margin: "0 auto" }}>
          <strong style={{ color: "#980808" }}>GAME GROUND</strong>
          <span style={{ fontSize: 13, color: "#666" }}>~{readMins} min read · {progress}% read</span>
        </div>
        <div style={{ height: 3, background: "#eee", marginTop: 8, maxWidth: 820, marginInline: "auto" }}>
          <div style={{ height: 3, width: `${progress}%`, background: "#980808" }} />
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>{agreement.title}</h1>
        <p style={{ color: "#666" }}>Version {agreement.version} · Effective {agreement.effectiveDate} · {agreement.jurisdiction}</p>

        <section style={card}>
          <h2 style={h2}>Your Information</h2>
          {([
            ["fullName", "Full Legal Name", "text"], ["email", "Email Address", "email"],
            ["phone", "Phone Number", "tel"], ["dateOfBirth", "Date of Birth", "date"],
            ["address", "Address", "text"], ["emergencyContactName", "Emergency Contact Name", "text"],
            ["emergencyContactNumber", "Emergency Contact Number", "tel"],
          ] as const).map(([key, label, type]) => (
            <label key={key} style={{ display: "block", marginBottom: 12 }}>
              <span style={lbl}>{label}</span>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={input} />
            </label>
          ))}
        </section>

        <section style={card}>
          <h2 style={h2}>Agreement</h2>
          <div onScroll={onScroll} style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            {agreement.sections.map(s => (
              <div key={s.heading} style={{ marginBottom: s.body ? 12 : 6, marginTop: s.body ? 0 : 10 }}>
                <h3 style={{ fontSize: s.body ? 14 : 16, fontWeight: 800 }}>{s.heading}</h3>
                {s.body.split("\n").filter(p => p.trim()).map((para, i) => (
                  <p key={i} style={{ fontSize: 13.5, color: "#333", lineHeight: 1.6, marginTop: 4 }}>{para}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          {([
            ["confirmAccurate", "I confirm all information provided is accurate."],
            ["agreeAgreement", "I have read and agree to the Coach Partnership Agreement."],
            ["consentESign", "I consent to electronic signatures and records."],
            ["understandTermination", "I understand GameGround may suspend or terminate my account for policy violations."],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, fontSize: 14 }}>
              <input type="checkbox" checked={checks[key]} onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))} />
              <span>{label}</span>
            </label>
          ))}
        </section>

        <section style={card}>
          <h2 style={h2}>Digital Signature</h2>
          <p style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>
            By typing your name below, you are providing a legally binding electronic signature.
          </p>
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={lbl}>Digital Signature (type your full legal name)</span>
            <input value={form.signatureName} onChange={e => setForm(f => ({ ...f, signatureName: e.target.value }))} style={input} />
          </label>
          {form.signatureName.trim() && !sigMatches && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>Signature must exactly match your full legal name.</p>
          )}
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={lbl}>Date</span>
            <input type="date" value={form.signedDate} onChange={e => setForm(f => ({ ...f, signedDate: e.target.value }))} style={input} />
          </label>
        </section>

        {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
        <button disabled={!canSubmit} onClick={submit} style={{ ...btnPrimary, width: "100%", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {submitting ? "Submitting…" : "Accept Agreement & Continue"}
        </button>
      </div>
    </main>
  );
}

export default function OnboardingTermsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
      <OnboardingTerms />
    </Suspense>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20, marginTop: 18 };
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginBottom: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: 13, color: "#444", marginBottom: 4, fontWeight: 600 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: "#980808", color: "#fff", padding: "12px 18px", borderRadius: 9, fontWeight: 700, border: "none", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { background: "#fff", color: "#111", padding: "12px 18px", borderRadius: 9, fontWeight: 700, border: "1px solid #ddd", cursor: "pointer" };
