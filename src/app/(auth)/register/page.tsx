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
    { label: "Too short", pct: 15, color: "#fff" },
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
    <div className="reg-page noise">
      {/* Logo */}
      <Link href="/" className="reg-logo">
        <img src="/logo2.png" alt="Game Ground" className="reg-logo-icon" />
      </Link>

      {/* Centered card */}
      <div className="reg-center">
        <div ref={cardRef} className="reg-card">
          
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
                    style={{ paddingLeft: 24 }}
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
                    <div className="reg-pw-bar-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
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

            <div data-a>
              <button type="submit" disabled={loading} className="reg-submit">
                <span className="reg-submit-text">
                  {loading ? "Creating account…" : (<>Get Started <ArrowRight size={16} /></>)}
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
          color: #fff;
          overflow: hidden;
          font-family: var(--font-sans), sans-serif;
        }
        
        .reg-logo {
          position: absolute; top: 40px; left: 40px; z-index: 20;
          transition: opacity 0.2s ease;
        }
        .reg-logo:hover { opacity: 0.7; }
        .reg-logo-icon {
          height: 32px; width: auto; display: block; filter: brightness(0) invert(1);
        }

        .reg-center {
          position: relative; z-index: 10;
          width: 100%; max-width: 440px;
          padding: 24px;
        }
        
        .reg-card {
          width: 100%;
        }

        .reg-header { margin-bottom: 40px; text-align: left; }
        .reg-title {
          font-family: var(--font-serif);
          font-size: 56px; font-weight: 400; color: #fff;
          letter-spacing: -0.03em; margin-bottom: 12px;
          line-height: 1;
        }
        .reg-subtitle { font-size: 16px; color: rgba(255,255,255,0.5); }
        .reg-link {
          color: #fff; font-weight: 600; text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.3);
          transition: border-color 0.2s ease;
        }
        .reg-link:hover { border-color: #fff; }

        .reg-role-toggle {
          display: flex; gap: 8px; margin-bottom: 28px;
          background: rgba(255,255,255,0.05);
          border-radius: 100px; padding: 4px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .reg-role-btn {
          flex: 1; position: relative;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 44px; border-radius: 100px; border: none;
          font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
          cursor: pointer; transition: all 0.3s ease;
          background: transparent; color: rgba(255,255,255,0.4);
        }
        .reg-role-btn.active { background: #fff; color: #000; }

        .reg-form { display: flex; flex-direction: column; gap: 28px; }
        .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .reg-field { display: flex; flex-direction: column; gap: 12px; }
        .reg-field label {
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        
        .input-wrapper {
          position: relative;
        }
        .input-wrapper input {
          width: 100%;
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.15) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          height: 40px;
          font-size: 16px;
          color: #fff;
          padding: 0;
          transition: border-color 0.3s;
        }
        .input-wrapper input:focus {
          border-bottom-color: #fff !important;
          outline: none;
        }
        .input-wrapper input::placeholder { color: rgba(255,255,255,0.2); font-weight: 400; }

        .reg-at {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.3); font-size: 16px; pointer-events: none;
        }
        
        .reg-eye {
          position: absolute; right: 0; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.3); background: none; border: none;
          cursor: pointer; padding: 4px;
          transition: color 0.2s ease;
        }
        .reg-eye:hover { color: #fff; }

        .reg-pw-info { margin-top: 4px; }
        .reg-pw-bar-track {
          height: 4px; border-radius: 4px; background: rgba(255,255,255,0.1);
          overflow: hidden; margin-bottom: 12px;
        }
        .reg-pw-bar-fill { height: 100%; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .reg-pw-checks { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .reg-pw-check {
          font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 100px;
          display: flex; align-items: center; gap: 4px; text-transform: uppercase;
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
          transition: all 0.3s ease;
        }
        .reg-pw-check.met {
          background: rgba(255,255,255,0.1); color: #fff;
        }
        .reg-pw-label { margin-left: auto; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

        .reg-submit {
          width: 100%; height: 56px; border-radius: 100px;
          font-size: 13px; font-weight: 700; font-family: inherit;
          color: #000; border: none; cursor: pointer;
          background: #fff;
          margin-top: 12px;
          text-transform: uppercase; letter-spacing: 0.05em;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .reg-submit:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(255,255,255,0.15); }
        .reg-submit-text { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

        .reg-divider {
          display: flex; align-items: center; gap: 16px;
          margin: 36px 0;
        }
        .reg-divider .line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
        .reg-divider .text {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: rgba(255,255,255,0.3);
        }

        .google-btn-wrapper {
          border-radius: 100px; overflow: hidden;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
        }
        .google-btn-wrapper:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.4);
        }
        .google-btn-wrapper button {
          height: 56px !important;
          background: transparent !important;
          border: none !important;
          width: 100%;
        }
        .google-btn-wrapper button span {
          color: #fff !important; font-weight: 600 !important;
        }

        .reg-legal {
          margin-top: 48px; font-size: 12px; color: rgba(255,255,255,0.3);
          text-align: center; line-height: 1.6;
        }
        .reg-legal-link { color: rgba(255,255,255,0.5); text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.2); transition: color 0.2s, border-color 0.2s; }
        .reg-legal-link:hover { color: #fff; border-color: #fff; }

        @media (max-width: 600px) {
          .reg-page { padding-top: 80px; align-items: flex-start; }
          .reg-logo { top: 24px; left: 24px; }
          .reg-title { font-size: 44px; }
          .reg-row { grid-template-columns: 1fr; }
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
