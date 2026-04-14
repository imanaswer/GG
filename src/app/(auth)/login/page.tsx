"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Zap } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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
    toast.success("Welcome back! 👋");
    router.push(redirect);
  };

  const demo = async () => {
    setLoading(true);
    const err = await login("demo@gameground.com", "password123");
    setLoading(false);
    if (err) toast.error(err);
    else { toast.success("Logged in as demo user!"); router.push(redirect); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", padding: "24px 16px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(230,57,70,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20 }}>
            <img src="/logo.png" alt="Game Ground" style={{ height: 40, filter: "invert(1)" }} />
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Sign in to your account</p>
        </div>

        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 28px 24px" }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label htmlFor="pw">Password</Label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: "#e63946", textDecoration: "none", fontWeight: 500 }}>Forgot password?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <Input id="pw" type={showPw ? "text" : "password"} placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: "#e63946", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, fontFamily: "inherit", marginTop: 4,
            }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ position: "relative", margin: "20px 0" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
              <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.07)" }} />
            </div>
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <span style={{ background: "#141414", padding: "0 10px", fontSize: 12, color: "#4b5563" }}>or</span>
            </div>
          </div>

          <button onClick={demo} disabled={loading} style={{
            width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: "transparent", color: "#d1d5db",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Zap size={15} color="#e63946" />Try Demo Account
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 20 }}>
            No account?{" "}
            <Link href="/register" style={{ color: "#e63946", fontWeight: 600, textDecoration: "none" }}>Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
