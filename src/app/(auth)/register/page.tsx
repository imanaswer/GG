"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState<"player" | "coach">("player");
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const err = await register({ ...form, role });
    setLoading(false);
    if (err) { toast.error(err); return; }
    toast.success("Welcome to Game Ground! 🎉");
    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", padding: "24px 16px", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(230,57,70,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20 }}>
            <img src="/logo.png" alt="Game Ground" style={{ height: 40, filter: "invert(1)" }} />
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Create account</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Join the Kozhikode sports community</p>
        </div>

        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 28px 24px" }}>
          {/* Role selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {[{ v: "player", l: "I want to Play", e: "🏃" }, { v: "coach", l: "I want to Coach", e: "🎓" }].map(({ v, l, e }) => (
              <button key={v} type="button" onClick={() => setRole(v as "player" | "coach")} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "14px 10px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontFamily: "inherit",
                background: role === v ? "rgba(230,57,70,0.1)" : "transparent",
                borderColor: role === v ? "rgba(230,57,70,0.35)" : "rgba(255,255,255,0.08)",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 22 }}>{e}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: role === v ? "#fff" : "#6b7280" }}>{l}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Label>Full Name</Label>
              <Input placeholder="Arjun Sharma" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Label>Username</Label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563", fontSize: 14 }}>@</span>
                <Input style={{ paddingLeft: 28 }} placeholder="arjuns" value={form.username}
                  onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Label>Password</Label>
              <div style={{ position: "relative" }}>
                <Input type={showPw ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={e => set("password", e.target.value)} required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: "#e63946", color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, fontFamily: "inherit", marginTop: 6,
            }}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 20 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#e63946", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
