"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Save, User, Phone, MapPin, Trophy, Loader2 } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SPORTS = ["Basketball","Football","Cricket","Badminton","Tennis","Volleyball","Fitness","Running"];

type EditableProfile = {
  name: string;
  username: string;
  bio: string;
  location: string;
  phone: string;
  sports: string[];
};

export default function EditProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      fetch(`/api/users/${user.id}`).then(r => r.json()).then(d => {
        setProfile({
          name: d.name ?? "",
          username: d.username ?? "",
          bio: d.bio ?? "",
          location: d.location ?? "",
          phone: d.phone ?? "",
          sports: d.sports ?? [],
        });
      });
    }
  }, [user, loading, router]);

  if (loading || !profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505" }}>
        <NavBar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 160 }}>
          <Loader2 size={26} color="#e63946" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const set = <K extends keyof EditableProfile>(k: K, v: EditableProfile[K]) =>
    setProfile(p => (p ? { ...p, [k]: v } : p));
  const toggleSport = (s: string) =>
    set("sports", profile.sports.includes(s) ? profile.sports.filter(x => x !== s) : [...profile.sports, s]);

  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/users/${user!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (r.ok) { toast.success("Profile updated"); router.push(`/profile/${user!.id}`); }
    else      { const d = await r.json(); toast.error(d.error ?? "Failed to save"); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const r = await fetch(`/api/users/${user!.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Account deleted"); window.location.href = "/"; }
    else      { const d = await r.json(); toast.error(d.error ?? "Failed to delete account"); setDeleting(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />
      <main style={{ paddingTop: 96, paddingBottom: 80 }}>
        <div className="container-lg" style={{ maxWidth: 780 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
            <Link href={`/profile/${user!.id}`} aria-label="Back" style={{
              width: 40, height: 40, borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", color: "rgba(255,255,255,0.65)",
              transition: "all 160ms ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(230,57,70,0.08)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: 4 }}>Settings</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Edit profile</h1>
            </div>
          </div>

          {/* Basic info card */}
          <SectionCard Icon={User} title="Basic information" hint="This is what other players see on your profile.">
            <FieldRow label="Full name">
              <Input value={profile.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" />
            </FieldRow>
            <FieldRow label="Username">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>@</span>
                <Input
                  style={{ paddingLeft: 32 }}
                  value={profile.username}
                  onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="username"
                />
              </div>
            </FieldRow>
            <FieldRow label={`Bio · ${profile.bio.length}/200`}>
              <Textarea
                value={profile.bio}
                onChange={e => set("bio", e.target.value)}
                placeholder="Tell others about yourself — your game, your favourite courts, the teams you follow."
                style={{ minHeight: 100 }}
                maxLength={200}
              />
            </FieldRow>
          </SectionCard>

          {/* Contact card */}
          <SectionCard Icon={MapPin} title="Contact & location">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
              <FieldRow label="Location">
                <Input value={profile.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Kozhikode, Kerala" />
              </FieldRow>
              <FieldRow label="Phone (WhatsApp)" hint="Only shown to organisers and participants.">
                <Input
                  value={profile.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </FieldRow>
            </div>
          </SectionCard>

          {/* Sports card */}
          <SectionCard Icon={Trophy} title="Sports I play" hint="Pick everything you'd join a game for — even occasionally.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SPORTS.map(s => {
                const active = profile.sports.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSport(s)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      fontFamily: "inherit",
                      background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.02)",
                      color: active ? "#fff" : "rgba(255,255,255,0.6)",
                      borderColor: active ? "transparent" : "rgba(255,255,255,0.08)",
                      boxShadow: active ? "0 4px 14px rgba(230,57,70,0.3)" : "none",
                      transition: "all 160ms ease",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Save bar */}
          <div style={{
            display: "flex",
            gap: 12,
            padding: "18px 22px",
            background: "linear-gradient(135deg, rgba(230,57,70,0.08) 0%, rgba(11,11,11,0.9) 100%)",
            border: "1px solid rgba(230,57,70,0.15)",
            borderRadius: 18,
            marginBottom: 24,
            alignItems: "center",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Ready to save?</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>Changes apply instantly across the app.</div>
            </div>
            <Link href={`/profile/${user!.id}`} style={{
              height: 44, padding: "0 20px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.08)",
              textDecoration: "none",
              fontSize: 13, fontWeight: 600,
              display: "inline-flex", alignItems: "center",
            }}>
              Cancel
            </Link>
            <button
              onClick={save}
              disabled={saving}
              style={{
                height: 44, padding: "0 22px", borderRadius: 12,
                fontSize: 13.5, fontWeight: 700,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                color: "#fff", border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 7,
                boxShadow: "0 6px 24px rgba(230,57,70,0.35)",
              }}
            >
              <Save size={14} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          {/* Danger zone */}
          <div style={{
            padding: "22px 24px",
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 18,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertTriangle size={16} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fca5a5" }}>Danger zone</h2>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.6 }}>
              Deleting your account is permanent. Your profile, game history and bookings will be removed. Reviews you&apos;ve written will be anonymised.
            </p>
            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                style={{
                  height: 40, padding: "0 18px", borderRadius: 10,
                  fontSize: 13, fontWeight: 600,
                  background: "transparent",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.4)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Delete my account
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  style={{
                    height: 40, padding: "0 18px", borderRadius: 10,
                    fontSize: 13, fontWeight: 700,
                    background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                    color: "#fff", border: "none",
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 6px 20px rgba(239,68,68,0.3)",
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  style={{
                    height: 40, padding: "0 18px", borderRadius: 10,
                    fontSize: 13, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 780px) {
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SectionCard({
  Icon, title, hint, children,
}: {
  Icon: typeof User;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "24px 26px",
      background: "#0b0b0b",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 18,
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: hint ? 6 : 20 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(230,57,70,0.1)",
          border: "1px solid rgba(230,57,70,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color="#e63946" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      {hint && <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginBottom: 18, paddingLeft: 46 }}>{hint}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <Label>{label}</Label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}
