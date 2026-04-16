"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { toast } from "sonner";
import { STORY } from "@/lib/premium-images";

function passwordStrength(pw: string): { label: string; pct: number; color: string } {
  if (!pw) return { label: "", pct: 0, color: "rgba(255,255,255,0.1)" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", pct: 15, color: "#ef4444" },
    { label: "Weak",      pct: 30, color: "#f97316" },
    { label: "Fair",      pct: 55, color: "#f59e0b" },
    { label: "Good",      pct: 80, color: "#84cc16" },
    { label: "Strong",    pct: 100, color: "#22c55e" },
  ];
  return map[Math.min(score, 4)];
}

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token") ?? "";
  const [pw, setPw]   = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(pw);
  const match = pw2 && pw === pw2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2)    { toast.error("Passwords don't match"); return; }
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    });
    setLoading(false);
    if (r.ok) { toast.success("Password reset. Please sign in."); router.push("/login"); }
    else      { const d = await r.json(); toast.error(d.error ?? "Reset failed"); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-grid">
      <div style={{ position: "relative", overflow: "hidden" }} className="auth-visual">
        <Image
          src={STORY.connect.src}
          alt={STORY.connect.alt}
          fill
          priority
          quality={85}
          sizes="50vw"
          style={{ objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.6) 50%, rgba(5,5,5,0.92) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(230,57,70,0.2) 0%, transparent 55%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          padding: "56px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", width: "fit-content" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 28px rgba(230,57,70,0.5)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Game Ground</span>
          </Link>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 18 }}>
              Almost there
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(36px, 3.5vw, 48px)",
              lineHeight: 1.05,
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-0.03em",
              maxWidth: 440,
              marginBottom: 20,
            }}>
              Set a new password.
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 420 }}>
              Use at least 8 characters with a mix of letters, numbers and symbols for the best security.
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 32px", background: "#050505",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {!token ? (
            <div style={{
              padding: "28px",
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <AlertCircle size={22} color="#ef4444" />
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Invalid reset link</h2>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 18 }}>
                This link is missing a valid token. Request a new one to continue.
              </p>
              <Link href="/forgot-password" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 42, padding: "0 18px", borderRadius: 10,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 6px 24px rgba(230,57,70,0.3)",
              }}>
                Request a new link <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "rgba(230,57,70,0.1)",
                  border: "1px solid rgba(230,57,70,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <Lock size={22} color="#e63946" />
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
                  New password
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  Make it memorable, make it strong.
                </p>
              </div>

              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <Label>New password</Label>
                  <div style={{ position: "relative" }}>
                    <Input
                      type={show ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={pw}
                      onChange={e => setPw(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: 6,
                    }}>
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pw && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${strength.pct}%`,
                          background: strength.color,
                          transition: "width 250ms ease, background 250ms ease",
                          borderRadius: 100,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: strength.color, minWidth: 62, textAlign: "right" }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    placeholder="Repeat your password"
                    value={pw2}
                    onChange={e => setPw2(e.target.value)}
                    required
                    style={{
                      borderColor: pw2 && !match ? "rgba(239,68,68,0.4)" : undefined,
                    }}
                  />
                  {pw2 && !match && (
                    <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>Passwords don&apos;t match</div>
                  )}
                </div>

                <button type="submit" disabled={loading} style={{
                  width: "100%", height: 48, borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                  color: "#fff", border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  fontFamily: "inherit",
                  marginTop: 8,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 8px 32px rgba(230,57,70,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
                  transition: "transform 150ms ease",
                }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {loading ? "Resetting…" : (<>Reset password <ArrowRight size={16} /></>)}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-visual { min-height: 240px; max-height: 300px; }
        }
      `}</style>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050505" }} />}>
      <ResetForm />
    </Suspense>
  );
}
