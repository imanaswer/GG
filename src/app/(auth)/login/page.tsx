"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { HERO_BACKDROPS } from "@/lib/premium-images";
import { Magnetic } from "@/components/premium/Magnetic";
import { gsap } from "gsap";

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_state: "Sign-in session expired. Please try again.",
  google_unverified: "Your Google email is not verified.",
  google_unconfigured: "Google sign-in is not available right now.",
  google_failed: "Google sign-in failed. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const redirect = params.get("redirect") ?? "/";

  useEffect(() => {
    const err = params.get("error");
    if (err) toast.error(GOOGLE_ERRORS[err] ?? "Sign-in failed. Please try again.");
  }, [params]);

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
    setLoading(true);
    const err = await login(email, pw);
    setLoading(false);
    if (err) { toast.error(err); return; }
    toast.success("Welcome back");
    router.push(redirect);
  };


  return (
    <div className="reg-page">
      {/* Background image — sport theme */}
      <div className="reg-bg">
        <Image
          src={HERO_BACKDROPS[1].src} // Basketball court at night for login
          alt={HERO_BACKDROPS[1].alt}
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
            <h1 className="reg-title">Welcome back.</h1>
            <p className="reg-subtitle">
              New here?{" "}
              <Link href="/register" className="reg-link">Create an account</Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="reg-form">
            <div data-a className="reg-field">
              <Label>Email address</Label>
              <div className="input-wrapper">
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div data-a className="reg-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label>Password</Label>
                <Link href="/forgot-password" style={{ fontSize: 13, color: "#a1a1aa", textDecoration: "none", fontWeight: 500, marginRight: 4 }}>
                  Forgot?
                </Link>
              </div>
              <div className="input-wrapper">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "Hide password" : "Show password"} className="reg-eye">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div data-a style={{ marginTop: 8 }}>
              <button type="submit" disabled={loading} className="reg-submit">
                <div className="reg-submit-bg" />
                <span className="reg-submit-text">
                  {loading ? "Signing in…" : (<>Sign in <ArrowRight size={18} /></>)}
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
              <GoogleSignInButton redirect={redirect} label="Sign in with Google" />
            </div>
          </div>



          <p data-a className="reg-legal">
            By signing in you agree to our{" "}
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
          background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%);
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
          background: rgba(152, 8, 8, 0.4);
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
          width: 100%; max-width: 440px;
          padding: 20px;
        }
        .reg-card {
          position: relative;
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(30px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          padding: 44px 40px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .reg-card-glow {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(152,8,8,0.8), transparent);
          opacity: 0.6;
        }

        .reg-header { margin-bottom: 32px; text-align: left; }
        .reg-title {
          font-family: var(--font-serif);
          font-size: 38px; font-weight: 500; color: #fff;
          letter-spacing: -0.04em; margin-bottom: 8px;
          line-height: 1.1;
        }
        .reg-subtitle { font-size: 15px; color: #a1a1aa; }
        .reg-link {
          color: #980808; font-weight: 600; text-decoration: none;
          transition: color 0.2s ease;
        }
        .reg-link:hover { color: #bb1a1a; }

        .reg-form { display: flex; flex-direction: column; gap: 20px; }
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
          border-color: rgba(152,8,8,0.5);
          box-shadow: 0 0 0 4px rgba(152,8,8,0.1);
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

        .reg-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: #71717a; background: none; border: none;
          cursor: pointer; padding: 8px; border-radius: 8px;
          transition: all 0.2s ease;
        }
        .reg-eye:hover { color: #fff; background: rgba(255,255,255,0.1); }

        .reg-submit {
          width: 100%; height: 56px; border-radius: 16px;
          font-size: 16px; font-weight: 700; font-family: inherit;
          color: #fff; border: none; cursor: pointer;
          position: relative; overflow: hidden;
          background: #980808;
          box-shadow: 0 10px 30px -10px rgba(152,8,8,0.6);
        }
        .reg-submit-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #bb1a1a, #6b0505);
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

        .demo-btn {
          width: 100%; height: 54px; border-radius: 16px;
          font-size: 15px; font-weight: 600; font-family: inherit;
          color: #d4d4d8; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02); cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.3s ease;
        }
        .demo-btn:hover {
          background: rgba(152,8,8,0.08);
          border-color: rgba(152,8,8,0.3);
          color: #fff;
        }
        .demo-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .reg-legal {
          margin-top: 32px; font-size: 13px; color: #71717a;
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
          .reg-card { padding: 36px 24px; border-radius: 24px; }
          .reg-title { font-size: 32px; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <LoginForm />
    </Suspense>
  );
}
