"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { FormInput, FormTextarea, FormSelect, FormRow } from "./AdminModal";
import { ImageUpload } from "./ImageUpload";
import { VenueLocationPicker } from "./VenueLocationPicker";
import { EVENT_TYPES, EVENT_DIFFICULTIES } from "@/lib/taxonomy";

const SPORTS = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Swimming", "Table Tennis", "Volleyball", "Athletics", "E-Sports"];
const STRUCTURES = ["Knockout", "League", "Hybrid", "Round Robin"];
const STEPS = ["Basics", "Registration", "Details", "Location", "Review"] as const;

export type EventForm = {
  id?: string;
  title: string; sport: string; type: string; difficulty: string; date: string;
  startDate: string; endDate: string; registrationDeadline: string;
  maxParticipants: number; paid: boolean;
  entryFee: string; entryFeeAmount: number; currency: string; gstPercent: number; convenienceFeePct: number;
  approvalMode: "auto" | "manual";
  imageUrl: string; thumbnailUrl: string; featured: boolean;
  description: string; aboutLong: string; requirements: string[]; whatYouGet: string[]; venueInfo: string;
  matchFormat: string; teamSize: string; numRounds: string; structure: string; eligibility: string; rules: string[]; format: string[];
  prizePool: string; prizes: string[]; additionalRewards: string[];
  schedule: { title: string; date: string; time: string; location: string }[];
  location: string; address: string; city: string; state: string; country: string; pincode: string; mapsLink: string;
  lat: number | null; lng: number | null;
  organizer: string; organizerContact: string; tags: string[];
};

export const EMPTY_EVENT: EventForm = {
  title: "", sport: "Football", type: "Tournament", difficulty: "All Levels", date: "",
  startDate: "", endDate: "", registrationDeadline: "",
  maxParticipants: 100, paid: false,
  entryFee: "Free", entryFeeAmount: 0, currency: "INR", gstPercent: 0, convenienceFeePct: 0,
  approvalMode: "auto",
  imageUrl: "", thumbnailUrl: "", featured: false,
  description: "", aboutLong: "", requirements: [], whatYouGet: [], venueInfo: "",
  matchFormat: "", teamSize: "", numRounds: "", structure: "", eligibility: "", rules: [], format: [],
  prizePool: "", prizes: [], additionalRewards: [],
  schedule: [],
  location: "", address: "", city: "", state: "", country: "India", pincode: "", mapsLink: "",
  lat: null, lng: null,
  organizer: "", organizerContact: "", tags: [],
};

// one-per-line <-> string[]
const linesToArr = (s: string) => s.split("\n").map(x => x.trim()).filter(Boolean);
const arrToLines = (a: string[]) => a.join("\n");

function validateStep(step: number, f: EventForm): string | null {
  if (step === 0) {
    if (f.title.trim().length < 1) return "Event name is required";
    if (!f.sport) return "Pick a sport";
  }
  if (step === 1) {
    if (!f.startDate || !f.endDate || !f.registrationDeadline) return "Start, end and deadline dates are required";
    if (new Date(f.endDate) < new Date(f.startDate)) return "End date must be on or after the start date";
    if (f.maxParticipants < 1) return "Capacity must be at least 1";
    if (f.paid && f.entryFeeAmount <= 0) return "Paid events need an entry fee greater than 0";
  }
  return null; // steps 2-4 are optional content
}

function ScheduleEditor({ rows, onChange }: { rows: EventForm["schedule"]; onChange: (r: EventForm["schedule"]) => void }) {
  const set = (i: number, key: keyof EventForm["schedule"][number], v: string) =>
    onChange(rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  const add = () => onChange([...rows, { title: "", date: "", time: "", location: "" }]);
  const del = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Entry {i + 1}</span>
            <button type="button" onClick={() => del(i)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color="#f87171" /></button>
          </div>
          <FormInput label="Title" value={r.title} onChange={v => set(i, "title", v)} placeholder="e.g. Opening Ceremony" />
          <FormRow>
            <FormInput label="Date" value={r.date} onChange={v => set(i, "date", v)} type="date" />
            <FormInput label="Time" value={r.time} onChange={v => set(i, "time", v)} placeholder="e.g. 9:00 AM" />
          </FormRow>
          <FormInput label="Location" value={r.location} onChange={v => set(i, "location", v)} placeholder="e.g. Main Arena" />
        </div>
      ))}
      <button type="button" onClick={add} style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: "8px 14px", borderRadius: 8, background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", color: "#ff6b74", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={13} /> Add schedule entry
      </button>
    </div>
  );
}

