"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CoachProfileEdit() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ bio: "", timing: "", price: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "coach")) router.push("/login");
  }, [user, loading, router]);

  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/users/${user!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio: form.bio, phone: form.phone }) });
    setSaving(false);
    if (r.ok) { toast.success("Profile updated!"); router.push("/coach/dashboard"); }
    else toast.error("Failed to save");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Link href="/coach/dashboard" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Edit Coach Profile</h1>
        </div>
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>About / Bio</Label>
            <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Describe your coaching experience and approach" style={{ minHeight: 100 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Phone (WhatsApp)</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ width: "100%", height: 48, borderRadius: 11, fontSize: 15, fontWeight: 800, background: "#e63946", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit", marginTop: 16 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </main>
    </div>
  );
}
