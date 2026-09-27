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

type Me = { id: string; description: string; timing: string; address: string; phone: string; features: string[]; certifications: string[] };

const toList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

type FormState = { description: string; timing: string; address: string; phone: string; features: string; certifications: string };

function fromMe(me: Me): FormState {
  return {
    description: me.description ?? "", timing: me.timing ?? "", address: me.address ?? "", phone: me.phone ?? "",
    features: (me.features ?? []).join(", "), certifications: (me.certifications ?? []).join(", "),
  };
}

// State lives here and is seeded from props once, so the page above never
// copies server data into state inside an effect.
function EditForm({ me }: { me: Me }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => fromMe(me));
  const [saving, setSaving] = useState(false);

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

  const field = (label: string, key: keyof FormState, placeholder: string, multiline = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{label}</Label>
      {multiline
        ? <Textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ minHeight: 100 }} />
        : <Input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />}
    </div>
  );

  return (
    <>
      <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px", display: "flex", flexDirection: "column", gap: 14 }}>
        {field("About / Bio", "description", "Describe your coaching experience and approach", true)}
        {field("Timing", "timing", "e.g. Mon–Fri 6–8 AM, Sat 4–6 PM")}
        {field("Venue address", "address", "Where sessions happen")}
        {field("Phone (WhatsApp)", "phone", "+91 98765 43210")}
        {field("What's included (comma separated)", "features", "Equipment provided, Video analysis, Diet plan")}
        {field("Certifications (comma separated)", "certifications", "AIFF D Licence, First Aid")}
        <p style={{ fontSize: 12, color: "#6b7280" }}>Pricing, seats, sport and status are set by the Game Ground team. Message us to change them.</p>
      </div>
      <button onClick={save} disabled={saving} style={{ width: "100%", height: 48, borderRadius: 11, fontSize: 15, fontWeight: 800, background: "#fff", color: "#000", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit", marginTop: 16 }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </>
  );
}

export default function CoachProfileEdit() {
  const { user, loading } = useAuth();
  const router = useRouter();

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

  const { data: me, isLoading, isError } = useQuery<Me>({
    queryKey: ["coach-me"],
    queryFn: async () => {
      const r = await fetch("/api/coach/me");
      if (!r.ok) throw new Error("no profile");
      return (await r.json()).data;
    },
    enabled: !!user && user.role === "coach",
    retry: false,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Link href="/coach/dashboard" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Edit Coach Profile</h1>
        </div>
        {isLoading || loading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : isError || !me ? (
          <p style={{ color: "#eab308", fontSize: 13 }}>No coach profile is linked to this account yet. Ask the Game Ground team to send your portal invite.</p>
        ) : (
          <EditForm key={me.id} me={me} />
        )}
      </main>
    </div>
  );
}
