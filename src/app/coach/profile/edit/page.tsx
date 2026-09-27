"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { Input, Label, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Me = { description: string; timing: string; address: string; phone: string; features: string[]; certifications: string[] };

const toList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

export default function CoachProfileEdit() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({ description: "", timing: "", address: "", phone: "", features: "", certifications: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "coach")) router.push("/coach/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user || user.role !== "coach") return;
    fetch("/api/coach/agreements")
      .then(r => r.json())
      .then(d => { if (d?.data && d.data.signed === false) router.push("/onboarding-terms"); })
      .catch(() => {});
  }, [user, loading, router]);

  const { data: me } = useQuery<Me>({
    queryKey: ["coach-me"],
    queryFn: () => fetch("/api/coach/me").then(r => r.json()).then(d => d.data),
    enabled: !!user && user.role === "coach",
  });

  // Prefill once the profile arrives; keyed on `me` so a refetch after save does not clobber typing.
  useEffect(() => {
    if (!me) return;
    setForm({
      description: me.description ?? "", timing: me.timing ?? "", address: me.address ?? "", phone: me.phone ?? "",
      features: (me.features ?? []).join(", "), certifications: (me.certifications ?? []).join(", "),
    });
  }, [me]);

  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/coach/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description, timing: form.timing, address: form.address, phone: form.phone,
        features: toList(form.features), certifications: toList(form.certifications),
      }),
    });
    setSaving(false);
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ["coach-me"] });
      toast.success("Profile updated!");
      router.push("/coach/dashboard");
    } else {
      const d = await r.json().catch(() => null);
      toast.error(d?.error ?? "Failed to save");
    }
  };

  const field = (label: string, key: keyof typeof form, placeholder: string, multiline = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{label}</Label>
      {multiline
        ? <Textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ minHeight: 100 }} />
        : <Input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Link href="/coach/dashboard" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Edit Coach Profile</h1>
        </div>
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {field("About / Bio", "description", "Describe your coaching experience and approach", true)}
          {field("Timing", "timing", "e.g. Mon–Fri 6–8 AM, Sat 4–6 PM")}
          {field("Venue address", "address", "Where sessions happen")}
          {field("Phone (WhatsApp)", "phone", "+91 98765 43210")}
          {field("What's included (comma separated)", "features", "Equipment provided, Video analysis, Diet plan")}
          {field("Certifications (comma separated)", "certifications", "AIFF D Licence, First Aid")}
          <p style={{ fontSize: 12, color: "#6b7280" }}>Pricing, seats, sport and status are set by the Game Ground team. Message us to change them.</p>
        </div>
        <button onClick={save} disabled={saving || !me} style={{ width: "100%", height: 48, borderRadius: 11, fontSize: 15, fontWeight: 800, background: "#fff", color: "#000", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving || !me ? 0.7 : 1, fontFamily: "inherit", marginTop: 16 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </main>
    </div>
  );
}
