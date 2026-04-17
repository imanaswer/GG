"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Users, Trophy, Check } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { STORY } from "@/lib/premium-images";
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
    gsap.fromTo(targets, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "expo.out", delay: 0.15 });
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
      {/* Background image — full bleed */}
      <div className="reg-bg">
        <Image
          src={STORY.connect.src}
          alt={STORY.connect.alt}
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="reg-bg-overlay" />
      </div>

      {/* Logo */}
      <Link href="/" className="reg-logo">
        <div className="reg-logo-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <span className="reg-logo-text">Game Ground</span>
      </Link>

      {/* Centered card */}
      <div className="reg-center">
        <div ref={cardRef} className="reg-card">
          {/* Header */}
          <div data-a className="reg-header">
            <h1 className="reg-title">Create your account</h1>
            <p className="reg-subtitle">
              Join 1,200+ players in Kozhikode.{" "}
              <Link href="/login" className="reg-link">Already a member? Sign in</Link>
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
                {r === "player" ? <Users size={15} /> : <Trophy size={15} />}
                <span>{r === "player" ? "Player" : "Coach"}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="reg-form">
            <div data-a className="reg-row">
              <div className="reg-field">
                <Label>Full name</Label>
                <Input placeholder="Arjun Sharma" value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>
              <div className="reg-field">
                <Label>Username</Label>
                <div style={{ position: "relative" }}>
                  <span className="reg-at">@</span>
                  <Input
                    style={{ paddingLeft: 32 }}
                    placeholder="arjuns"
                    value={form.username}
                    onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    required
                  />
                </div>
              </div>
            </div>

            <div data-a className="reg-field">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>

            <div data-a className="reg-field">
              <Label>Password</Label>
              <div style={{ position: "relative" }}>
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
                        {strength.checks[i] && <Check size={9} />}
                        {rule}
                      </span>
                    ))}
                    <span className="reg-pw-label" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <div data-a>
              <Magnetic strength={10}>
                <button type="submit" disabled={loading} className="reg-submit">
                  <span className="reg-submit-shimmer" />
                  {loading ? "Creating account…" : (<>Get started free <ArrowRight size={16} /></>)}
                </button>
              </Magnetic>
            </div>
          </form>

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
          background: #050505;
          overflow: hidden;
        }
        .reg-bg {
          position: absolute; inset: 0; z-index: 0;
        }
        .reg-bg-overlay {
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.3) 40%, rgba(5,5,5,0.6) 100%),
            radial-gradient(ellipse 60% 50% at 50% 45%, transparent 0%, rgba(5,5,5,0.8) 100%);
          backdrop-filter: blur(2px);
        }
        .reg-logo {
          position: absolute; top: 24px; left: 28px; z-index: 20;
          display: flex; align-items: center; gap: 10; text-decoration: none;
        }
        .reg-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #e63946, #b91c2d);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 24px rgba(230,57,70,0.45);
        }
        .reg-logo-text {
          font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.03em;
        }

        .reg-center {
          position: relative; z-index: 10;
          width: 100%; max-width: 520px;
          padding: 24px;
        }
        .reg-card {
          background: rgba(12,12,12,0.85);
          backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 36px 32px 28px;
          box-shadow:
            0 32px 80px rgba(0,0,0,0.6),
            0 0 0 1px rgba(255,255,255,0.04),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .reg-header { margin-bottom: 24px; text-align: center; }
        .reg-title {
          font-size: 26px; font-weight: 800; color: #fff;
          letter-spacing: -0.03em; margin-bottom: 8px;
        }
        .reg-subtitle { font-size: 14px; color: rgba(255,255,255,0.5); }
        .reg-link {
          color: #e63946; font-weight: 600; text-decoration: none;
          margin-left: 4px;
        }
        .reg-link:hover { text-decoration: underline; }

        .reg-role-toggle {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 22px;
          background: rgba(255,255,255,0.03);
          border-radius: 14px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .reg-role-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 44px; border-radius: 11px; border: none;
          font-size: 14px; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 200ms ease;
          background: transparent; color: rgba(255,255,255,0.45);
        }
        .reg-role-btn.active {
          background: linear-gradient(135deg, rgba(230,57,70,0.15), rgba(230,57,70,0.08));
          color: #fff;
          box-shadow: 0 0 0 1px rgba(230,57,70,0.3), 0 2px 8px rgba(230,57,70,0.1);
        }
        .reg-role-btn.active svg { color: #e63946; }
        .reg-role-btn:not(.active):hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); }

        .reg-form { display: flex; flex-direction: column; gap: 14px; }
        .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .reg-field { display: flex; flex-direction: column; gap: 6px; }
        .reg-at {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.35); font-size: 14px; pointer-events: none;
        }
        .reg-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.5); background: none; border: none;
          cursor: pointer; padding: 6px;
        }

        .reg-pw-info { margin-top: 6px; }
        .reg-pw-bar-track {
          height: 3px; border-radius: 100px; background: rgba(255,255,255,0.06);
          overflow: hidden; margin-bottom: 8px;
        }
        .reg-pw-bar-fill {
          height: 100%; border-radius: 100px;
          transition: width 250ms ease, background 250ms ease;
        }
        .reg-pw-checks { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
        .reg-pw-check {
          font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 100px;
          display: flex; align-items: center; gap: 3px;
          background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.3);
          border: 1px solid rgba(255,255,255,0.05); transition: all 200ms ease;
        }
        .reg-pw-check.met {
          background: rgba(34,197,94,0.08); color: #22c55e;
          border-color: rgba(34,197,94,0.15);
        }
        .reg-pw-label {
          margin-left: auto; font-size: 11px; font-weight: 600;
        }

        .reg-submit {
          width: 100%; height: 50px; border-radius: 14px;
          font-size: 15px; font-weight: 700; font-family: inherit;
          background: linear-gradient(135deg, #e63946 0%, #b91c2d 100%);
          color: #fff; border: none; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 32px rgba(230,57,70,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
          transition: transform 150ms ease, opacity 150ms ease;
          position: relative; overflow: hidden; margin-top: 4px;
        }
        .reg-submit:hover { transform: translateY(-1px); }
        .reg-submit:active { transform: translateY(0); }
        .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .reg-submit-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
          animation: shimmer 2.5s ease infinite;
        }

        .reg-legal {
          margin-top: 18px; font-size: 12px; color: rgba(255,255,255,0.35);
          text-align: center; line-height: 1.5;
        }
        .reg-legal-link { color: rgba(255,255,255,0.55); text-decoration: none; }
        .reg-legal-link:hover { color: rgba(255,255,255,0.8); }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (max-width: 580px) {
          .reg-center { padding: 16px; }
          .reg-card { padding: 28px 20px 22px; border-radius: 20px; }
          .reg-row { grid-template-columns: 1fr; }
          .reg-title { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050505" }} />}>
      <RegisterForm />
    </Suspense>
  );
}
