"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { STORY } from "@/lib/premium-images";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const redirect = params.get("redirect") ?? "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const err = await login(email, pw);
    setLoading(false);
    if (err) { toast.error(err); return; }
    toast.success("Welcome back");
    router.push(redirect);
  };

  const demo = async () => {
    setLoading(true);
    const err = await login("demo@gameground.com", "password123");
    setLoading(false);
    if (err) toast.error(err);
    else { toast.success("Logged in as demo"); router.push(redirect); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-grid">
      {/* Left — atmospheric image */}
      <div style={{ position: "relative", overflow: "hidden" }} className="auth-visual">
        <Image
          src={STORY.play.src}
          alt={STORY.play.alt}
          fill
          priority
          quality={85}
          sizes="50vw"
          style={{ objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, rgba(5,5,5,0.25) 0%, rgba(5,5,5,0.55) 50%, rgba(5,5,5,0.9) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(230,57,70,0.22) 0%, transparent 55%)",
        }} />

        <div style={{
          position: "absolute", inset: 0,
          padding: "56px 56px",
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
              Kozhikode&apos;s home for sport
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(40px, 4vw, 56px)",
              lineHeight: 1.02,
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-0.03em",
              maxWidth: 480,
              marginBottom: 20,
            }}>
              Welcome back to the court.
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 420 }}>
              Pick up tonight&apos;s game, book your coach, or sign up for the season. Your kit is ready.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 32px", position: "relative",
        background: "#050505",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }} className="auth-form-header">
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Sign in</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
              New here?{" "}
              <Link href="/register" style={{ color: "#e63946", fontWeight: 600, textDecoration: "none" }}>
                Create an account
              </Link>
            </p>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label htmlFor="pw">Password</Label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textDecoration: "none", fontWeight: 500 }}>
                  Forgot?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <Input id="pw" type={showPw ? "text" : "password"} placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "Hide password" : "Show password"} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: 6,
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              transition: "transform 150ms ease, box-shadow 200ms ease",
            }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              {loading ? "Signing in…" : (<>Sign in <ArrowRight size={16} /></>)}
            </button>
          </form>

          <div style={{ position: "relative", margin: "24px 0" }}>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#050505", padding: "0 14px" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>or</span>
            </div>
          </div>

          <button onClick={demo} disabled={loading} style={{
            width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: "rgba(255,255,255,0.03)",
            color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 150ms ease, border-color 150ms ease",
          }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.background = "rgba(230,57,70,0.06)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(230,57,70,0.25)";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <Zap size={15} color="#e63946" />
            Try the demo account
          </button>

          <p style={{ marginTop: 28, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6 }}>
            By signing in you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-visual { min-height: 260px; max-height: 320px; }
          .auth-visual [class*="padding"] { padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050505" }} />}>
      <LoginForm />
    </Suspense>
  );
}
