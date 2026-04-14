"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const SPORTS = ["Basketball","Football","Cricket","Badminton","Tennis","Volleyball","Fitness","Running"];
const S = (style: React.CSSProperties) => style;

export default function EditProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<{ name:string; username:string; bio:string; location:string; phone:string; sports:string[]; } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      fetch(`/api/users/${user.id}`).then(r => r.json()).then(d => {
        setProfile({ name: d.name ?? "", username: d.username ?? "", bio: d.bio ?? "", location: d.location ?? "", phone: d.phone ?? "", sports: d.sports ?? [] });
      });
    }
  }, [user, loading, router]);

  if (loading || !profile) return <div style={{ minHeight: "100vh", background: "#080808" }}><NavBar /></div>;

  const set = (k: string, v: string | string[]) => setProfile(p => p ? { ...p, [k]: v } : p);
  const toggleSport = (s: string) => set("sports", profile.sports.includes(s) ? profile.sports.filter(x => x !== s) : [...profile.sports, s]);

  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/users/${user!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    setSaving(false);
    if (r.ok) { toast.success("Profile updated!"); router.push(`/profile/${user!.id}`); }
    else { const d = await r.json(); toast.error(d.error ?? "Failed to save"); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const r = await fetch(`/api/users/${user!.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Account deleted"); window.location.href = "/"; }
    else { const d = await r.json(); toast.error(d.error ?? "Failed to delete account"); setDeleting(false); }
  };

  const card = S({ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px", marginBottom: 16 });
  const sectionTitle = (title: string) => <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>{title}</h2>;
  const field = (label: string, el: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <Label>{label}</Label>{el}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Link href={`/profile/${user!.id}`} style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Edit Profile</h1>
            <p style={{ fontSize: 13, color: "#6b7280" }}>Your information is only visible to you and relevant parties</p>
          </div>
        </div>

        {/* Basic info */}
        <div style={card}>
          {sectionTitle("Basic Information")}
          {field("Full Name", <Input value={profile.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" />)}
          {field("Username", (
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563", fontSize: 14 }}>@</span>
              <Input style={{ paddingLeft: 28 }} value={profile.username} onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="username" />
            </div>
          ))}
          {field("Bio", <Textarea value={profile.bio} onChange={e => set("bio", e.target.value)} placeholder="Tell others about yourself (max 200 characters)" style={{ minHeight: 80 }} maxLength={200} />)}
          {field("Location", <Input value={profile.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Kozhikode, Kerala" />)}
          {field("Phone (WhatsApp)", <Input value={profile.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />)}
          <p style={{ fontSize: 11, color: "#4b5563", marginTop: -6 }}>Your phone is only shown to game organisers and fellow participants, never publicly.</p>
        </div>

        {/* Sports */}
        <div style={card}>
          {sectionTitle("Sports I Play")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SPORTS.map(s => (
              <button key={s} type="button" onClick={() => toggleSport(s)} style={{
                padding: "7px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                background: profile.sports.includes(s) ? "#e63946" : "transparent",
                color:      profile.sports.includes(s) ? "#fff" : "#9ca3af",
                borderColor:profile.sports.includes(s) ? "#e63946" : "rgba(255,255,255,0.1)",
                transition: "all 0.15s",
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={save} disabled={saving} style={{ width: "100%", height: 48, borderRadius: 11, fontSize: 15, fontWeight: 800, background: "#e63946", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit", boxShadow: "0 4px 18px rgba(230,57,70,0.3)", marginBottom: 16 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <Link href={`/profile/${user!.id}`} style={{ display: "block", textAlign: "center", fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Cancel</Link>

        {/* Danger zone */}
        <div style={{ ...card, marginTop: 32, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <AlertTriangle size={16} color="#ef4444" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>Danger Zone</h2>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>
            Deleting your account is permanent. Your profile, game history, and bookings will be removed. Reviews you wrote will be anonymised.
          </p>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)", cursor: "pointer", fontFamily: "inherit" }}>
              Delete My Account
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={deleteAccount} disabled={deleting} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#ef4444", color: "#fff", border: "none", cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {deleting ? "Deleting…" : "Yes, Delete Everything"}
              </button>
              <button onClick={() => setShowDelete(false)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
