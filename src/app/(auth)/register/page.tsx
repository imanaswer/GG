"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Users, Trophy, Check } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { HERO_BACKDROPS } from "@/lib/premium-images";
import { Magnetic } from "@/components/premium/Magnetic";
import { gsap } from "gsap";

type Role = "player" | "coach";

function passwordStrength(pw: string): { label: string; pct: number; color: string; checks: boolean[] } {
  if (!pw) return { label: "", pct: 0, color: "rgba(255,255,255,0.1)", checks: [false, false, false, false] };
  const checks = [pw.length >= 8, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length + (pw.length >= 12 ? 1 : 0);
  const map = [
    { label: "Too short", pct: 15, color: "#ef4444" },
    { label: "Weak", pct: 30, color: "#f97316" },
    { label: "Fair", pct: 55, color: "#f59e0b" },
    { label: "Good", pct: 80, color: "#84cc16" },
    { label: "Strong", pct: 100, color: "#22c55e" },
  ];
  return { ...map[Math.min(score, 4)], checks };
}

const PW_RULES = ["8+ chars", "Aa mixed", "Number", "Symbol"];

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("player");
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const strength = passwordStrength(form.password);

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
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const err = await register({ ...form, role });
    setLoading(false);
    if (err) { toast.error(err); return; }
    toast.success("Welcome to Game Ground");
    router.push("/");
  };

  return (
    <div className="reg-page">
      {/* Background image — sport theme */}
      <div className="reg-bg">
        <Image
          src={HERO_BACKDROPS[0].src}
          alt={HERO_BACKDROPS[0].alt}
          fill
          priority
          quality={90}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="reg-bg-overlay" />
      </div>

      {/* Decorative Orbs for Glassmorphism pop */}
      <div className="reg-orb orb-1" />
      <div className="reg-orb orb-2" />

      {/* Logo */}
      <Link href="/" className="reg-logo">
        <img src="/logo2.png" alt="Game Ground" className="reg-logo-icon" />
      </Link>

      {/* Centered card */}
      <div className="reg-center">
        <div ref={cardRef} className="reg-card">
          <div className="reg-card-glow" />
          
          {/* Header */}
          <div data-a className="reg-header">
            <h1 className="reg-title">Create your account</h1>
            <p className="reg-subtitle">
              Join the elite sports community.{" "}
              <Link href="/login" className="reg-link">Sign in instead</Link>
            </p>
          </div>

          {/* Role toggle */}
          <div data-a className="reg-role-toggle">
            {(["player", "coach"] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`reg-role-btn ${role === r ? "active" : ""}`}
              >
                {r === "player" ? <Users size={16} /> : <Trophy size={16} />}
                <span>{r === "player" ? "Player" : "Coach"}</span>
                {role === r && <div className="role-active-bg" />}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="reg-form">
            <div data-a className="reg-row">
              <div className="reg-field">
                <Label>Full name</Label>
                <div className="input-wrapper">
                  <Input placeholder="Arjun Sharma" value={form.name} onChange={e => set("name", e.target.value)} required />
                </div>
              </div>
              <div className="reg-field">
                <Label>Username</Label>
                <div className="input-wrapper">
                  <span className="reg-at">@</span>
                  <Input
                    style={{ paddingLeft: 34 }}
                    placeholder="arjuns"
                    value={form.username}
                    onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    required
                  />
                </div>
              </div>
            </div>

            <div data-a className="reg-field">
              <Label>Email address</Label>
              <div className="input-wrapper">
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
              </div>
            </div>

            <div data-a className="reg-field">
              <Label>Password</Label>
              <div className="input-wrapper">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "Hide" : "Show"} className="reg-eye">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {form.password && (
                <div className="reg-pw-info">
                  <div className="reg-pw-bar-track">
                    <div className="reg-pw-bar-fill" style={{ width: `${strength.pct}%`, background: strength.color, boxShadow: `0 0 10px ${strength.color}` }} />
                  </div>
                  <div className="reg-pw-checks">
                    {PW_RULES.map((rule, i) => (
                      <span key={rule} className={`reg-pw-check ${strength.checks[i] ? "met" : ""}`}>
                        {strength.checks[i] && <Check size={10} />}
                        {rule}
                      </span>
                    ))}
                    <span className="reg-pw-label" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <div data-a style={{ marginTop: 8 }}>
              <button type="submit" disabled={loading} className="reg-submit">
                <div className="reg-submit-bg" />
                <span className="reg-submit-text">
                  {loading ? "Creating account…" : (<>Get Started <ArrowRight size={18} /></>)}
                </span>
              </button>
            </div>
          </form>

          <div data-a className="reg-divider">
            <span className="line" />
            <span className="text">or continue with</span>
            <span className="line" />
          </div>

          <div data-a>
            <div className="google-btn-wrapper">
              <GoogleSignInButton redirect="/" label="Sign up with Google" />
            </div>
          </div>

          <p data-a className="reg-legal">
            By signing up you agree to our{" "}
            <Link href="/terms" className="reg-legal-link">Terms</Link> &{" "}
            <Link href="/privacy" className="reg-legal-link">Privacy Policy</Link>
          </p>
        </div>
      </div>

      <style>{`
        .reg-page {
          min-height: 100vh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          overflow: hidden;
          font-family: var(--font-sans), sans-serif;
        }
        .reg-bg {
          position: absolute; inset: 0; z-index: 0;
        }
        .reg-bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%);
          backdrop-filter: blur(8px);
        }
        
        .reg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 1;
          pointer-events: none;
        }
        .orb-1 {
          width: 400px; height: 400px;
          background: rgba(230, 57, 70, 0.4);
          top: -10%; left: -10%;
          animation: float 8s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 500px; height: 500px;
          background: rgba(255, 107, 53, 0.2);
          bottom: -20%; right: -10%;
          animation: float 10s ease-in-out infinite alternate-reverse;
        }
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 50px); }
        }

        .reg-logo {
          position: absolute; top: 32px; left: 40px; z-index: 20;
          transition: transform 0.3s ease;
        }
        .reg-logo:hover {
          transform: scale(1.05);
        }
        .reg-logo-icon {
          height: 40px; width: auto; display: block;
        }

        .reg-center {
          position: relative; z-index: 10;
          width: 100%; max-width: 480px;
          padding: 20px;
        }
        .reg-card {
          position: relative;
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(30px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          padding: 40px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .reg-card-glow {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(230,57,70,0.8), transparent);
          opacity: 0.6;
        }

        .reg-header { margin-bottom: 28px; text-align: left; }
        .reg-title {
          font-size: 32px; font-weight: 800; color: #fff;
          letter-spacing: -0.04em; margin-bottom: 8px;
          line-height: 1.1;
        }
        .reg-subtitle { font-size: 15px; color: #a1a1aa; }
        .reg-link {
          color: #e63946; font-weight: 600; text-decoration: none;
          transition: color 0.2s ease;
        }
        .reg-link:hover { color: #ff4d5d; }

        .reg-role-toggle {
          display: flex; gap: 8px; margin-bottom: 28px;
          background: rgba(0,0,0,0.4);
          border-radius: 16px; padding: 6px;
          border: 1px solid rgba(255,255,255,0.04);
          position: relative;
        }
        .reg-role-btn {
          flex: 1; position: relative;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 46px; border-radius: 12px; border: none;
          font-size: 15px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: color 0.3s ease;
          background: transparent; color: #71717a;
          z-index: 1;
        }
        .reg-role-btn.active { color: #fff; }
        .role-active-bg {
          position: absolute; inset: 0; z-index: -1;
          background: linear-gradient(135deg, #e63946, #b91c2d);
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(230,57,70,0.4);
        }

        .reg-form { display: flex; flex-direction: column; gap: 20px; }
        .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .reg-field { display: flex; flex-direction: column; gap: 8px; }
        .reg-field label {
          font-size: 13px; font-weight: 600; color: #d4d4d8;
          margin-left: 4px; letter-spacing: 0.02em;
        }
        
        .input-wrapper {
          position: relative;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .input-wrapper:focus-within {
          background: rgba(255,255,255,0.06);
          border-color: rgba(230,57,70,0.5);
          box-shadow: 0 0 0 4px rgba(230,57,70,0.1);
        }
        .input-wrapper input {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          height: 52px;
          font-size: 15px;
          color: #fff;
        }
        .input-wrapper input::placeholder { color: #52525b; }

        .reg-at {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: #71717a; font-size: 15px; pointer-events: none;
        }
        .reg-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: #71717a; background: none; border: none;
          cursor: pointer; padding: 8px; border-radius: 8px;
          transition: all 0.2s ease;
        }
        .reg-eye:hover { color: #fff; background: rgba(255,255,255,0.1); }

        .reg-pw-info { margin-top: 10px; }
        .reg-pw-bar-track {
          height: 4px; border-radius: 4px; background: rgba(255,255,255,0.1);
          overflow: hidden; margin-bottom: 12px;
        }
        .reg-pw-bar-fill { height: 100%; border-radius: 4px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .reg-pw-checks { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .reg-pw-check {
          font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 12px;
          display: flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,0.05); color: #71717a;
          border: 1px solid transparent; transition: all 0.3s ease;
        }
        .reg-pw-check.met {
          background: rgba(34,197,94,0.1); color: #22c55e;
          border-color: rgba(34,197,94,0.2);
        }
        .reg-pw-label { margin-left: auto; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

        .reg-submit {
          width: 100%; height: 56px; border-radius: 16px;
          font-size: 16px; font-weight: 700; font-family: inherit;
          color: #fff; border: none; cursor: pointer;
          position: relative; overflow: hidden;
          background: #e63946;
          box-shadow: 0 10px 30px -10px rgba(230,57,70,0.6);
        }
        .reg-submit-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #ff4d5d, #b91c2d);
          transition: opacity 0.3s ease;
        }
        .reg-submit:hover .reg-submit-bg { opacity: 0.8; }
        .reg-submit-text {
          position: relative; z-index: 1;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
        }
        .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .reg-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 28px 0;
        }
        .reg-divider .line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
        .reg-divider .text {
          font-size: 12px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.1em; color: #71717a;
        }

        .google-btn-wrapper {
          border-radius: 16px; overflow: hidden;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .google-btn-wrapper:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.15);
        }
        .google-btn-wrapper button {
          height: 54px !important;
          background: transparent !important;
          border: none !important;
        }

        .reg-legal {
          margin-top: 28px; font-size: 13px; color: #71717a;
          text-align: center; line-height: 1.6;
        }
        .reg-legal-link { color: #a1a1aa; text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .reg-legal-link:hover { color: #fff; text-decoration: underline; }

        @media (max-width: 580px) {
          .reg-page {
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 24px;
            overflow-y: auto;
          }
          .reg-logo {
            position: relative;
            top: 0; left: 0;
            margin-bottom: 8px;
            align-self: center;
          }
          .reg-center { padding: 16px; margin-bottom: 24px; }
          .reg-card { padding: 32px 24px; border-radius: 24px; }
          .reg-row { grid-template-columns: 1fr; }
          .reg-title { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <RegisterForm />
    </Suspense>
  );
}
