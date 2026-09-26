"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { HERO_BACKDROPS } from "@/lib/premium-images";
import { gsap } from "gsap";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const targets = el.querySelectorAll("[data-a]");
    gsap.fromTo(targets, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.1 });
    
    gsap.fromTo(".reg-orb", 
      { scale: 0.8, opacity: 0 }, 
      { scale: 1, opacity: 0.6, duration: 2, ease: "power2.out" }
    );
  }, [sent]); // Re-run animation when state changes to 'sent'

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
    <div className="reg-page">
      {/* Background image */}
      <div className="reg-bg">
        <Image
          src={HERO_BACKDROPS[2]?.src || HERO_BACKDROPS[0].src}
          alt="Recovery"
          fill
          priority
          quality={90}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="reg-bg-overlay" />
      </div>

      {/* Decorative Orbs */}
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

          {sent ? (
            <div className="sent-container">
              <div data-a className="sent-icon-wrapper">
                <CheckCircle2 size={32} color="#22c55e" strokeWidth={2} />
              </div>
              <h1 data-a className="reg-title" style={{ textAlign: "center", marginBottom: 16 }}>
                Check your inbox
              </h1>
              <p data-a className="reg-subtitle" style={{ textAlign: "center", marginBottom: 32, lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: "#fff" }}>{email}</strong>, we&apos;ve sent a secure reset link. It may take a minute to arrive.
              </p>
              <div data-a className="sent-actions">
                <button onClick={() => { setSent(false); setEmail(""); }} className="secondary-btn">
                  Try another email
                </button>
                <Link href="/login" className="reg-submit" style={{ display: "inline-flex", textDecoration: "none", flex: 1 }}>
                  <div className="reg-submit-bg" />
                  <span className="reg-submit-text">Back to sign in <ArrowRight size={16} /></span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div data-a className="reg-header">
                <div className="icon-badge">
                  <Mail size={22} color="#fff" />
                </div>
                <h1 className="reg-title" style={{ fontSize: 32 }}>Forgot password?</h1>
                <p className="reg-subtitle">
                  No worries — we&apos;ll send reset instructions to your email.
                </p>
              </div>

              <form onSubmit={submit} className="reg-form">
                <div data-a className="reg-field">
                  <Label>Email address</Label>
                  <div className="input-wrapper">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div data-a style={{ marginTop: 8 }}>
                  <button type="submit" disabled={loading} className="reg-submit">
                    <div className="reg-submit-bg" />
                    <span className="reg-submit-text">
                      {loading ? "Sending…" : (<>Send reset link <ArrowRight size={18} /></>)}
                    </span>
                  </button>
                </div>
              </form>

              <div data-a className="reg-footer">
                <Link href="/login" className="back-link">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
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

        .reg-footer { margin-top: 32px; display: flex; justify-content: center; }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600;
          color: #a1a1aa; text-decoration: none; transition: color 0.2s ease;
        }
        .back-link:hover { color: #fff; }

        .sent-container { display: flex; flex-direction: column; align-items: center; }
        .sent-icon-wrapper {
          width: 64px; height: 64px; border-radius: 20px; background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2); display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }
        .sent-actions { display: flex; gap: 12px; width: 100%; margin-top: 8px; }
        .secondary-btn {
          flex: 1; height: 56px; border-radius: 16px; font-size: 15px; font-weight: 600;
          background: rgba(255,255,255,0.05); color: #e5e7eb; border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center;
        }
        .secondary-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: #fff; }

        @media (max-width: 580px) {
          .reg-page { flex-direction: column; justify-content: flex-start; padding-top: 24px; overflow-y: auto; }
          .reg-logo { position: relative; top: 0; left: 0; margin-bottom: 8px; align-self: center; }
          .reg-center { padding: 16px; margin-bottom: 24px; }
          .reg-card { padding: 36px 24px; border-radius: 24px; }
          .reg-title { font-size: 28px !important; }
          .sent-actions { flex-direction: column-reverse; }
        }
      `}</style>
    </div>
  );
}
