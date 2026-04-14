"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea } from "@/components/ui";
import { useCreateGame } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";

const SPORTS = ["Basketball","Football","Cricket","Badminton","Tennis","Volleyball","Other"];
const LEVELS = ["Beginner","Intermediate","Advanced","All Levels"];
const DURATIONS = [{ l:"30 min",v:30},{l:"1 hour",v:60},{l:"90 min",v:90},{l:"2 hours",v:120},{l:"3 hours",v:180},{l:"4 hours",v:240}];

const SectionTitle = ({ emoji, label }: { emoji: string; label: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
    <span style={{ fontSize: 18 }}>{emoji}</span>
    <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
  </div>
);

const FormCard = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 22px" }}>
    {children}
  </div>
);

const Row2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <Label>{label}</Label>
    {children}
  </div>
);

const PillSelect = ({ options, value, onChange }: { options: { l: string; v: string | number }[]; value: string; onChange: (v: string) => void }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
    {options.map(o => (
      <button key={String(o.v)} type="button" onClick={() => onChange(String(o.v))} style={{
        padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
        cursor: "pointer", border: "1px solid", fontFamily: "inherit",
        background: value === String(o.v) ? "#e63946" : "transparent",
        color: value === String(o.v) ? "#fff" : "#9ca3af",
        borderColor: value === String(o.v) ? "#e63946" : "rgba(255,255,255,0.1)",
        transition: "all 0.15s",
      }}>{o.l}</button>
    ))}
  </div>
);

export default function CreateGamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const createGame = useCreateGame();
  const [form, setForm] = useState({
    sport: "", title: "", location: "", address: "",
    date: "", time: "", duration: "90",
    slots: "", skillLevel: "", cost: "Free", costAmount: "0", description: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sport || !form.title || !form.location || !form.date || !form.time || !form.slots || !form.skillLevel) return;
    await createGame.mutateAsync({
      sport: form.sport, title: form.title, location: form.location,
      address: form.address || undefined,
      scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
      duration: parseInt(form.duration), slots: parseInt(form.slots),
      skillLevel: form.skillLevel, cost: form.cost || "Free",
      costAmount: parseInt(form.costAmount) || 0,
      description: form.description || undefined,
    });
    router.push("/play");
  };

  if (!loading && !user) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: "24px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock size={28} color="#e63946" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Sign in required</h2>
          <p style={{ color: "#6b7280", fontSize: 14 }}>You need an account to create a game</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" style={{ padding: "11px 24px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Sign In</Link>
          <Link href="/register" style={{ padding: "11px 24px", borderRadius: 9, background: "transparent", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Create Account</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px 60px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Create a Game</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Set up a game and find players near you</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Game info */}
          <FormCard>
            <SectionTitle emoji="🏀" label="Game Info" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Sport *">
                <PillSelect
                  options={SPORTS.map(s => ({ l: s, v: s }))}
                  value={form.sport}
                  onChange={v => set("sport", v)}
                />
              </Field>
              <Field label="Skill Level *">
                <PillSelect
                  options={LEVELS.map(l => ({ l, v: l }))}
                  value={form.skillLevel}
                  onChange={v => set("skillLevel", v)}
                />
              </Field>
              <Field label="Game Title *">
                <Input placeholder="e.g. 5v5 Pickup Basketball at SM Street" value={form.title} onChange={e => set("title", e.target.value)} required />
              </Field>
            </div>
          </FormCard>

          {/* Location */}
          <FormCard>
            <SectionTitle emoji="📍" label="Location" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Venue Name *">
                <Input placeholder="e.g. SM Street Court, EMS Stadium" value={form.location} onChange={e => set("location", e.target.value)} required />
              </Field>
              <Field label="Full Address">
                <Input placeholder="e.g. SM Street, Kozhikode 673001" value={form.address} onChange={e => set("address", e.target.value)} />
              </Field>
            </div>
          </FormCard>

          {/* Schedule */}
          <FormCard>
            <SectionTitle emoji="🕐" label="Schedule" />
            <Row2>
              <Field label="Date *">
                <Input type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={e => set("date", e.target.value)} required />
              </Field>
              <Field label="Start Time *">
                <Input type="time" value={form.time} onChange={e => set("time", e.target.value)} required />
              </Field>
            </Row2>
            <div style={{ marginTop: 14 }}>
              <Field label="Duration">
                <PillSelect
                  options={DURATIONS.map(d => ({ l: d.l, v: d.v }))}
                  value={form.duration}
                  onChange={v => set("duration", v)}
                />
              </Field>
            </div>
          </FormCard>

          {/* Players & Cost */}
          <FormCard>
            <SectionTitle emoji="👥" label="Players & Cost" />
            <Row2>
              <Field label="Max Players *">
                <Input type="number" min="2" max="100" placeholder="e.g. 10" value={form.slots} onChange={e => set("slots", e.target.value)} required />
              </Field>
              <Field label="Cost per Player">
                <Input placeholder="Free or ₹100" value={form.cost} onChange={e => {
                  const v = e.target.value;
                  set("cost", v);
                  const n = parseInt(v.replace(/\D/g, ""));
                  set("costAmount", isNaN(n) ? "0" : String(n));
                }} />
              </Field>
            </Row2>
          </FormCard>

          {/* Description */}
          <FormCard>
            <SectionTitle emoji="📝" label="Description" />
            <Field label="Game Description">
              <Textarea
                placeholder="Skill level expectations, house rules, what to bring…"
                rows={4}
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </Field>
          </FormCard>

          <button
            type="submit"
            disabled={createGame.isPending || !form.sport || !form.skillLevel || !form.title || !form.location || !form.date || !form.time || !form.slots}
            style={{
              width: "100%", height: 50, borderRadius: 12, fontSize: 15, fontWeight: 800,
              background: "#e63946", color: "#fff", border: "none",
              cursor: createGame.isPending ? "not-allowed" : "pointer",
              opacity: (createGame.isPending || !form.sport || !form.skillLevel) ? 0.6 : 1,
              fontFamily: "inherit", boxShadow: "0 4px 20px rgba(230,57,70,0.3)",
              letterSpacing: "-0.01em",
            }}>
            {createGame.isPending ? "Creating your game…" : "Publish Game 🎉"}
          </button>
        </form>
      </main>
    </div>
  );
}
