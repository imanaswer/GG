"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [pw,      setPw]      = useState("");
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const r = await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    setLoading(false);
    if (r.ok) router.push("/admin");
    else setError("Invalid password. Contact the platform admin.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(230,57,70,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="Game Ground" style={{ height: 48, filter: "invert(1)", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <Shield size={16} color="#e63946" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin Access</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Dashboard Login</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Restricted to authorised team members only</p>
        </div>

        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px" }}>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Admin Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, padding: "0 44px 0 14px", borderRadius: 9, border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, background: "#1c1c1c", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
            </div>
            <button type="submit" disabled={loading} style={{ height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
              {loading ? "Verifying…" : "Access Dashboard"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 11, color: "#4b5563", marginTop: 20 }}>
            Session expires after 60 minutes of inactivity
          </p>
        </div>
      </div>
    </div>
  );
}
