"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { toast } from "sonner";
import { HERO_BACKDROPS } from "@/lib/premium-images";
import { gsap } from "gsap";

function passwordStrength(pw: string): { label: string; pct: number; color: string } {
  if (!pw) return { label: "", pct: 0, color: "rgba(255,255,255,0.1)" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", pct: 15, color: "#fff" },
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
  const cardRef = useRef<HTMLDivElement>(null);

  const strength = passwordStrength(pw);
  const match = pw2 && pw === pw2;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const targets = el.querySelectorAll("[data-a]");
    gsap.fromTo(targets, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.1 });
    
    gsap.fromTo(".reg-orb", 
      { scale: 0.8, opacity: 0 }, 
      { scale: 1, opacity: 0.6, duration: 2, ease: "power2.out" }
    );
  }, []);

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
    <div className="reg-page">
      <div className="reg-bg">
        <Image
          src={HERO_BACKDROPS[3]?.src || HERO_BACKDROPS[1].src}
          alt="Reset Password"
          fill
          priority
          quality={90}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="reg-bg-overlay" />
      </div>

      <div className="reg-orb orb-1" />
      <div className="reg-orb orb-2" />

      <Link href="/" className="reg-logo">
        <img src="/logo2.png" alt="Game Ground" className="reg-logo-icon" />
      </Link>

      <div className="reg-center">
        <div ref={cardRef} className="reg-card">
          <div className="reg-card-glow" />

          {!token ? (
            <div className="sent-container">
              <div data-a className="sent-icon-wrapper" style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }}>
                <AlertCircle size={32} color="#fff" strokeWidth={2} />
              </div>
              <h1 data-a className="reg-title" style={{ textAlign: "center", marginBottom: 16 }}>
                Invalid reset link
              </h1>
              <p data-a className="reg-subtitle" style={{ textAlign: "center", marginBottom: 32, lineHeight: 1.6 }}>
                This link is missing a valid token or has expired. Request a new one to continue.
              </p>
              <div data-a className="sent-actions">
                <Link href="/forgot-password" className="reg-submit" style={{ display: "inline-flex", textDecoration: "none", width: "100%" }}>
                  <div className="reg-submit-bg" />
                  <span className="reg-submit-text">Request a new link <ArrowRight size={16} /></span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div data-a className="reg-header">
                <div className="icon-badge">
                  <Lock size={22} color="#fff" />
                </div>
                <h1 className="reg-title" style={{ fontSize: 32 }}>New password</h1>
                <p className="reg-subtitle">
                  Make it memorable, make it strong.
                </p>
              </div>

              <form onSubmit={submit} className="reg-form">
                <div data-a className="reg-field">
                  <Label>New password</Label>
                  <div className="input-wrapper">
                    <Input
                      type={show ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={pw}
                      onChange={e => setPw(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} className="reg-eye">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pw && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <div className="strength-bar-bg">
                        <div className="strength-bar-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
                      </div>
                      <span className="strength-label" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div data-a className="reg-field">
                  <Label>Confirm password</Label>
                  <div className="input-wrapper" style={{ borderColor: pw2 && !match ? "rgba(255,255,255,0.5)" : undefined }}>
                    <Input
                      type="password"
                      placeholder="Repeat your password"
                      value={pw2}
                      onChange={e => setPw2(e.target.value)}
                      required
                    />
                  </div>
                  {pw2 && !match && (
                    <div style={{ fontSize: 13, color: "#fff", marginTop: 4, fontWeight: 500 }}>Passwords don&apos;t match</div>
                  )}
                </div>

                <div data-a style={{ marginTop: 8 }}>
                  <button type="submit" disabled={loading} className="reg-submit">
                    <div className="reg-submit-bg" />
                    <span className="reg-submit-text">
                      {loading ? "Resetting…" : (<>Reset password <ArrowRight size={18} /></>)}
                    </span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .reg-page {
          min-height: 100vh; position: relative;
          display: flex; align-items: center; justify-content: center;
          background: #000; overflow: hidden;
          font-family: var(--font-sans), sans-serif;
        }
        .reg-bg { position: absolute; inset: 0; z-index: 0; }
        .reg-bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%);
          backdrop-filter: blur(8px);
        }
        
        .reg-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); z-index: 1; pointer-events: none;
        }
        .orb-1 {
          width: 400px; height: 400px; background: rgba(255,255,255, 0.4);
          top: -10%; left: -10%; animation: float 8s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 500px; height: 500px; background: rgba(255, 107, 53, 0.2);
          bottom: -20%; right: -10%; animation: float 10s ease-in-out infinite alternate-reverse;
        }
        @keyframes float { 0% { transform: translate(0, 0); } 100% { transform: translate(30px, 50px); } }

        .reg-logo {
          position: absolute; top: 32px; left: 40px; z-index: 20; transition: transform 0.3s ease;
        }
        .reg-logo:hover { transform: scale(1.05); }
        .reg-logo-icon { height: 40px; width: auto; display: block; }

        .reg-center { position: relative; z-index: 10; width: 100%; max-width: 460px; padding: 20px; }
        
        .reg-card {
          position: relative; background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(30px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 28px;
          padding: 44px 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .reg-card-glow {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); opacity: 0.6;
        }

        .icon-badge {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
        }

        .reg-header { margin-bottom: 32px; }
        .reg-title {
          font-family: var(--font-serif); font-size: 38px; font-weight: 500; color: #fff;
          letter-spacing: -0.04em; margin-bottom: 12px; line-height: 1.1;
        }
        .reg-subtitle { font-size: 15px; color: #a1a1aa; line-height: 1.5; }

        .reg-form { display: flex; flex-direction: column; gap: 24px; }
        .reg-field { display: flex; flex-direction: column; gap: 8px; }
        .reg-field label { font-size: 13px; font-weight: 600; color: #d4d4d8; margin-left: 4px; }
        
        .input-wrapper {
          position: relative; border-radius: 14px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); transition: all 0.3s ease;
        }
        .input-wrapper:focus-within {
          background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.5);
          box-shadow: 0 0 0 4px rgba(255,255,255,0.1);
        }
        .input-wrapper input {
          background: transparent !important; border: none !important; box-shadow: none !important;
          height: 52px; font-size: 15px; color: #fff;
        }

        .reg-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: #71717a; background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px;
          transition: all 0.2s ease;
        }
        .reg-eye:hover { color: #fff; background: rgba(255,255,255,0.1); }
        
        .strength-bar-bg { flex: 1; height: 4px; border-radius: 100px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .strength-bar-fill { height: 100%; border-radius: 100px; transition: width 250ms ease, background 250ms ease; }
        .strength-label { font-size: 12px; font-weight: 600; min-width: 62px; text-align: right; }
        
        .reg-submit {
          width: 100%; height: 56px; border-radius: 16px; font-size: 16px; font-weight: 700;
          color: #fff; border: none; cursor: pointer; position: relative; overflow: hidden;
          background: #fff; box-shadow: 0 10px 30px -10px rgba(255,255,255,0.6);
        }
        .reg-submit-bg {
          position: absolute; inset: 0; background: linear-gradient(135deg, #ff4d5d, #fff); transition: opacity 0.3s ease;
        }
        .reg-submit:hover .reg-submit-bg { opacity: 0.8; }
        .reg-submit-text { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
        .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .sent-container { display: flex; flex-direction: column; align-items: center; }
        .sent-icon-wrapper {
          width: 64px; height: 64px; border-radius: 20px; background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2); display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }
        .sent-actions { display: flex; gap: 12px; width: 100%; margin-top: 8px; }

        @media (max-width: 580px) {
          .reg-page { flex-direction: column; justify-content: flex-start; padding-top: 24px; overflow-y: auto; }
          .reg-logo { position: relative; top: 0; left: 0; margin-bottom: 8px; align-self: center; }
          .reg-center { padding: 16px; margin-bottom: 24px; }
          .reg-card { padding: 36px 24px; border-radius: 24px; }
          .reg-title { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <ResetForm />
    </Suspense>
  );
}
