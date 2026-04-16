"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Users, Trophy } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { STORY } from "@/lib/premium-images";

type Role = "player" | "coach";

const ROLE_OPTIONS: { value: Role; title: string; copy: string; Icon: typeof Users }[] = [
  { value: "player", title: "I want to play",   copy: "Join games, camps, book coaches", Icon: Users  },
  { value: "coach",  title: "I want to coach",  copy: "Run sessions, build a roster",   Icon: Trophy },
];

function passwordStrength(pw: string): { label: string; pct: number; color: string } {
  if (!pw) return { label: "", pct: 0, color: "rgba(255,255,255,0.1)" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short",  pct: 15, color: "#ef4444" },
    { label: "Weak",       pct: 30, color: "#f97316" },
    { label: "Fair",       pct: 55, color: "#f59e0b" },
    { label: "Good",       pct: 80, color: "#84cc16" },
    { label: "Strong",     pct: 100, color: "#22c55e" },
  ];
  return map[Math.min(score, 4)];
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("player");
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const strength = passwordStrength(form.password);

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
    <div style={{ minHeight: "100vh", background: "#050505", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-grid">
      {/* Left — form */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 32px", background: "#050505", order: 1,
      }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Create your account</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
              Already a member?{" "}
              <Link href="/login" style={{ color: "#e63946", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>
          </div>

          {/* Role picker */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {ROLE_OPTIONS.map(({ value, title, copy, Icon }) => {
              const active = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  style={{
                    textAlign: "left",
                    padding: "14px 14px",
                    borderRadius: 14,
                    border: "1px solid",
                    borderColor: active ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.08)",
                    background: active ? "rgba(230,57,70,0.08)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 160ms ease",
                    boxShadow: active ? "0 0 0 3px rgba(230,57,70,0.1)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: active ? "rgba(230,57,70,0.2)" : "rgba(255,255,255,0.04)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={14} color={active ? "#e63946" : "rgba(255,255,255,0.6)"} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.75)" }}>{title}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.45 }}>{copy}</div>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Full name</Label>
              <Input placeholder="Arjun Sharma" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Username</Label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>@</span>
                <Input
                  style={{ paddingLeft: 32 }}
                  placeholder="arjuns"
                  value={form.username}
                  onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Password</Label>
              <div style={{ position: "relative" }}>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "Hide password" : "Show password"} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: 6,
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {form.password && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${strength.pct}%`,
                      background: strength.color,
                      transition: "width 250ms ease, background 250ms ease",
                      borderRadius: 100,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: strength.color, minWidth: 62, textAlign: "right" }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", height: 48, borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontFamily: "inherit",
              marginTop: 10,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 8px 32px rgba(230,57,70,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
              transition: "transform 150ms ease",
            }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              {loading ? "Creating account…" : (<>Create account <ArrowRight size={16} /></>)}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6 }}>
            By creating an account you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Right — visual */}
      <div style={{ position: "relative", overflow: "hidden", order: 2 }} className="auth-visual">
        <Image
          src={STORY.connect.src}
          alt={STORY.connect.alt}
          fill
          priority
          quality={85}
          sizes="50vw"
          style={{ objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(200deg, rgba(5,5,5,0.25) 0%, rgba(5,5,5,0.55) 50%, rgba(5,5,5,0.9) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 80% 30%, rgba(230,57,70,0.22) 0%, transparent 55%)",
        }} />

        <div style={{
          position: "absolute", inset: 0,
          padding: "56px 56px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          alignItems: "flex-end", textAlign: "right",
        }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Game Ground</span>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 28px rgba(230,57,70,0.5)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </Link>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 18 }}>
              Start your season
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(40px, 4vw, 56px)",
              lineHeight: 1.02,
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-0.03em",
              maxWidth: 480,
              marginLeft: "auto",
              marginBottom: 20,
            }}>
              Find your team. Own your game.
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 420, marginLeft: "auto" }}>
              Join 1,200+ players and coaches in Kozhikode. Free to start, pay when you play.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-visual { min-height: 240px; max-height: 300px; order: 0 !important; }
        }
      `}</style>
    </div>
  );
}
