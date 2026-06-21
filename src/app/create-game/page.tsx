"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Lock, Trophy, MapPin, CalendarClock, Users, FileText, Sparkles, ArrowRight, Check } from "lucide-react";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { Input, Label, Textarea } from "@/components/ui";
import { useCreateGame } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { defaultGameTitle, formatCost } from "@/lib/gameForm";

const SPORTS = ["Basketball","Football","Cricket","Badminton","Tennis","Volleyball","Other"];
const LEVELS = ["Beginner","Intermediate","Advanced","All Levels"];

type Venue = { id: string; name: string; description: string; address: string; supportedSports: string[]; lat?: number | null; lng?: number | null; openSlots?: number };
type Slot = { id: string; startTime: string; endTime: string; isBlocked: boolean; blockReason: string | null; available: boolean; reason: string | null };

type FormState = {
  sport: string; skillLevel: string; title: string;
  venueId: string; slotId: string;
  slots: string; paid: boolean; costAmount: string; description: string;
};

const STEPS = ["What & where", "When", "Details"] as const;

const slotDay  = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
const slotTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function CreateGamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const createGame = useCreateGame();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>({
    sport: "", skillLevel: "", title: "",
    venueId: "", slotId: "",
    slots: "", paid: false, costAmount: "", description: "",
  });
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));
  // Sport drives the venue list; changing it clears the downstream choices so a
  // host can never carry a venue/slot that no longer matches their sport.
  const selectSport = (v: string) => setForm(p => ({ ...p, sport: v, venueId: "", slotId: "" }));
  const selectVenue = (id: string) => setForm(p => ({ ...p, venueId: id, slotId: "" }));

  const { data: venues = [], isFetching: venuesFetching } = useQuery<Venue[]>({
    queryKey: ["venues", form.sport],
    queryFn: () => fetch(`/api/venues?sport=${encodeURIComponent(form.sport)}`).then(r => r.json()).then(j => j.data ?? []),
    enabled: !!form.sport,
  });
  const { data: slots = [], isFetching: slotsFetching } = useQuery<Slot[]>({
    queryKey: ["venue-slots", form.venueId],
    queryFn: () => fetch(`/api/venues/${form.venueId}/slots?all=1`).then(r => r.json()).then(j => j.data ?? []),
    enabled: !!form.venueId,
  });

  const selectedVenue = venues.find(v => v.id === form.venueId) ?? null;
  const selectedSlot  = slots.find(s => s.id === form.slotId) ?? null;

  const playersNum = parseInt(form.slots);
  const amountNum  = parseInt(form.costAmount) || 0;
  const step1Valid = !!(form.sport && form.skillLevel && form.venueId);
  const step2Valid = !!form.slotId;
  const step3Valid = Number.isInteger(playersNum) && playersNum >= 2 && playersNum <= 100 && (!form.paid || amountNum > 0);
  const canSubmit  = step1Valid && step2Valid && step3Valid;

  const defaultTitle = defaultGameTitle(form.skillLevel, form.sport, selectedVenue?.name ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await createGame.mutateAsync({
      sport: form.sport,
      title: form.title.trim() || defaultTitle,
      slotId: form.slotId,
      slots: playersNum,
      skillLevel: form.skillLevel,
      cost: form.paid ? formatCost(amountNum) : "Free",
      costAmount: form.paid ? amountNum : 0,
      description: form.description || undefined,
    });
    router.push("/play");
  };

  if (!loading && !user) return <AuthGate />;

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <PremiumNav />

      {/* Compact header */}
      <section style={{ position: "relative", paddingTop: 110, paddingBottom: 8 }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(230,57,70,0.14) 0%, transparent 60%)",
        }} />
        <div className="container-lg" style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "7px 14px", borderRadius: 100,
            background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)",
            fontSize: 11.5, fontWeight: 600, color: "#ff6b7a",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16,
          }}>
            <Sparkles size={12} /> Host a game
          </div>
          <h1 style={{
            fontFamily: "var(--font-serif)", fontSize: "clamp(30px, 4vw, 46px)",
            lineHeight: 1.05, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8,
          }}>
            Set the game. <em style={{ fontStyle: "italic", color: "#ff6b7a" }}>Find the people.</em>
          </h1>
        </div>
      </section>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 80px" }}>
        <ProgressSteps step={step} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* STEP 1 — What & where */}
          {step === 1 && (
            <>
              <SectionCard Icon={Trophy} title="Sport & skill" hint="Pick the sport first — we'll tune the rest to match.">
                <FieldRow label="Sport" required>
                  <PillSelect options={SPORTS.map(s => ({ l: s, v: s }))} value={form.sport} onChange={selectSport} />
                </FieldRow>
                <FieldRow label="Skill level" required>
                  <PillSelect options={LEVELS.map(l => ({ l, v: l }))} value={form.skillLevel} onChange={v => set("skillLevel", v)} />
                </FieldRow>
              </SectionCard>

              <SectionCard Icon={MapPin} title="Pick a venue" hint="Only GameGround-approved venues for your sport. Address fills in automatically.">
                {!form.sport ? (
                  <EmptyHint>Choose a sport above to see approved venues.</EmptyHint>
                ) : venuesFetching && venues.length === 0 ? (
                  <EmptyHint>Loading approved venues…</EmptyHint>
                ) : venues.length === 0 ? (
                  <EmptyHint>No approved {form.sport} venues are available yet. Please check back soon.</EmptyHint>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {venues.map(v => {
                      const active = form.venueId === v.id;
                      const open = v.openSlots ?? 0;
                      return (
                        <button key={v.id} type="button" onClick={() => selectVenue(v.id)} style={{
                          textAlign: "left", padding: "13px 15px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                          background: active ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.02)",
                          border: active ? "1px solid #e63946" : "1px solid rgba(255,255,255,0.08)",
                          opacity: open === 0 ? 0.6 : 1,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{v.name}</span>
                            {active && <Check size={15} color="#e63946" />}
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 4, lineHeight: 1.4 }}>{v.address}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8, color: open > 0 ? "#4ade80" : "rgba(255,255,255,0.4)" }}>
                            {open > 0 ? `${open} open slot${open === 1 ? "" : "s"}` : "No open slots yet"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* STEP 2 — When */}
          {step === 2 && (
            <SectionCard Icon={CalendarClock} title="Pick an available slot" hint={`Times are set by ${selectedVenue?.name ?? "the venue"}. Blocked or booked slots can't be selected.`}>
              {slotsFetching && slots.length === 0 ? (
                <EmptyHint>Loading available slots…</EmptyHint>
              ) : slots.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <EmptyHint>No open slots at {selectedVenue?.name ?? "this venue"} right now.</EmptyHint>
                  <button type="button" onClick={() => setStep(1)} style={{
                    alignSelf: "flex-start", padding: "10px 16px", borderRadius: 12,
                    fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    ← Pick a different venue
                  </button>
                </div>
              ) : (
                <SlotPicker slots={slots} value={form.slotId} onChange={id => set("slotId", id)} />
              )}
            </SectionCard>
          )}

          {/* STEP 3 — Details */}
          {step === 3 && (
            <>
              <SectionCard Icon={Users} title="Players & cost">
                <FieldRow label="Max players" required>
                  <Input type="number" min="2" max="100" placeholder="e.g. 10" value={form.slots} onChange={e => set("slots", e.target.value)} required />
                </FieldRow>
                <FieldRow label="Cost per player">
                  <div style={{ display: "flex", gap: 8, marginBottom: form.paid ? 12 : 0 }}>
                    <CostToggle active={!form.paid} label="Free" onClick={() => setForm(p => ({ ...p, paid: false, costAmount: "" }))} />
                    <CostToggle active={form.paid} label="Paid" onClick={() => set("paid", true)} />
                  </div>
                  {form.paid && (
                    <div style={{ position: "relative", maxWidth: 200 }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>₹</span>
                      <Input type="number" min="1" placeholder="100" value={form.costAmount} onChange={e => set("costAmount", e.target.value)} style={{ paddingLeft: 28 }} />
                    </div>
                  )}
                </FieldRow>
              </SectionCard>

              <SectionCard Icon={FileText} title="Title & notes" hint="We'll suggest a title — edit it, or add details below.">
                <FieldRow label="Game title" hint="Leave blank to use the suggestion.">
                  <Input placeholder={defaultTitle} value={form.title} onChange={e => set("title", e.target.value)} />
                </FieldRow>
                <FieldRow label="Notes (optional)">
                  <Textarea
                    placeholder="e.g. Friendly 5v5, bring light and dark shirts. Parking available."
                    rows={4}
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                  />
                </FieldRow>
              </SectionCard>

              {/* Summary */}
              <div style={{ padding: "20px 24px", background: "#0b0b0b", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Review</div>
                <SummaryRow label="Game"    value={form.title.trim() || defaultTitle} />
                <SummaryRow label="Sport"   value={`${form.sport} · ${form.skillLevel}`} />
                <SummaryRow label="Venue"   value={selectedVenue?.name ?? "—"} />
                <SummaryRow label="When"    value={selectedSlot ? `${slotDay(selectedSlot.startTime)} · ${slotTime(selectedSlot.startTime)}–${slotTime(selectedSlot.endTime)}` : "—"} />
                <SummaryRow label="Players" value={Number.isNaN(playersNum) ? "—" : String(playersNum)} />
                <SummaryRow label="Cost"    value={form.paid ? formatCost(amountNum) : "Free"} last />
              </div>
            </>
          )}

          {/* Nav bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "18px 22px",
            background: "linear-gradient(135deg, rgba(230,57,70,0.08) 0%, rgba(11,11,11,0.9) 100%)",
            border: "1px solid rgba(230,57,70,0.2)", borderRadius: 18, marginTop: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                {step === 3 ? (canSubmit ? "Ready to publish?" : "A few more details") : `Step ${step} of 3 · ${STEPS[step - 1]}`}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
                {step === 1 ? "Choose the sport, level and venue." : step === 2 ? "Pick a time that works." : "Your game appears instantly in the /play feed."}
              </div>
            </div>

            <Link href="/play" style={{
              height: 44, padding: "0 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none",
              fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center",
            }}>
              Cancel
            </Link>

            {step > 1 && (
              <button type="button" onClick={() => setStep((step - 1) as 1 | 2 | 3)} style={{
                height: 44, padding: "0 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.1)", fontFamily: "inherit",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 ? !step1Valid : !step2Valid}
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                style={{
                  height: 44, padding: "0 22px", borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                  fontFamily: "inherit",
                  background: (step === 1 ? step1Valid : step2Valid) ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.04)",
                  color: (step === 1 ? step1Valid : step2Valid) ? "#fff" : "rgba(255,255,255,0.4)",
                  border: (step === 1 ? step1Valid : step2Valid) ? "none" : "1px solid rgba(255,255,255,0.06)",
                  cursor: (step === 1 ? step1Valid : step2Valid) ? "pointer" : "not-allowed",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  boxShadow: (step === 1 ? step1Valid : step2Valid) ? "0 6px 24px rgba(230,57,70,0.35)" : "none",
                }}
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={createGame.isPending || !canSubmit}
                style={{
                  height: 44, padding: "0 22px", borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                  fontFamily: "inherit",
                  background: canSubmit ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.04)",
                  color: canSubmit ? "#fff" : "rgba(255,255,255,0.4)",
                  border: canSubmit ? "none" : "1px solid rgba(255,255,255,0.06)",
                  cursor: (createGame.isPending || !canSubmit) ? "not-allowed" : "pointer",
                  opacity: createGame.isPending ? 0.6 : 1,
                  display: "inline-flex", alignItems: "center", gap: 8,
                  boxShadow: canSubmit ? "0 6px 24px rgba(230,57,70,0.35)" : "none",
                }}
              >
                {createGame.isPending ? "Publishing…" : (<>Publish game <ArrowRight size={14} /></>)}
              </button>
            )}
          </div>
        </form>
      </main>

      <style>{`
        @media (max-width: 780px) {
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function ProgressSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const current = n === step;
        const on = done || current;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              height: 4, borderRadius: 100,
              background: on ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.08)",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800,
                background: on ? "#e63946" : "rgba(255,255,255,0.06)",
                color: on ? "#fff" : "rgba(255,255,255,0.4)",
              }}>
                {done ? <Check size={11} strokeWidth={3} /> : n}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: current ? "#fff" : "rgba(255,255,255,0.45)" }}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CostToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
      border: "1px solid",
      background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.02)",
      color: active ? "#fff" : "rgba(255,255,255,0.6)",
      borderColor: active ? "transparent" : "rgba(255,255,255,0.08)",
      boxShadow: active ? "0 4px 14px rgba(230,57,70,0.3)" : "none",
    }}>
      {label}
    </button>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 16,
      padding: "10px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column" }}>
      <PremiumNav />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "96px 24px 48px" }}>
        <div style={{
          maxWidth: 480, width: "100%", padding: "40px 36px",
          background: "#0b0b0b", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 24px",
            background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={26} color="#e63946" />
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>
            Sign in to host a game.
          </h2>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, marginBottom: 28 }}>
            You need an account so players can message you and confirm their spot. It takes under a minute.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              height: 44, padding: "0 22px", borderRadius: 12,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)", color: "#fff", textDecoration: "none",
              fontSize: 13.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7,
              boxShadow: "0 6px 24px rgba(230,57,70,0.3)",
            }}>
              Sign in <ArrowRight size={14} />
            </Link>
            <Link href="/register" style={{
              height: 44, padding: "0 22px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none",
              fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center",
            }}>
              Create account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionCard({ Icon, title, hint, children }: { Icon: typeof Trophy; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "24px 26px", background: "#0b0b0b", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: hint ? 6 : 20 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.2)",
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

function FieldRow({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <Label>
        {label}
        {required && <span style={{ color: "#e63946", marginLeft: 4 }}>*</span>}
      </Label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

function PillSelect({ options, value, onChange }: { options: { l: string; v: string | number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(o => {
        const active = value === String(o.v);
        return (
          <button key={String(o.v)} type="button" onClick={() => onChange(String(o.v))} style={{
            padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: "1px solid", fontFamily: "inherit",
            background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.02)",
            color: active ? "#fff" : "rgba(255,255,255,0.6)",
            borderColor: active ? "transparent" : "rgba(255,255,255,0.08)",
            boxShadow: active ? "0 4px 14px rgba(230,57,70,0.3)" : "none",
            transition: "all 160ms ease",
          }}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "18px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
      {children}
    </div>
  );
}

function SlotPicker({ slots, value, onChange }: { slots: Slot[]; value: string; onChange: (id: string) => void }) {
  // Group concrete slots by their local calendar day for a tidy day-by-day picker.
  const groups: { day: string; label: string; items: Slot[] }[] = [];
  for (const s of slots) {
    const d = new Date(s.startTime);
    const key = d.toDateString();
    let g = groups.find(x => x.day === key);
    if (!g) {
      g = { day: key, label: d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }), items: [] };
      groups.push(g);
    }
    g.items.push(s);
  }
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map(g => (
        <div key={g.day}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{g.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {g.items.map(s => {
              const active = value === s.id;
              const disabled = !s.available;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onChange(s.id)}
                  title={disabled ? (s.reason === "blocked" ? `Blocked${s.blockReason ? `: ${s.blockReason}` : ""}` : "Unavailable") : undefined}
                  style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                    cursor: disabled ? "not-allowed" : "pointer",
                    background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.04)",
                    color: active ? "#fff" : disabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
                    border: active ? "1px solid transparent" : "1px solid rgba(255,255,255,0.1)",
                    textDecoration: disabled ? "line-through" : "none",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  {time(s.startTime)}–{time(s.endTime)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