export function EventWizard({
  initial, mode, saving, error, onCancel, onSubmit,
}: {
  initial: EventForm;
  mode: "add" | "edit";
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (form: EventForm, published: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventForm>(initial);
  const [stepError, setStepError] = useState<string | null>(null);
  const u = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const next = () => { const e = validateStep(step, form); if (e) { setStepError(e); return; } setStepError(null); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => { setStepError(null); setStep(s => Math.max(s - 1, 0)); };
  const submit = (published: boolean) => {
    for (let s = 0; s <= 1; s++) { const e = validateStep(s, form); if (e) { setStep(s); setStepError(e); return; } }
    onSubmit(form, published);
  };

  return (
    <div>
      {/* Stepper header */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 4, borderRadius: 100, background: i <= step ? "#e63946" : "rgba(255,255,255,0.1)", marginBottom: 6 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: i === step ? "#fff" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Panels */}
      <div style={{ minHeight: 280 }}>
        {step === 0 && (
          <>
            <FormInput label="Event Name" value={form.title} onChange={v => u("title", v)} required />
            <FormRow>
              <FormSelect label="Sport" value={form.sport} onChange={v => u("sport", v)} options={SPORTS.map(s => ({ value: s, label: s }))} />
              <FormSelect label="Type" value={form.type} onChange={v => u("type", v)} options={EVENT_TYPES.map(t => ({ value: t, label: t }))} />
            </FormRow>
            <FormSelect label="Difficulty" value={form.difficulty} onChange={v => u("difficulty", v)} options={EVENT_DIFFICULTIES.map(d => ({ value: d, label: d }))} />
            <FormTextarea label="Short Description" value={form.description} onChange={v => u("description", v)} rows={2} placeholder="One line shown on cards" />
            <FormTextarea label="Long Description / About" value={form.aboutLong} onChange={v => u("aboutLong", v)} rows={4} />
            <label style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Event Banner</label>
            <ImageUpload value={form.imageUrl} onChange={v => u("imageUrl", v)} />
            <label style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>Thumbnail (optional)</label>
            <ImageUpload value={form.thumbnailUrl} onChange={v => u("thumbnailUrl", v)} />
          </>
        )}
        {step === 1 && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[{ v: false, l: "Free Registration" }, { v: true, l: "Paid Registration" }].map(opt => (
                <button key={opt.l} type="button" onClick={() => u("paid", opt.v)}
                  style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                    background: form.paid === opt.v ? "rgba(230,57,70,0.15)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${form.paid === opt.v ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: form.paid === opt.v ? "#ff6b74" : "#9ca3af" }}>{opt.l}</button>
              ))}
            </div>
            {form.paid && (
              <>
                <FormRow>
                  <FormInput label="Entry Fee (display)" value={form.entryFee} onChange={v => u("entryFee", v)} placeholder="e.g. ₹500/team" />
                  <FormInput label="Entry Fee Amount (₹)" value={form.entryFeeAmount} onChange={v => u("entryFeeAmount", Number(v) as never)} type="number" />
                </FormRow>
                <FormRow>
                  <FormInput label="GST %" value={form.gstPercent} onChange={v => u("gstPercent", Number(v) as never)} type="number" />
                  <FormInput label="Convenience Fee %" value={form.convenienceFeePct} onChange={v => u("convenienceFeePct", Number(v) as never)} type="number" />
                </FormRow>
                <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>GST &amp; convenience fee are stored now; they are charged once the payment slice wires them in. Razorpay currently charges the base amount.</p>
              </>
            )}
            <FormRow>
              <FormInput label="Maximum Participants" value={form.maxParticipants} onChange={v => u("maxParticipants", Number(v) as never)} type="number" />
              <FormInput label="Registration Deadline" value={form.registrationDeadline} onChange={v => u("registrationDeadline", v)} type="date" required />
            </FormRow>
            <FormRow>
              <FormInput label="Start Date" value={form.startDate} onChange={v => u("startDate", v)} type="date" required />
              <FormInput label="End Date" value={form.endDate} onChange={v => u("endDate", v)} type="date" required />
            </FormRow>
            <FormInput label="Date (display text)" value={form.date} onChange={v => u("date", v)} placeholder="e.g. July 10–12, 2026" />
            <FormSelect label="Approval Mode" value={form.approvalMode} onChange={v => u("approvalMode", v as "auto" | "manual")} options={[{ value: "auto", label: "Auto Approve" }, { value: "manual", label: "Manual Approval" }]} />
          </>
        )}
        {step === 2 && (
          <>
            <FormTextarea label="Requirements (one per line)" value={arrToLines(form.requirements)} onChange={v => u("requirements", linesToArr(v))} rows={3} placeholder={"Valid ID\nSports attire"} />
            <FormTextarea label="What Participants Get (one per line)" value={arrToLines(form.whatYouGet)} onChange={v => u("whatYouGet", linesToArr(v))} rows={3} placeholder={"Certificate\nT-shirt\nRefreshments"} />
            <FormTextarea label="Venue Information" value={form.venueInfo} onChange={v => u("venueInfo", v)} rows={3} />
            <FormRow>
              <FormInput label="Match Format" value={form.matchFormat} onChange={v => u("matchFormat", v)} placeholder="e.g. Best of 3 sets" />
              <FormInput label="Team Size" value={form.teamSize} onChange={v => u("teamSize", v)} placeholder="e.g. 5v5" />
            </FormRow>
            <FormRow>
              <FormInput label="Number of Rounds" value={form.numRounds} onChange={v => u("numRounds", v)} placeholder="e.g. 4" />
              <FormSelect label="Structure" value={form.structure} onChange={v => u("structure", v)} options={[{ value: "", label: "—" }, ...STRUCTURES.map(s => ({ value: s, label: s }))]} />
            </FormRow>
            <FormTextarea label="Eligibility" value={form.eligibility} onChange={v => u("eligibility", v)} rows={2} />
            <FormTextarea label="Rules (one per line)" value={arrToLines(form.rules)} onChange={v => u("rules", linesToArr(v))} rows={3} />
            <FormInput label="Prize Pool (display)" value={form.prizePool} onChange={v => u("prizePool", v)} placeholder="e.g. ₹50,000" />
            <FormTextarea label="Prizes (one per line)" value={arrToLines(form.prizes)} onChange={v => u("prizes", linesToArr(v))} rows={3} placeholder={"🥇 Winner – ₹25,000\n🥈 Runner Up – ₹10,000"} />
            <FormTextarea label="Additional Rewards (one per line)" value={arrToLines(form.additionalRewards)} onChange={v => u("additionalRewards", linesToArr(v))} rows={2} placeholder={"Certificates\nMerchandise"} />
            <label style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Schedule</label>
            <ScheduleEditor rows={form.schedule} onChange={r => u("schedule", r)} />
          </>
        )}
        {step === 3 && (
          <>
            <FormInput label="Venue Name" value={form.location} onChange={v => u("location", v)} />
            <VenueLocationPicker
              address={form.address} lat={form.lat} lng={form.lng}
              onChange={(n) => setForm(f => ({
                ...f,
                ...(n.address !== undefined ? { address: n.address } : {}),
                ...(n.lat !== undefined ? { lat: n.lat ?? null } : {}),
                ...(n.lng !== undefined ? { lng: n.lng ?? null } : {}),
              }))}
            />
            <FormRow>
              <FormInput label="City" value={form.city} onChange={v => u("city", v)} />
              <FormInput label="State" value={form.state} onChange={v => u("state", v)} />
            </FormRow>
            <FormRow>
              <FormInput label="Country" value={form.country} onChange={v => u("country", v)} />
              <FormInput label="Pincode" value={form.pincode} onChange={v => u("pincode", v)} />
            </FormRow>
            <FormInput label="Google Maps Link" value={form.mapsLink} onChange={v => u("mapsLink", v)} placeholder="https://maps.google.com/…" />
            <FormRow>
              <FormInput label="Organizer" value={form.organizer} onChange={v => u("organizer", v)} />
              <FormInput label="Organizer Contact" value={form.organizerContact} onChange={v => u("organizerContact", v)} />
            </FormRow>
          </>
        )}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#d1d5db" }}>
            {[
              ["Name", form.title], ["Sport / Type", `${form.sport} · ${form.type}`],
              ["When", `${form.startDate} → ${form.endDate}`], ["Deadline", form.registrationDeadline],
              ["Capacity", String(form.maxParticipants)], ["Entry", form.paid ? `${form.entryFee} (₹${form.entryFeeAmount})` : "Free"],
              ["Approval", form.approvalMode], ["Venue", `${form.location}, ${form.city}`],
              ["Schedule entries", String(form.schedule.length)], ["Prizes", String(form.prizes.length)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>{k}</span><span style={{ fontWeight: 600, color: "#fff" }}>{v || "—"}</span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>Save as Draft to keep editing privately, or Publish to make it visible to users.</p>
          </div>
        )}
      </div>

      {(stepError || error) && <p style={{ fontSize: 13, color: "#f87171", marginTop: 12 }}>{stepError ?? error}</p>}

      {/* Footer nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 10 }}>
        <button type="button" onClick={step === 0 ? onCancel : back} style={navBtn}>
          <ChevronLeft size={15} /> {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} style={{ ...navBtn, background: "#e63946", color: "#fff", border: "none" }}>Next <ChevronRight size={15} /></button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" disabled={saving} onClick={() => submit(false)} style={navBtn}>Save Draft</button>
            <button type="button" disabled={saving} onClick={() => submit(true)} style={{ ...navBtn, background: "#e63946", color: "#fff", border: "none" }}>{saving ? "Publishing…" : "Publish"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: "transparent", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.12)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
