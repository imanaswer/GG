"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { toast } from "sonner";
import { Check, ArrowRight, ArrowLeft, Plus, Trash2, User, MapPin, Sparkles, CalendarClock, ClipboardCheck } from "lucide-react";
import { STORY } from "@/lib/premium-images";

const SPORTS = ["Basketball","Football","Badminton","Cricket","Tennis","Volleyball","Fitness","Swimming","Athletics","Yoga"];

const STEPS = [
  { label: "Basics",    Icon: User },
  { label: "Location",  Icon: MapPin },
  { label: "Profile",   Icon: Sparkles },
  { label: "Batches",   Icon: CalendarClock },
  { label: "Review",    Icon: ClipboardCheck },
];

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
    const r = await fetch("/api/coaches/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success("Application submitted. We'll review within 48 hours.");
      router.push("/");
    } else {
      const d = await r.json();
      toast.error(d.error ?? "Submission failed");
    }
  };

  const pct = (step / (STEPS.length - 1)) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />
      <main style={{ paddingTop: 96, paddingBottom: 80 }}>
        <div className="container-lg" style={{ maxWidth: 1200 }}>
          <div className="coach-signup-grid" style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 48 }}>

            {/* Left — visual identity card */}
            <aside className="coach-signup-aside" style={{ position: "sticky", top: 96, alignSelf: "start" }}>
              <div style={{
                position: "relative",
                borderRadius: 24,
                overflow: "hidden",
                aspectRatio: "3/4",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <Image
                  src={STORY.learn.src}
                  alt={STORY.learn.alt}
                  fill
                  priority
                  quality={85}
                  sizes="380px"
                  style={{ objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.4) 50%, rgba(5,5,5,0.95) 100%)",
                }} />
                <div style={{ position: "absolute", inset: 0, padding: 28, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 14 }}>
                    Coach application
                  </div>
                  <h1 style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 36,
                    lineHeight: 1.05,
                    fontWeight: 400,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    marginBottom: 14,
                  }}>
                    Share your craft with Kozhikode.
                  </h1>
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                    Free to apply. Reviewed in 48 hours. Your profile goes live the moment we approve it.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: "18px 18px", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, fontWeight: 600 }}>
                  Already a coach?
                </div>
                <Link href="/login" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, color: "#e63946", fontWeight: 600, textDecoration: "none",
                }}>
                  Sign in instead <ArrowRight size={13} />
                </Link>
              </div>
            </aside>

            {/* Right — form column */}
            <div>
              {/* Progress header */}
              <div style={{
                padding: "20px 24px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                marginBottom: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: 4 }}>
                      Step {step + 1} of {STEPS.length}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                      {STEPS[step].label}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(pct)}%
                  </div>
                </div>

                <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 18 }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #e63946, #ff4d5a)",
                    borderRadius: 100,
                    transition: "width 400ms cubic-bezier(0.16,1,0.3,1)",
                    boxShadow: "0 0 10px rgba(230,57,70,0.5)",
                  }} />
                </div>

                <div className="step-dots" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {STEPS.map((s, i) => {
                    const done = i < step;
                    const active = i === step;
                    const Icon = s.Icon;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => i <= step && setStep(i)}
                        disabled={i > step}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          padding: "7px 13px", borderRadius: 100,
                          fontSize: 12, fontWeight: 600,
                          background: active ? "rgba(230,57,70,0.12)" : done ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                          color: active ? "#fff" : done ? "#4ade80" : "rgba(255,255,255,0.4)",
                          border: "1px solid",
                          borderColor: active ? "rgba(230,57,70,0.35)" : done ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)",
                          cursor: i <= step ? "pointer" : "not-allowed",
                          fontFamily: "inherit",
                          transition: "all 160ms ease",
                        }}
                      >
                        {done ? <Check size={13} /> : <Icon size={13} />}
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step content card */}
              <div style={{
                padding: "32px 32px",
                background: "#0b0b0b",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
              }}>
                {step === 0 && (
                  <StepBlock title="Tell us who you are" hint="We use this to set up your profile and reach you about the application.">
                    <FieldRow label="Full name / Academy name">
                      <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Elite Basketball Academy" />
                    </FieldRow>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
                      <FieldRow label="Email">
                        <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
                      </FieldRow>
                      <FieldRow label="WhatsApp number">
                        <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                      </FieldRow>
                    </div>
                    <FieldRow label="Password" hint="Min 8 characters. You'll use this to sign in.">
                      <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" />
                    </FieldRow>
                    <FieldRow label="Primary sport">
                      <Select onValueChange={v => set("sport", v)}>
                        <SelectTrigger><SelectValue placeholder="Pick your main sport" /></SelectTrigger>
                        <SelectContent>{SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Practice type">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[
                          { v: "Academy", title: "Academy", copy: "A facility or team with multiple batches" },
                          { v: "Personal Trainer", title: "Personal trainer", copy: "1-on-1 and small group coaching" },
                        ].map(({ v, title, copy }) => {
                          const active = form.type === v;
                          return (
                            <button
                              key={v} type="button" onClick={() => set("type", v)}
                              style={{
                                textAlign: "left",
                                padding: "14px 16px", borderRadius: 12, border: "1px solid",
                                borderColor: active ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.08)",
                                background: active ? "rgba(230,57,70,0.08)" : "rgba(255,255,255,0.02)",
                                cursor: "pointer", fontFamily: "inherit",
                                transition: "all 160ms ease",
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                                {title}
                              </div>
                              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.45 }}>{copy}</div>
                            </button>
                          );
                        })}
                      </div>
                    </FieldRow>
                  </StepBlock>
                )}

                {step === 1 && (
                  <StepBlock title="Where do you coach?" hint="Players look for coaches close to them. Be as specific as you can.">
                    <FieldRow label="Neighbourhood / area">
                      <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. SM Street, West Hill, Mavoor Road" />
                    </FieldRow>
                    <FieldRow label="Full address" hint="Shown to players who book a session with you.">
                      <Textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address including landmark, Kozhikode PIN" style={{ minHeight: 100 }} />
                    </FieldRow>
                  </StepBlock>
                )}

                {step === 2 && (
                  <StepBlock title="Build your profile" hint="This is what players see when they open your page.">
                    <FieldRow label="About you or your academy">
                      <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Describe your coaching background, experience, style, and what makes you unique (min 50 characters)" style={{ minHeight: 120 }} />
                    </FieldRow>
                    <FieldRow label="Schedule / timings">
                      <Input value={form.timing} onChange={e => set("timing", e.target.value)} placeholder="e.g. Mon–Fri, 6–8 PM · Weekends by appointment" />
                    </FieldRow>
                    <FieldRow label="Price range (₹ per session)">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Input type="number" value={form.priceMin} onChange={e => set("priceMin", e.target.value)} placeholder="Min — e.g. 800" />
                        <Input type="number" value={form.priceMax} onChange={e => set("priceMax", e.target.value)} placeholder="Max — e.g. 2000" />
                      </div>
                    </FieldRow>
                    <FieldRow label="Facilities & features" hint="One feature per line.">
                      <Textarea value={form.features} onChange={e => set("features", e.target.value)} placeholder={"Full-size indoor court\nVideo analysis sessions\nPersonalised training plans"} style={{ minHeight: 110 }} />
                    </FieldRow>
                    <FieldRow label="Certifications" hint="One certification per line.">
                      <Textarea value={form.certifications} onChange={e => set("certifications", e.target.value)} placeholder={"BSFI Level 2 Certified\n10 years coaching experience"} style={{ minHeight: 90 }} />
                    </FieldRow>
                  </StepBlock>
                )}

                {step === 3 && (
                  <StepBlock title="Training batches" hint="Players will book these slots directly. Add as many as you run.">
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {form.batches.map((batch, i) => (
                        <div key={i} style={{
                          padding: "18px 20px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 14,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: 7,
                                background: "rgba(230,57,70,0.12)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, color: "#e63946",
                              }}>{i + 1}</div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Batch</span>
                            </div>
                            {form.batches.length > 1 && (
                              <button type="button" onClick={() => rmBatch(i)} style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                fontSize: 12, color: "#ef4444", background: "none", border: "none",
                                cursor: "pointer", fontFamily: "inherit", padding: "4px 8px",
                                borderRadius: 7,
                              }}>
                                <Trash2 size={13} /> Remove
                              </button>
                            )}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-col">
                            <FieldRow label="Day(s)" compact>
                              <Input value={batch.day} onChange={e => setB(i, "day", e.target.value)} placeholder="Mon–Wed–Fri" />
                            </FieldRow>
                            <FieldRow label="Time" compact>
                              <Input value={batch.time} onChange={e => setB(i, "time", e.target.value)} placeholder="6:00–8:00 AM" />
                            </FieldRow>
                            <FieldRow label="Level" compact>
                              <Select onValueChange={v => setB(i, "level", v)}>
                                <SelectTrigger><SelectValue placeholder={batch.level} /></SelectTrigger>
                                <SelectContent>
                                  {["Beginner","Intermediate","Advanced","All Levels"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FieldRow>
                            <FieldRow label="Max seats" compact>
                              <Input type="number" value={batch.seats} onChange={e => setB(i, "seats", e.target.value)} placeholder="10" />
                            </FieldRow>
                          </div>
                        </div>
                      ))}

                      <button type="button" onClick={addBatch} style={{
                        height: 48, borderRadius: 12,
                        border: "1px dashed rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.02)",
                        color: "rgba(255,255,255,0.7)",
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: 13, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                        transition: "all 160ms ease",
                      }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = "rgba(230,57,70,0.4)";
                          el.style.color = "#fff";
                          el.style.background = "rgba(230,57,70,0.05)";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = "rgba(255,255,255,0.18)";
                          el.style.color = "rgba(255,255,255,0.7)";
                          el.style.background = "rgba(255,255,255,0.02)";
                        }}
                      >
                        <Plus size={15} /> Add another batch
                      </button>
                    </div>
                  </StepBlock>
                )}

                {step === 4 && (
                  <StepBlock title="Review your application" hint="Double-check everything. You'll get an email confirmation after you submit.">
                    <div style={{
                      padding: "18px 22px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      marginBottom: 16,
                    }}>
                      {[
                        { l: "Name",     v: form.name },
                        { l: "Email",    v: form.email },
                        { l: "Phone",    v: form.phone },
                        { l: "Sport",    v: form.sport },
                        { l: "Type",     v: form.type },
                        { l: "Location", v: form.location },
                        { l: "Timing",   v: form.timing },
                        { l: "Price",    v: form.priceMin && form.priceMax ? `₹${form.priceMin}–₹${form.priceMax}` : "" },
                        { l: "Batches",  v: `${form.batches.length} batch${form.batches.length !== 1 ? "es" : ""}` },
                      ].map(({ l, v }) => v && (
                        <div key={l} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{l}</span>
                          <span style={{ fontSize: 14, color: "#fff", fontWeight: 500, textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      padding: "16px 18px",
                      background: "rgba(230,57,70,0.06)",
                      border: "1px solid rgba(230,57,70,0.22)",
                      borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                        What happens next
                      </div>
                      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.65 }}>
                        We review every application within <strong>48 hours</strong>. Once approved, your profile goes live in the Learn section and players can book your sessions immediately.
                      </p>
                    </div>
                  </StepBlock>
                )}

                {/* Navigation */}
                <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)} style={{
                      height: 48, padding: "0 22px", borderRadius: 12,
                      fontSize: 13.5, fontWeight: 600,
                      background: "rgba(255,255,255,0.03)",
                      color: "#e5e7eb",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 7,
                      transition: "all 150ms ease",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
                    >
                      <ArrowLeft size={15} /> Back
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  {step < STEPS.length - 1 ? (
                    <button onClick={() => setStep(s => s + 1)} style={{
                      height: 48, padding: "0 28px", borderRadius: 12,
                      fontSize: 13.5, fontWeight: 700,
                      background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                      color: "#fff", border: "none",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 8,
                      boxShadow: "0 8px 32px rgba(230,57,70,0.32), inset 0 1px 0 rgba(255,255,255,0.16)",
                      transition: "transform 150ms ease",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                    >
                      Continue <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button onClick={submit} disabled={submitting} style={{
                      height: 48, padding: "0 30px", borderRadius: 12,
                      fontSize: 13.5, fontWeight: 700,
                      background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                      color: "#fff", border: "none",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.6 : 1,
                      fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 8,
                      boxShadow: "0 8px 32px rgba(230,57,70,0.32), inset 0 1px 0 rgba(255,255,255,0.16)",
                      transition: "transform 150ms ease",
                    }}>
                      {submitting ? "Submitting…" : (<>Submit application <ArrowRight size={15} /></>)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .coach-signup-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .coach-signup-aside { position: static !important; }
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StepBlock({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>{title}</h2>
        {hint && <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{hint}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children, hint, compact }: { label: string; children: React.ReactNode; hint?: string; compact?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 7 }}>
      <Label>{label}</Label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}
