"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { gsap } from "gsap";

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_state: "Sign-in session expired. Please try again.",
  google_unverified: "Your Google email is not verified.",
  google_unconfigured: "Google sign-in is not available right now.",
  google_failed: "Google sign-in failed. Please try again.",
};

type Props = {
  /** Where to go after a successful sign-in (a `?redirect=` param wins). */
  defaultRedirect?: string;
  title?: string;
  subtitle?: React.ReactNode;
  /** When set, a signed-in account of any other role is signed straight back out. */
  requireRole?: "coach";
  showGoogle?: boolean;
  /** Small line under the card, e.g. a link to the other sign-in. */
  footerLink?: React.ReactNode;
};

export function LoginForm({ defaultRedirect = "/", title = "Welcome back.", subtitle, requireRole, showGoogle = true, footerLink }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const redirect = params.get("redirect") ?? defaultRedirect;

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
    const result = await login(email, pw);
    setLoading(false);
    if (!result.ok) { toast.error(result.error); return; }
    if (requireRole && result.user.role !== requireRole) {
      // The server still holds the real gate; this keeps a player from landing
      // on a coach page with a session that cannot use it.
      logout(false);
      toast.error("This is not a coach account. Use the player sign-in instead.");
      return;
    }
    toast.success("Welcome back to the Arena", {
      description: "You have successfully signed in.",
      icon: "⚡",
      style: { border: "1px solid rgba(255, 255, 255, 0.2)", background: "#111", color: "#fff" }
    });
    router.push(redirect);
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
            <h1 className="reg-title">{title}</h1>
            <p className="reg-subtitle">
              {subtitle ?? (<>New here?{" "}<Link href="/register" className="reg-link">Create an account</Link></>)}
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
                <Link href="/forgot-password" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", fontWeight: 600 }}>
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

            <div data-a>
              <button type="submit" disabled={loading} className="reg-submit">
                <span className="reg-submit-text">
                  {loading ? "Signing in…" : (<>Sign in <ArrowRight size={16} /></>)}
                </span>
              </button>
            </div>
          </form>

          {showGoogle && (
            <>
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
            </>
          )}

          <p data-a className="reg-legal">
            By signing in you agree to our{" "}
            <Link href="/terms" className="reg-legal-link">Terms</Link> &{" "}
            <Link href="/privacy" className="reg-legal-link">Privacy Policy</Link>
          </p>
          {footerLink && <p data-a className="reg-legal" style={{ marginTop: 16 }}>{footerLink}</p>}
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

        .reg-form { display: flex; flex-direction: column; gap: 28px; }
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

        .reg-eye {
          position: absolute; right: 0; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.3); background: none; border: none;
          cursor: pointer; padding: 4px;
          transition: color 0.2s ease;
        }
        .reg-eye:hover { color: #fff; }

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
        }
      `}</style>
    </div>
  );
}

