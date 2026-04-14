"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { toast } from "sonner";
import { Check } from "lucide-react";

const SPORTS = ["Basketball","Football","Badminton","Cricket","Tennis","Volleyball","Fitness","Swimming","Athletics","Yoga"];
const STEPS = ["Basic Info","Location","Profile","Batches","Review"];

interface Batch { day: string; time: string; level: string; seats: string; }
interface FormData {
  name: string; email: string; phone: string; password: string;
  sport: string; type: string;
  location: string; address: string;
  bio: string; price: string; priceMin: string; priceMax: string;
  timing: string; features: string; certifications: string;
  batches: Batch[];
}

export default function RegisterCoach() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "", email: "", phone: "", password: "",
    sport: "", type: "Academy",
    location: "", address: "",
    bio: "", price: "", priceMin: "", priceMax: "",
    timing: "", features: "", certifications: "",
    batches: [{ day: "", time: "", level: "All Levels", seats: "10" }],
  });
  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const setB = (i: number, k: keyof Batch, v: string) => setForm(p => {
    const batches = [...p.batches];
    batches[i] = { ...batches[i], [k]: v };
    return { ...p, batches };
  });
  const addBatch = () => setForm(p => ({ ...p, batches: [...p.batches, { day: "", time: "", level: "All Levels", seats: "10" }] }));
  const rmBatch  = (i: number) => setForm(p => ({ ...p, batches: p.batches.filter((_, j) => j !== i) }));

  const submit = async () => {
    setSubmitting(true);
    const payload = {
      ...form,
      priceMin: parseInt(form.priceMin) || 500,
      priceMax: parseInt(form.priceMax) || 2000,
      features: form.features.split("\n").filter(Boolean),
      certifications: form.certifications.split("\n").filter(Boolean),
      batches: form.batches.map(b => ({ ...b, seats: parseInt(b.seats) || 10 })),
    };
    const r = await fetch("/api/coaches/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitting(false);
    if (r.ok) {
      toast.success("Application submitted! We'll review and contact you within 48 hours.");
      router.push("/");
    } else {
      const d = await r.json();
      toast.error(d.error ?? "Submission failed");
    }
  };

  const cardStyle: React.CSSProperties = { background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px", marginBottom: 16 };
  const field = (label: string, el: React.ReactNode, hint?: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <Label>{label}</Label>{el}
      {hint && <p style={{ fontSize: 11, color: "#4b5563" }}>{hint}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Register as a Coach</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Join Kozhikode's top coaching network. Free to apply — reviewed within 48 hours.</p>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32, overflowX: "auto" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step ? "#4ade80" : i === step ? "#e63946" : "#1c1c1c",
                  border: i <= step ? "none" : "1px solid rgba(255,255,255,0.1)",
                  fontSize: 12, fontWeight: 800,
                  color: i <= step ? "#fff" : "#6b7280",
                }}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i === step ? "#fff" : "#6b7280", marginTop: 5, whiteSpace: "nowrap", fontWeight: i === step ? 700 : 400 }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ height: 1, flex: 1, background: i < step ? "#4ade80" : "rgba(255,255,255,0.1)", margin: "0 4px", marginBottom: 18 }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Basic Information</h2>
            {field("Full Name / Academy Name *", <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Elite Basketball Academy" />)}
            {field("Email *", <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />)}
            {field("Phone (WhatsApp) *", <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />)}
            {field("Password *", <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" />)}
            {field("Primary Sport *", (
              <Select onValueChange={v => set("sport", v)}>
                <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                <SelectContent>{SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            ))}
            {field("Type *", (
              <div style={{ display: "flex", gap: 10 }}>
                {["Academy", "Personal Trainer"].map(t => (
                  <button key={t} type="button" onClick={() => set("type", t)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: form.type === t ? "rgba(230,57,70,0.12)" : "transparent", color: form.type === t ? "#fff" : "#9ca3af", borderColor: form.type === t ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.1)" }}>
                    {t === "Academy" ? "🏛️ Academy" : "👤 Personal Trainer"}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Location</h2>
            {field("Area / Neighbourhood *", <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. SM Street, West Hill, Mavoor Road" />)}
            {field("Full Address *", <Textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address including landmark, Kozhikode PIN" style={{ minHeight: 80 }} />, "This is shown to players who book a session with you.")}
          </div>
        )}

        {/* Step 2: Profile */}
        {step === 2 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Your Profile</h2>
            {field("About You / Academy *", <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Describe your coaching background, experience, style, and what makes you unique (min 50 characters)" style={{ minHeight: 100 }} />)}
            {field("Schedule / Timings *", <Input value={form.timing} onChange={e => set("timing", e.target.value)} placeholder="e.g. Mon–Fri, 6–8 PM · Weekends by appointment" />)}
            {field("Price Range", (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><Label>Min (₹/session)</Label><Input type="number" value={form.priceMin} onChange={e => set("priceMin", e.target.value)} placeholder="800" /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><Label>Max (₹/session)</Label><Input type="number" value={form.priceMax} onChange={e => set("priceMax", e.target.value)} placeholder="2000" /></div>
              </div>
            ))}
            {field("Facilities & Features", <Textarea value={form.features} onChange={e => set("features", e.target.value)} placeholder={"One feature per line:\nFull-size indoor court\nVideo analysis sessions\nPersonalized plans"} style={{ minHeight: 100 }} />, "List each feature on a new line.")}
            {field("Certifications", <Textarea value={form.certifications} onChange={e => set("certifications", e.target.value)} placeholder={"One per line:\nBSFI Level 2 Certified\n10 years coaching experience"} style={{ minHeight: 70 }} />, "One certification per line.")}
          </div>
        )}

        {/* Step 3: Batches */}
        {step === 3 && (
          <div>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Training Batches</h2>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 18 }}>Add at least one batch. Players will see these when browsing your profile.</p>
              {form.batches.map((batch, i) => (
                <div key={i} style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Batch {i + 1}</span>
                    {form.batches.length > 1 && <button type="button" onClick={() => rmBatch(i)} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {field("Day(s)", <Input value={batch.day} onChange={e => setB(i, "day", e.target.value)} placeholder="Mon–Wed–Fri" />)}
                    {field("Time", <Input value={batch.time} onChange={e => setB(i, "time", e.target.value)} placeholder="6:00–8:00 AM" />)}
                    {field("Level", (
                      <Select onValueChange={v => setB(i, "level", v)}>
                        <SelectTrigger><SelectValue placeholder={batch.level} /></SelectTrigger>
                        <SelectContent>{["Beginner","Intermediate","Advanced","All Levels"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    ))}
                    {field("Max Seats", <Input type="number" value={batch.seats} onChange={e => setB(i, "seats", e.target.value)} placeholder="10" />)}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addBatch} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "1px dashed rgba(255,255,255,0.15)", color: "#9ca3af", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
                + Add Another Batch
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Review Your Application</h2>
              {[
                { l: "Name", v: form.name }, { l: "Email", v: form.email }, { l: "Phone", v: form.phone },
                { l: "Sport", v: form.sport }, { l: "Type", v: form.type },
                { l: "Location", v: form.location }, { l: "Timing", v: form.timing },
                { l: "Batches", v: `${form.batches.length} batch${form.batches.length !== 1 ? "es" : ""}` },
              ].map(({ l, v }) => v && (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>{l}</span>
                  <span style={{ color: "#fff", fontWeight: 500, textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#e5e7eb", lineHeight: 1.6 }}>
                Your application will be reviewed within <strong>48 hours</strong>. Once approved, your profile will appear in the Learn section and players can book your sessions.
              </p>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "inherit" }}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} style={{ flex: 2, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Continue →
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} style={{ flex: 2, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "inherit" }}>
              {submitting ? "Submitting…" : "Submit Application 🎉"}
            </button>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 16 }}>
          Already a coach? <Link href="/login" style={{ color: "#e63946", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </p>
      </main>
    </div>
  );
}
