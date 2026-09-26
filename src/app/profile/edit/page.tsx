"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertTriangle, Loader2, Check, Upload, ArrowRight } from "lucide-react";
import { PremiumNav } from "@/components/premium/PremiumNav";
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
  avatarUrl: string;
};

const AVATAR_SEEDS = ["ace", "rally", "striker", "dunk", "splash", "spike", "racket", "pitch", "court", "goal", "champ", "rookie"];
const AVATAR_OPTIONS = AVATAR_SEEDS.map(seed => `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`);

export default function EditProfile() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      fetch(`/api/users/${user.id}`).then(r => r.json()).then(json => {
        const d = json.data ?? json;
        setProfile({
          name: d.name ?? "",
          username: d.username ?? "",
          bio: d.bio ?? "",
          location: d.location ?? "",
          phone: d.phone ?? "",
          sports: d.sports ?? [],
          avatarUrl: d.avatarUrl ?? "",
        });
      });
    }
  }, [user, loading, router]);

  if (loading || !profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505" }}>
        <PremiumNav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 160 }}>
          <Loader2 size={22} color="rgba(255,255,255,0.3)" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const set = <K extends keyof EditableProfile>(k: K, v: EditableProfile[K]) =>
    setProfile(p => (p ? { ...p, [k]: v } : p));
  const toggleSport = (s: string) =>
    set("sports", profile.sports.includes(s) ? profile.sports.filter(x => x !== s) : [...profile.sports, s]);

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "gameground/avatars");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Upload failed");
      set("avatarUrl", json.data?.url ?? json.url);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/users/${user!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (r.ok) { toast.success("Profile updated"); await refreshUser(); router.push(`/profile/${user!.id}`); }
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
      <PremiumNav />
      <main style={{ paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ marginBottom: 56 }}>
            <Link href={`/profile/${user!.id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 13, color: "rgba(255,255,255,0.4)",
              textDecoration: "none", marginBottom: 20,
              transition: "color 200ms ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
            >
              <ArrowLeft size={14} /> Back to profile
            </Link>
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "#fff",
              margin: 0,
              textTransform: "uppercase",
            }}>
              Edit Profile
            </h1>
          </div>

          {/* ── Avatar ── */}
          <Section label="Avatar">
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "#111",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 28, fontWeight: 800,
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.1)",
                flexShrink: 0, fontFamily: "var(--font-serif)",
              }}>
                {profile.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt="Current avatar" width={80} height={80} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (profile.name?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: "10px 18px", borderRadius: 6,
                    fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                    background: "#fff",
                    color: "#050505",
                    border: "none",
                    cursor: uploading ? "not-allowed" : "pointer",
                    opacity: uploading ? 0.5 : 1,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  {uploading
                    ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</>
                    : <><Upload size={13} /> Upload photo</>}
                </button>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => set("avatarUrl", "")}
                    style={{
                      padding: "10px 18px", borderRadius: 6,
                      fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                      background: "transparent",
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              gap: 10,
            }}>
              {AVATAR_OPTIONS.map(url => {
                const selected = profile.avatarUrl === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => set("avatarUrl", url)}
                    aria-label="Select avatar"
                    aria-pressed={selected}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "50%",
                      padding: 2,
                      background: selected ? "#fff" : "transparent",
                      border: selected ? "none" : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "transform 160ms, opacity 160ms",
                      fontFamily: "inherit",
                      opacity: selected ? 1 : 0.6,
                    }}
                    className="avatar-option"
                  >
                    <div style={{
                      width: "100%", height: "100%", borderRadius: "50%",
                      overflow: "hidden", background: "#0d0d0d",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Image src={url} alt="Avatar option" width={64} height={64} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    {selected && (
                      <span style={{
                        position: "absolute", bottom: -1, right: -1,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "#fff",
                        border: "2px solid #050505",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Check size={10} strokeWidth={3} color="#050505" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <style>{`
              .avatar-option:hover { transform: translateY(-2px); opacity: 1 !important; }
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </Section>

          {/* ── Basic Info ── */}
          <Section label="Basic Information">
            <FieldRow label="Full name">
              <Input value={profile.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" />
            </FieldRow>
            <FieldRow label="Username">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>@</span>
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
          </Section>

          {/* ── Contact ── */}
          <Section label="Contact & Location">
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
          </Section>

          {/* ── Sports ── */}
          <Section label="Sports I Play">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SPORTS.map(s => {
                const active = profile.sports.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSport(s)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      fontFamily: "inherit",
                      background: active ? "#fff" : "transparent",
                      color: active ? "#050505" : "rgba(255,255,255,0.5)",
                      borderColor: active ? "#fff" : "rgba(255,255,255,0.1)",
                      transition: "all 200ms ease",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Save ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: 32, paddingBottom: 32,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 48,
          }}>
            <Link href={`/profile/${user!.id}`} style={{
              fontSize: 13, fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
            }}>
              Cancel
            </Link>
            <button
              onClick={save}
              disabled={saving}
              style={{
                height: 48, padding: "0 32px", borderRadius: 6,
                fontSize: 14, fontWeight: 700,
                background: "#fff",
                color: "#050505",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 8,
                letterSpacing: "-0.01em",
              }}
            >
              {saving ? "Saving…" : "Save changes"} <ArrowRight size={15} />
            </button>
          </div>

          {/* ── Danger Zone ── */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 32, paddingBottom: 32,
          }}>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase", letterSpacing: "0.15em",
              marginBottom: 16,
            }}>
              Danger Zone
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.6 }}>
              Deleting your account is permanent. Your profile, game history and bookings will be removed. Reviews you&apos;ve written will be anonymised.
            </p>
            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                style={{
                  padding: "10px 20px", borderRadius: 6,
                  fontSize: 13, fontWeight: 600,
                  background: "transparent",
                  color: "rgba(255,255,255,0.35)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "color 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                Delete my account
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  style={{
                    padding: "10px 20px", borderRadius: 6,
                    fontSize: 13, fontWeight: 700,
                    background: "#fff",
                    color: "#050505", border: "none",
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  style={{
                    padding: "10px 20px", borderRadius: 6,
                    fontSize: 13, fontWeight: 600,
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: 32,
      paddingBottom: 32,
    }}>
      <div style={{
        fontSize: 11, color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", letterSpacing: "0.15em",
        marginBottom: 24,
      }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <Label>{label}</Label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}
