  "use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const r = await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() || undefined, password: pw }) });
    setLoading(false);
    if (r.ok) router.push("/admin");
    else setError("Invalid credentials. Contact the platform admin.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <img src="/logo2.png" alt="Game Ground" style={{ height: 48, width: "auto", margin: "0 auto 24px", display: "block", filter: "brightness(0) invert(1)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <Shield size={14} color="rgba(255,255,255,0.4)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Admin Access</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "0.01em", marginBottom: 12 }}>Dashboard Login</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Restricted to authorised team members only.</p>
        </div>

        {/* Form */}
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email</label>
            <input
              type="email"
              placeholder="you@gameground.net"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              style={{ 
                width: "100%", height: 50, padding: "0 16px", 
                background: "transparent", 
                border: "none",
                borderBottom: `1px solid ${error ? "#fff" : "rgba(255,255,255,0.2)"}`, 
                color: "#fff", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                transition: "border-color 200ms ease"
              }}
              onFocus={e => { if(!error) e.currentTarget.style.borderColor = "#fff"; }}
              onBlur={e => { if(!error) e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Optional — leave blank to use the shared password.</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                required
                style={{ 
                  width: "100%", height: 50, padding: "0 48px 0 16px", 
                  background: "transparent", 
                  border: "none",
                  borderBottom: `1px solid ${error ? "#fff" : "rgba(255,255,255,0.2)"}`, 
                  color: "#fff", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                  transition: "border-color 200ms ease"
                }}
                onFocus={e => { if(!error) e.currentTarget.style.borderColor = "#fff"; }}
                onBlur={e => { if(!error) e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              />
              <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p style={{ fontSize: 13, color: "#fff", marginTop: 4 }}>{error}</p>}
          </div>

          <button type="submit" disabled={loading} style={{ 
            height: 56, borderRadius: 100, fontSize: 15, fontWeight: 600, 
            background: "#fff", color: "#000", border: "none", 
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, 
            fontFamily: "inherit", marginTop: 16,
            transition: "opacity 200ms ease, transform 200ms ease"
          }}>
            {loading ? "Verifying…" : "Access Dashboard"}
          </button>
        </form>
        
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 40 }}>
          Session expires after 60 minutes of inactivity
        </p>

      </div>
    </div>
  );
}
