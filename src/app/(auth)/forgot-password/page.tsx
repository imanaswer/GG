"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { STORY } from "@/lib/premium-images";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-grid">
      {/* Left — visual */}
      <div style={{ position: "relative", overflow: "hidden" }} className="auth-visual">
        <Image
          src={STORY.learn.src}
          alt={STORY.learn.alt}
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
              Account recovery
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
              Let&apos;s get you back in.
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 420 }}>
              Enter the email on your account and we&apos;ll send a secure reset link. Valid for 30 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 32px", background: "#050505",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none",
            marginBottom: 24, fontWeight: 500,
          }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>

          {sent ? (
            <div style={{
              padding: "32px 28px",
              background: "rgba(34,197,94,0.04)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 20,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "rgba(34,197,94,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <CheckCircle2 size={28} color="#22c55e" strokeWidth={2} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 10 }}>
                Check your inbox
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 24 }}>
                If an account exists for <strong style={{ color: "#fff" }}>{email}</strong>, we&apos;ve sent a reset link. It may take a minute to arrive.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  style={{
                    flex: 1, height: 44, borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)",
                    color: "#e5e7eb",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Try another email
                </button>
                <Link href="/login" style={{
                  flex: 1, height: 44, borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                  color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  textDecoration: "none",
                  boxShadow: "0 6px 24px rgba(230,57,70,0.3)",
                }}>
                  Back to sign in <ArrowRight size={14} />
                </Link>
              </div>
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
                  <Mail size={22} color="#e63946" />
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
                  Forgot password?
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  No worries — we&apos;ll send reset instructions to your email.
                </p>
              </div>

              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: "100%", height: 48, borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                  color: "#fff", border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  fontFamily: "inherit",
                  marginTop: 6,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 8px 32px rgba(230,57,70,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
                  transition: "transform 150ms ease",
                }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {loading ? "Sending…" : (<>Send reset link <ArrowRight size={16} /></>)}
                </button>
              </form>

              <p style={{ marginTop: 28, fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                Remembered it?{" "}
                <Link href="/login" style={{ color: "#e63946", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
              </p>
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
