"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { toast } from "sonner";

function ResetForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const token   = params.get("token") ?? "";
  const [pw,    setPw]    = useState("");
  const [pw2,   setPw2]   = useState("");
  const [show,  setShow]  = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const r = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
    setLoading(false);
    if (r.ok) { toast.success("Password reset! Please sign in."); router.push("/login"); }
    else { const d = await r.json(); toast.error(d.error ?? "Reset failed"); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(230,57,70,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20 }}>
            <img src="/logo.png" alt="Game Ground" style={{ height: 40, filter: "invert(1)" }} />
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Set New Password</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Choose a strong password for your account</p>
        </div>
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px" }}>
          {!token ? (
            <p style={{ color: "#ef4444", textAlign: "center" }}>Invalid reset link. <Link href="/forgot-password" style={{ color: "#e63946" }}>Request a new one</Link></p>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>New Password</Label>
                <div style={{ position: "relative" }}>
                  <Input type={show ? "text" : "password"} placeholder="Min 8 characters" value={pw} onChange={e => setPw(e.target.value)} required style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="Repeat your password" value={pw2} onChange={e => setPw2(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return <Suspense><ResetForm /></Suspense>;
}
