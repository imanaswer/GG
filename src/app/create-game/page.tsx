"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Lock, Trophy, MapPin, CalendarClock, Users, FileText, Sparkles, ArrowRight, Check, IndianRupee, Upload } from "lucide-react";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { Input, Label, Textarea } from "@/components/ui";
import { useCreateGame } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { defaultGameTitle, formatCost } from "@/lib/gameForm";
import { SPORTS } from "@/lib/taxonomy";
import {
  HOST_PAYMENT_METHODS, HOST_PAYMENT_METHOD_LABELS, HOST_PAYMENT_DISCLAIMER,
  acceptsUpi, isValidUpiId, type HostPaymentMethod,
} from "@/lib/hostPayment";

// Sports and levels come from the shared taxonomy — a hand-copied list here
// drifted to 7 sports against the platform's 11, making four of them unhostable.
const LEVELS = ["Beginner","Intermediate","Advanced","All Levels"];

type Venue = { id: string; name: string; description: string; address: string; supportedSports: string[]; lat?: number | null; lng?: number | null; openSlots?: number };
type Slot = { id: string; startTime: string; endTime: string; isBlocked: boolean; blockReason: string | null; available: boolean; reason: string | null };

type FormState = {
  sport: string; skillLevel: string; title: string;
  venueId: string; slotId: string;
  slots: string; paid: boolean; costAmount: string; description: string;
  // Host-collected fee details. Game Ground never processes this money, so the
  // host has to tell players how to send it.
  paymentMethod: HostPaymentMethod; hostUpiId: string; hostQrUrl: string;
  paymentNote: string; venueNote: string;
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
    paymentMethod: "upi", hostUpiId: "", hostQrUrl: "", paymentNote: "", venueNote: "",
  });
  const [qrUploading, setQrUploading] = useState(false);
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
  // A UPI-accepting paid game needs a usable UPI id or a QR — otherwise the
  // player is told to pay the host with no way to actually do it.
  const upiOk = !acceptsUpi(form.paymentMethod)
    || (form.hostUpiId.trim() !== "" && isValidUpiId(form.hostUpiId)) || !!form.hostQrUrl;
  const step3Valid = Number.isInteger(playersNum) && playersNum >= 2 && playersNum <= 100
    && (!form.paid || (amountNum > 0 && upiOk));
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
      ...(form.paid ? {
        paymentMethod: form.paymentMethod,
        hostUpiId: acceptsUpi(form.paymentMethod) ? form.hostUpiId.trim() || undefined : undefined,
        hostQrUrl: acceptsUpi(form.paymentMethod) ? form.hostQrUrl || undefined : undefined,
        paymentNote: form.paymentNote.trim() || undefined,
        venueNote: form.venueNote.trim() || undefined,
      } : {}),
      description: form.description || undefined,
    });
    router.push("/play");
  };

  if (!loading && !user) return <AuthGate />;

  return (
    <div className="noise" style={{ position: "relative", minHeight: "100vh", background: "#000", color: "#fff" }}>
      <PremiumNav />

      {/* Compact header */}
      <section style={{ position: "relative", paddingTop: 130, paddingBottom: 24 }}>
        <div className="container-lg" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 100,
            background: "#111", border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 11, fontWeight: 700, color: "#fff",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24,
          }}>
            Host a game
          </div>
          <h1 className="display" style={{
            fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 5vw, 64px)",
            lineHeight: 1, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8,
          }}>
            Set the game. <em style={{ fontStyle: "italic", color: "var(--text3)", paddingRight: "8px" }}>Find the people.</em>
          </h1>
        </div>
      </section>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        <ProgressSteps step={step} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* STEP 1 — What & where */}
          {step === 1 && (
            <>
              <SectionCard number="01" title="Sport & skill" hint="Pick the sport first — we'll tune the rest to match.">
                <FieldRow label="Sport" required>
                  <PillSelect options={SPORTS.map(s => ({ l: s, v: s }))} value={form.sport} onChange={selectSport} />
                </FieldRow>
                <FieldRow label="Skill level" required>
                  <PillSelect options={LEVELS.map(l => ({ l, v: l }))} value={form.skillLevel} onChange={v => set("skillLevel", v)} />
                </FieldRow>
              </SectionCard>

              <SectionCard number="02" title="Pick a venue" hint="Only GameGround-approved venues for your sport. Address fills in automatically.">
                {!form.sport ? (
                  <EmptyHint>Choose a sport above to see approved venues.</EmptyHint>
                ) : venuesFetching && venues.length === 0 ? (
                  <EmptyHint>Loading approved venues…</EmptyHint>
                ) : venues.length === 0 ? (
                  <EmptyHint>No approved {form.sport} venues are available yet. Please check back soon.</EmptyHint>
                ) : (
                  <div className="venue-grid" style={{ 
                    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 
                  }}>
                    {venues.map(v => {
                      const active = form.venueId === v.id;
                      const open = v.openSlots ?? 0;
                      return (
                        <button key={v.id} type="button" onClick={() => selectVenue(v.id)} className={`venue-card ${active ? "active" : ""}`} style={{
                          width: "100%",
                          padding: 20,
                          borderRadius: 16,
                          display: "flex", flexDirection: "column", justifyContent: "space-between",
                          background: active ? "#fff" : "rgba(255,255,255,0.03)",
                          border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.08)",
                          color: active ? "#000" : "#fff",
                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                          textAlign: "left",
                          cursor: open === 0 ? "not-allowed" : "pointer",
                          opacity: open === 0 ? 0.4 : 1,
                        }}>
                          <div>
                            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, lineHeight: 1.1, fontWeight: 400, marginBottom: 8, wordBreak: "break-word" }}>{v.name}</h3>
                            <p style={{ fontSize: 12, color: active ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{v.address}</p>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
                            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: active ? "#000" : "rgba(255,255,255,0.4)" }}>
                              {open > 0 ? `${open} slots open` : "Full"}
                            </div>
                            {active && (
                              <div style={{ width: 32, height: 32, background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                                <ArrowRight size={14} />
                              </div>
                            )}
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
            <SectionCard number="01" title="Pick an available slot" hint={`Times are set by ${selectedVenue?.name ?? "the venue"}. Blocked or booked slots can't be selected.`}>
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
              <SectionCard number="01" title="Players & cost">
                <FieldRow label="Max players" required>
                  <Input className="awwwards-input" type="number" min="2" max="100" placeholder="e.g. 10" value={form.slots} onChange={e => set("slots", e.target.value)} required />
                </FieldRow>
                <FieldRow label="Cost per player">
                  <div style={{ display: "flex", gap: 8, marginBottom: form.paid ? 12 : 0 }}>
                    <CostToggle active={!form.paid} label="Free" onClick={() => setForm(p => ({ ...p, paid: false, costAmount: "" }))} />
                    <CostToggle active={form.paid} label="Paid" onClick={() => set("paid", true)} />
                  </div>
                  {form.paid && (
                    <div style={{ position: "relative", maxWidth: 200 }}>
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "#fff", fontSize: 24, pointerEvents: "none" }}>₹</span>
                      <Input className="awwwards-input" type="number" min="1" placeholder="100" value={form.costAmount} onChange={e => set("costAmount", e.target.value)} style={{ paddingLeft: 28 }} />
                    </div>
                  )}
                </FieldRow>
              </SectionCard>

              {/* Players pay the host directly — Game Ground never touches this
                  money, so the host has to say how they want to receive it. */}
              {form.paid && (
                <SectionCard number="02" title="How players pay you" hint={HOST_PAYMENT_DISCLAIMER}>
                  <FieldRow label="Payment method" required>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {HOST_PAYMENT_METHODS.map(m => (
                        <CostToggle
                          key={m}
                          active={form.paymentMethod === m}
                          label={HOST_PAYMENT_METHOD_LABELS[m]}
                          onClick={() => set("paymentMethod", m)}
                        />
                      ))}
                    </div>
                  </FieldRow>

                  {acceptsUpi(form.paymentMethod) && (
                    <>
                      <FieldRow label="Your UPI ID" hint="Players can copy this to pay you. Add a QR instead if you prefer.">
                        <Input
                          className="awwwards-input"
                          placeholder="yourname@bank"
                          value={form.hostUpiId}
                          onChange={e => set("hostUpiId", e.target.value)}
                          style={{ maxWidth: 320 }}
                        />
                        {form.hostUpiId.trim() !== "" && !isValidUpiId(form.hostUpiId) && (
                          <p style={{ fontSize: 11.5, color: "#fbbf24", marginTop: 6 }}>
                            That doesn&apos;t look like a UPI ID — they look like <code>name@bank</code>.
                          </p>
                        )}
                      </FieldRow>

                      <FieldRow label="Your UPI QR code (optional)">
                        {form.hostQrUrl ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.hostQrUrl} alt="Your UPI QR code" width={72} height={72}
                                 style={{ width: 72, height: 72, objectFit: "contain", background: "#fff", borderRadius: 10, padding: 4 }} />
                            <button type="button" onClick={() => set("hostQrUrl", "")}
                              style={{
                                height: 34, padding: "0 14px", borderRadius: 100,
                                background: "transparent", color: "#fff",
                                border: "1px solid rgba(255,255,255,0.3)",
                                fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                              }}>
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            height: 40, padding: "0 16px", borderRadius: 100,
                            background: "rgba(255,255,255,0.04)", color: "#fff",
                            border: "1px solid rgba(255,255,255,0.12)",
                            fontSize: 12.5, fontWeight: 600,
                            cursor: qrUploading ? "not-allowed" : "pointer",
                            opacity: qrUploading ? 0.6 : 1,
                          }}>
                            <Upload size={14} />
                            {qrUploading ? "Uploading…" : "Upload QR image"}
                            <input
                              type="file" accept="image/*" hidden disabled={qrUploading}
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setQrUploading(true);
                                try {
                                  const fd = new FormData();
                                  fd.set("file", file);
                                  fd.set("folder", "gameground/upi-qr");
                                  const r = await fetch("/api/upload", { method: "POST", credentials: "include", body: fd });
                                  const j = await r.json();
                                  if (!r.ok || !j.ok) throw new Error(j?.error ?? "Upload failed");
                                  set("hostQrUrl", j.data.url);
                                } catch (err) {
                                  alert((err as Error).message);
                                } finally {
                                  setQrUploading(false);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        )}
                      </FieldRow>
                    </>
                  )}

                  <FieldRow label="Payment instructions (optional)">
                    <Textarea
                      className="awwwards-input awwwards-textarea"
                      rows={2}
                      maxLength={300}
                      placeholder="e.g. Pay via UPI after joining and send the screenshot on WhatsApp."
                      value={form.paymentNote}
                      onChange={e => set("paymentNote", e.target.value)}
                    />
                  </FieldRow>

                  <FieldRow label="Venue payment note (optional)" hint="If you're collecting on behalf of a venue. Game Ground is not involved in that transaction.">
                    <Textarea
                      className="awwwards-input awwwards-textarea"
                      rows={2}
                      maxLength={300}
                      placeholder="e.g. Host collects the fee and pays the venue."
                      value={form.venueNote}
                      onChange={e => set("venueNote", e.target.value)}
                    />
                  </FieldRow>
                </SectionCard>
              )}

              <SectionCard number={form.paid ? "03" : "02"} title="Title & notes" hint="We'll suggest a title — edit it, or add details below.">
                <FieldRow label="Game title" hint="Leave blank to use the suggestion.">
                  <Input className="awwwards-input" placeholder={defaultTitle} value={form.title} onChange={e => set("title", e.target.value)} />
                </FieldRow>
                <FieldRow label="Notes (optional)">
                  <Textarea
                    className="awwwards-input awwwards-textarea"
                    placeholder="e.g. Friendly 5v5, bring light and dark shirts. Parking available."
                    rows={4}
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                  />
                </FieldRow>
              </SectionCard>

              {/* Summary */}
              <div style={{ padding: "48px 0", borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Review</div>
                <SummaryRow label="Game"    value={form.title.trim() || defaultTitle} />
                <SummaryRow label="Sport"   value={`${form.sport} · ${form.skillLevel}`} />
                <SummaryRow label="Venue"   value={selectedVenue?.name ?? "—"} />
                <SummaryRow label="When"    value={selectedSlot ? `${slotDay(selectedSlot.startTime)} · ${slotTime(selectedSlot.startTime)}–${slotTime(selectedSlot.endTime)}` : "—"} />
                <SummaryRow label="Players" value={Number.isNaN(playersNum) ? "—" : String(playersNum)} />
                <SummaryRow label="Cost"    value={form.paid ? `${formatCost(amountNum)} per player` : "Free"} last={!form.paid} />
                {form.paid && (
                  <SummaryRow
                    label="Payment"
                    value={`You collect this directly · ${HOST_PAYMENT_METHOD_LABELS[form.paymentMethod]}`}
                    last
                  />
                )}
              </div>
              {form.paid && (
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginTop: 10 }}>
                  {HOST_PAYMENT_DISCLAIMER} Players see your payment details after they join.
                </p>
              )}
            </>
          )}

          {/* Nav bar */}
          <div className="create-game-navbar" style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "18px 22px",
            background: "#000",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 18, marginTop: 8,
          }}>
            <div className="create-game-nav-text" style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                {step === 3 ? (canSubmit ? "Ready to publish?" : "A few more details") : `Step ${step} of 3 · ${STEPS[step - 1]}`}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
                {step === 1 ? "Choose the sport, level and venue." : step === 2 ? "Pick a time that works." : "Your game appears instantly in the /play feed."}
              </div>
            </div>

            <Link href="/play" className="create-game-nav-btn create-game-nav-btn-secondary" style={{
              height: 44, padding: "0 18px", borderRadius: 100,
              background: "transparent", color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none",
              fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center"
            }}>
              Cancel
            </Link>

            {step > 1 && (
              <button type="button" className="create-game-nav-btn create-game-nav-btn-secondary" onClick={() => setStep((step - 1) as 1 | 2 | 3)} style={{
                height: 44, padding: "0 18px", borderRadius: 100,
                background: "transparent", color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.15)", fontFamily: "inherit",
                fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center"
              }}>
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                className="create-game-nav-btn create-game-nav-btn-primary"
                disabled={step === 1 ? !step1Valid : !step2Valid}
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                style={{
                  height: 44, padding: "0 22px", borderRadius: 100, fontSize: 13.5, fontWeight: 700,
                  fontFamily: "inherit",
                  background: (step === 1 ? step1Valid : step2Valid) ? "#fff" : "transparent",
                  color: (step === 1 ? step1Valid : step2Valid) ? "#000" : "rgba(255,255,255,0.4)",
                  border: (step === 1 ? step1Valid : step2Valid) ? "1px solid #fff" : "1px solid rgba(255,255,255,0.15)",
                  cursor: (step === 1 ? step1Valid : step2Valid) ? "pointer" : "not-allowed",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                className="create-game-nav-btn create-game-nav-btn-primary"
                disabled={createGame.isPending || !canSubmit}
                style={{
                  height: 44, padding: "0 22px", borderRadius: 100, fontSize: 13.5, fontWeight: 700,
                  fontFamily: "inherit",
                  background: canSubmit ? "#fff" : "transparent",
                  color: canSubmit ? "#000" : "rgba(255,255,255,0.4)",
                  border: canSubmit ? "1px solid #fff" : "1px solid rgba(255,255,255,0.15)",
                  cursor: (createGame.isPending || !canSubmit) ? "not-allowed" : "pointer",
                  opacity: createGame.isPending ? 0.6 : 1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {createGame.isPending ? "Publishing…" : (<>Publish game <ArrowRight size={14} /></>)}
              </button>
            )}
          </div>
        </form>
      </main>

      <style>{`
        .slot-grid {
          display: flex;
          flex-wrap: wrap;
        }
        .slot-btn {
          padding: 12px 24px;
          font-size: 14px;
        }
        @media (max-width: 780px) {
          .two-col { grid-template-columns: 1fr !important; }
          .slot-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
          }
          .slot-btn {
            padding: 10px 12px !important;
            font-size: 13px !important;
            width: 100%;
          }
          .create-game-navbar[style] {
            flex-wrap: wrap !important;
            padding: 16px !important;
            gap: 12px !important;
          }
          .create-game-nav-text[style] {
            flex: 1 1 100% !important;
            margin-bottom: 8px;
          }
          .create-game-nav-btn-secondary {
            flex: 1 !important;
          }
          .create-game-nav-btn-primary {
            flex: 1 1 100% !important;
          }
        }
        @media (min-width: 1024px) {
          .section-card-layout {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 80px;
          }
          .section-card-title {
            display: flex;
            gap: 24px;
            align-items: flex-start;
            position: sticky;
            top: 140px;
          }
        }
        @media (max-width: 1023px) {
          .section-card-title {
            display: flex;
            gap: 16px;
            margin-bottom: 48px;
            align-items: baseline;
          }
        }
        .awwwards-input {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 0 !important;
          padding-top: 16px !important;
          padding-bottom: 16px !important;
          font-size: 24px !important;
          color: #fff !important;
          box-shadow: none !important;
          outline: none !important;
          transition: border-color 0.3s ease !important;
        }
        .awwwards-input:focus {
          border-bottom-color: #fff !important;
        }
        .awwwards-textarea {
          font-size: 18px !important;
          resize: none;
        }
        .venue-card:not(.active):hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.15) !important;
        }
      `}</style>
    </div>
  );
}

function ProgressSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 48 }}>
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const current = n === step;
        const on = done || current;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              height: 2,
              background: on ? "#fff" : "rgba(255,255,255,0.15)",
              transition: "background 0.3s ease",
            }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: current ? "#fff" : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              0{n} · {label}
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
      padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 500, fontFamily: "var(--font-sans)", cursor: "pointer",
      border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.2)",
      background: active ? "#fff" : "transparent",
      color: active ? "#000" : "rgba(255,255,255,0.7)",
      transition: "all 0.3s cubic-bezier(0.2, 0.6, 0.2, 1)",
    }}>
      {label}
    </button>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center",
      padding: "16px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.1)",
    }}>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 400, color: "#fff", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function AuthGate() {
  return (
    <div className="noise" style={{ position: "relative", minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column" }}>
      <PremiumNav />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "96px 24px 48px" }}>
        <div style={{
          maxWidth: 480, width: "100%", padding: "40px 36px",
          background: "#111", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 24px",
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={26} color="#fff" />
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>
            Sign in to host a game.
          </h2>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, marginBottom: 28 }}>
            You need an account so players can message you and confirm their spot. It takes under a minute.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              height: 44, padding: "0 22px", borderRadius: 100,
              background: "#fff", color: "#000", textDecoration: "none",
              fontSize: 13.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7,
              border: "1px solid #fff",
            }}>
              Sign in <ArrowRight size={14} />
            </Link>
            <Link href="/register" style={{
              height: 44, padding: "0 22px", borderRadius: 100,
              background: "transparent", color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none",
              fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center",
            }}>
              Create account
            </Link>
          </div>
        </div>
        <style>{`
          .venue-card {
            aspect-ratio: 1/1;
          }
          @media (max-width: 768px) {
            .venue-card {
              aspect-ratio: auto !important;
              min-height: 180px;
              gap: 40px;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

function SectionCard({ number, title, hint, children }: { number?: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="section-card-layout" style={{ padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
      <div className="section-card-title">
        {number && <span style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{number}</span>}
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{title}</h2>
          {hint && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginTop: 24, maxWidth: 400, lineHeight: 1.5 }}>{hint}</p>}
        </div>
      </div>
      <div className="section-card-content" style={{ display: "flex", flexDirection: "column", gap: 48, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
        {label}
        {required && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>*</span>}
      </div>
      {children}
      {hint && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>{hint}</p>}
    </div>
  );
}

function PillSelect({ options, value, onChange }: { options: { l: string; v: string | number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {options.map(o => {
        const active = value === String(o.v);
        return (
          <button key={String(o.v)} type="button" onClick={() => onChange(String(o.v))} style={{
            padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: "pointer",
            border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.2)", fontFamily: "var(--font-sans)",
            background: active ? "#fff" : "transparent",
            color: active ? "#000" : "rgba(255,255,255,0.7)",
            transition: "all 0.3s cubic-bezier(0.2, 0.6, 0.2, 1)",
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
          <div className="slot-grid" style={{ gap: 8 }}>
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
                  className="slot-btn"
                  style={{
                    borderRadius: 100, fontWeight: 500, fontFamily: "var(--font-sans)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    background: active ? "#fff" : "transparent",
                    color: active ? "#000" : disabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
                    border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                    textDecoration: disabled ? "line-through" : "none",
                    opacity: disabled ? 0.6 : 1,
                    transition: "all 0.3s cubic-bezier(0.2, 0.6, 0.2, 1)",
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
