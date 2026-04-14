"use client";
import { useState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setLoading(false);
    setSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(230,57,70,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20 }}>
            <img src="/logo.png" alt="Game Ground" style={{ height: 40, filter: "invert(1)" }} />
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Forgot Password</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>We'll send a reset link to your email</p>
        </div>

        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7, marginBottom: 24 }}>
                If an account exists for <strong style={{ color: "#fff" }}>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <p style={{ fontSize: 13, color: "#6b7280" }}>Didn't get it? Check your spam folder or{" "}
                <button onClick={() => setSent(false)} style={{ color: "#e63946", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}>try again</button>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Email address</Label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
              <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
                Remember it? <Link href="/login" style={{ color: "#e63946", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
