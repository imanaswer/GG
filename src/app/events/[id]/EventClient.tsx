"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, Trophy, MapPin, Calendar, Users, DollarSign, Target, Award, ChevronRight, CheckCircle, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { useEvent, useRegisterEvent, useCancelEvent, type SportEvent } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { EVENT_IMAGE } from "@/lib/premium-images";
import { computeEventCharge } from "@/lib/eventPricing";
import { withinCancelCutoff, CANCEL_CUTOFF_MESSAGE, CANCEL_CUTOFF_MIN } from "@/lib/gameTime";

type Tab = "overview" | "format" | "prizes" | "schedule" | "updates";

function TabButton({ id, active, onClick, label, count }: { id: Tab; active: Tab; onClick: (t: Tab) => void; label: string; count?: number }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: "10px 18px", borderRadius: 100,
        fontSize: 13, fontWeight: 600,
        border: "1px solid",
        background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.02)",
        color: isActive ? "#ff6b74" : "rgba(255,255,255,0.55)",
        borderColor: isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.06)",
        cursor: "pointer", fontFamily: "inherit",
        transition: "all 180ms",
      }}
    >
      {label}{count !== undefined && <span style={{ opacity: 0.5 }}> ({count})</span>}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "Live";
  const isOpen = status === "Registration Open";
  const isFull = status === "Full";
  const bg = isLive ? "rgba(255,255,255,0.92)"
           : isOpen ? "rgba(34,197,94,0.9)"
           : isFull ? "rgba(107,114,128,0.75)"
           : "rgba(96,165,250,0.88)";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 100,
      fontSize: 11, fontWeight: 700, color: "#fff",
      background: bg, backdropFilter: "blur(8px)",
    }}>
      {isLive && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}
        />
      )}
      {status}
    </span>
  );
}

export default function EventDetail({ params, initialEvent }: { params: Promise<{ id: string }>; initialEvent?: SportEvent }) {
  const { id } = use(params);
  const { data: event, isLoading, error } = useEvent(id, initialEvent);
  const { user } = useAuth();
  const reg = useRegisterEvent();
  const cancel = useCancelEvent();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName]   = useState("");
  const [paying, setPaying] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 420, borderRadius: 28, marginBottom: 32 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }} className="event-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[120, 200, 160].map(h => <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />)}
              </div>
              <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{
          background: "#050505", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{ textAlign: "center" }}>
            <h1 className="display" style={{ fontSize: 42, color: "#fff", marginBottom: 12 }}>
              Event not found.
            </h1>
            <Link href="/events" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 100,
              background: "#fff", color: "#000",
              textDecoration: "none", fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Back to events
            </Link>
          </div>
        </main>
      </>
    );
  }

  const spotsLeft    = event.maxParticipants - event.participants;
  const charge = computeEventCharge(event);
  const feeLines: { label: string; amount: number }[] = [{ label: "Entry fee", amount: charge.base }];
  if (charge.gst > 0) feeLines.push({ label: `GST (${event.gstPercent ?? 0}%)`, amount: charge.gst });
  if (charge.convenience > 0) feeLines.push({ label: `Convenience (${event.convenienceFeePct ?? 0}%)`, amount: charge.convenience });
  const pct          = Math.min(100, Math.round((event.participants / event.maxParticipants) * 100));
  const cardStyle: React.CSSProperties = { background: "rgba(13,13,13,0.7)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px 28px" };

  type SchedRow = { title: string; date: string; time: string; location: string };
  const scheduleRows: SchedRow[] = (event.schedule ?? []).map((s: Record<string, string>) =>
    "title" in s
      ? { title: s.title, date: s.date ?? "", time: s.time ?? "", location: s.location ?? "" }
      : { title: s.event ?? "", date: s.day ?? "", time: s.time ?? "", location: "" }
  );
  const hasFormatSpecs = !!(event.matchFormat || event.teamSize || event.numRounds || event.structure || event.eligibility);
  const updates = event.updates ?? [];
  const regClosed    = new Date(event.registrationDeadline) < new Date();
  const isLive       = event.status === "Live";
  const isTeam       = event.type === "Tournament" || event.type === "League" || event.type === "Festival";
  const hasPrize     = event.prizePool && event.prizePool !== "Prizes & Trophies";
  const img          = event.imageUrl || EVENT_IMAGE.src;
  const isRegistered = !!event.userRegistration;
  const regStatus = event.userRegistration?.status;
  const isPendingApproval = regStatus === "pending";
  const isRejected = regStatus === "rejected";
  const isCancelledReg = regStatus === "cancelled";
  const regPaid      = event.userRegistration?.paymentStatus === "paid" || event.userRegistration?.paymentStatus === "free";
  const canCancel    = !withinCancelCutoff(event.startDate, new Date());

  const payAndRegister = async (team?: string) => {
    if (!event || !user) return;
    setPaying(true);
    try {
      if (event.entryFeeAmount > 0) {
        const order = await createPaymentOrder({ amount: event.entryFeeAmount, entityType: "event", entityId: id });
        const success = await openRazorpayCheckout({
          keyId: order.keyId, orderId: order.orderId, amount: order.amount, currency: order.currency,
          name: "Game Ground", description: `Event entry · ${event.title}`,
          prefill: { name: user.name, email: user.email },
        });
        await verifyPayment({
          success, entityType: "event", entityId: id, amount: order.amount,
          registration: { entityType: "event", teamName: team },
          devMode: order.devMode,
        });
        qc.invalidateQueries({ queryKey: ["events"] });
        qc.invalidateQueries({ queryKey: ["event", id] });
        toast.success("Payment successful. You're registered.");
      } else {
        await reg.mutateAsync({ eventId: id, teamName: team });
      }
      setShowModal(false); setTeamName("");
    } catch (err) {
      toast.error((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleRegister = () => {
    if (!user)      { toast.error("Please sign in to register"); return; }
    if (regClosed)  { toast.error("Registration deadline has passed"); return; }
    if (spotsLeft <= 0) { toast.error("Event is full"); return; }
    if (isTeam) { setShowModal(true); return; }
    payAndRegister();
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Event link copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await payAndRegister(teamName.trim() || undefined);
  };

  const sideInfo: { Icon: typeof DollarSign; label: string; value: string; sub?: string; emphasis?: "red" | "gold" }[] = [
    { Icon: DollarSign, label: "Entry fee",   value: event.entryFee,   emphasis: event.entryFeeAmount === 0 ? undefined : "red" },
    { Icon: Trophy,     label: "Prize pool",  value: event.prizePool,  emphasis: hasPrize ? "gold" : undefined },
    { Icon: Users,      label: "Participants", value: `${event.participants}/${event.maxParticipants}` },
    { Icon: MapPin,     label: "Location",    value: event.address,    sub: [event.city, event.state].filter(Boolean).join(", ") || `${event.distance} away` },
  ];

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Main Content Layout */}
        <div className="container-lg" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 64 }} className="workshop-grid">
            
            {/* Left Column: Title & Content */}
            <div>
              <Reveal>
                <Link href="/events" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "rgba(255,255,255,0.5)", textDecoration: "none",
                  fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                  marginBottom: 32, transition: "color 200ms",
                }}
                onMouseOver={(e) => e.currentTarget.style.color = "#fff"}
                onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                >
                  <ArrowLeft size={14} /> Back to Events
                </Link>
              </Reveal>

              <Reveal delay={0.05}>
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 100, background: "#fff", color: "#000", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {event.sport}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 100, background: "rgba(255,255,255,0.1)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {event.type}
                  </span>
                  <StatusBadge status={event.status} />
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <h1 style={{
                  fontFamily: "var(--font-dela)",
                  fontSize: "clamp(32px, 5vw, 64px)",
                  lineHeight: 1.1,
                  color: "#fff",
                  marginBottom: 24,
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em"
                }}>
                  {event.title}
                </h1>
              </Reveal>

              {event.description && (
                <Reveal delay={0.15}>
                  <p style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(20px, 2.5vw, 28px)",
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: 48,
                    fontStyle: "italic"
                  }}>
                    {event.description}
                  </p>
                </Reveal>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
                
                {/* Hero Image */}
                <Reveal delay={0.2}>
                  <div style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "21/9",
                    borderRadius: 8,
                    overflow: "hidden"
                  }}>
                    <Image
                      src={img} alt={event.title}
                      fill priority quality={90} sizes="(max-width: 1000px) 100vw, 800px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </Reveal>

                {/* About Section */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>About this event</h2>
                    {!!event.aboutLong ? (
                      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{event.aboutLong}</p>
                    ) : (
                      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}>{event.description}</p>
                    )}
                  </div>
                </Reveal>

                {/* What you get */}
                {!!event.whatYouGet?.length && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>What you get</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                        {event.whatYouGet.map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                            <span style={{ fontSize: 15, color: "#fff", fontWeight: 500 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}

                {/* Format specs */}
                {hasFormatSpecs && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Format & Rules</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {event.matchFormat && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}><strong>Format:</strong> {event.matchFormat}</p>}
                        {event.structure && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}><strong>Structure:</strong> {event.structure}</p>}
                        {event.teamSize && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}><strong>Team size:</strong> {event.teamSize}</p>}
                        {event.numRounds && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}><strong>Rounds:</strong> {event.numRounds}</p>}
                        {event.eligibility && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}><strong>Eligibility:</strong> {event.eligibility}</p>}
                      </div>
                    </div>
                  </Reveal>
                )}
                
                {/* Requirements */}
                {!!event.requirements?.length && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Requirements</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                        {event.requirements.map((req, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                            <span style={{ fontSize: 15, color: "#fff", fontWeight: 500 }}>{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}
                
                {/* Organizer */}
                {event.organizer && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Organizer</h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: 8,
                          background: "#222",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 32, fontWeight: 800, color: "#fff", flexShrink: 0,
                        }}>
                          {event.organizer[0]}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "var(--font-dela)", textTransform: "uppercase" }}>{event.organizer}</h3>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )}

              </div>
            </div>

            {/* Right Column: Sidebar */}
            <aside>
              <div style={{ position: "sticky", top: 100 }}>
                
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#eab308", marginBottom: 4 }}>Prize Pool</p>
                  <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", fontFamily: "var(--font-dela)" }}>
                    {event.prizePool}
                  </p>
                </div>

                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Entry fee</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em", fontFamily: "var(--font-dela)" }}>
                    {event.entryFee}
                  </p>
                </div>

                {/* Enrollment status */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, paddingBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
                        Registration
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{pct}% full</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden", marginBottom: 16 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: "100%", background: "#fff" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      {spotsLeft <= 0 ? (
                        <span style={{ color: "#fff", fontWeight: 700 }}>Event is full</span>
                      ) : (
                        <span style={{ color: "#fff", fontWeight: 700 }}>
                          {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Details */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Details</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <Calendar size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{event.date}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <MapPin size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                          <span>{event.location}</span>
                          {event.distance && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 400, marginTop: 2 }}>{event.distance} away</span>}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginTop: 16,
                              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                              padding: "12px 20px", borderRadius: 100,
                              background: "transparent",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff", fontSize: 11, fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: "0.05em",
                              textDecoration: "none", cursor: "pointer", transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#fff"; }}
                          >
                            <MapPin size={14} /> View on Map
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Action Box */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, marginTop: 32 }}>
                    
                    {isRegistered && regPaid ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{
                          padding: "20px", borderRadius: 8,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          textAlign: "center",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                            <CheckCircle size={18} color="#fff" />
                            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                              Registered
                            </p>
                          </div>
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                            You are enrolled.
                          </p>
                        </div>
                        {canCancel ? (
                          <button
                            onClick={() => cancel.mutate(id)}
                            disabled={cancel.isPending}
                            style={{
                              padding: "16px", borderRadius: 100, background: "transparent",
                              border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                              fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            {cancel.isPending ? "Cancelling..." : "Cancel Registration"}
                          </button>
                        ) : (
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                            {CANCEL_CUTOFF_MESSAGE}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {feeLines.map((line, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                            <span>{line.label}</span>
                            <span>₹{line.amount}</span>
                          </div>
                        ))}
                        {feeLines.length > 1 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#fff", fontWeight: 700, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                            <span>Total</span>
                            <span>₹{charge.total}</span>
                          </div>
                        )}
                        <button
                          onClick={handleRegister}
                          disabled={regClosed || spotsLeft <= 0}
                          style={{
                            padding: "20px 24px", borderRadius: 100,
                            background: regClosed || spotsLeft <= 0 ? "rgba(255,255,255,0.1)" : "#fff",
                            color: regClosed || spotsLeft <= 0 ? "rgba(255,255,255,0.5)" : "#000",
                            border: "none", width: "100%", cursor: regClosed || spotsLeft <= 0 ? "not-allowed" : "pointer",
                            fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            marginTop: 16,
                          }}
                        >
                          {regClosed ? "Registration Closed" : spotsLeft <= 0 ? "Event Full" : "Register Now"}
                          {!regClosed && spotsLeft > 0 && <ArrowLeft size={16} style={{ transform: "rotate(135deg)" }} />}
                        </button>
                      </div>
                    )}
                  </div>
                </Reveal>

              </div>
            </aside>

          </div>
        </div>
      </main>

      {/* Registration Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
              onClick={() => !paying && setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                position: "relative", width: "100%", maxWidth: 440,
                background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24, padding: 32,
              }}
            >
              <button
                onClick={() => !paying && setShowModal(false)}
                style={{ position: "absolute", top: 24, right: 24, background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
              >
                <XIcon size={20} />
              </button>
              
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8, fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                Complete Registration
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>
                {event.title}
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {isTeam && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
                      Team Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="Enter team name"
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 15, outline: "none",
                      }}
                    />
                  </div>
                )}
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {feeLines.map((line, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                      <span>{line.label}</span>
                      <span>₹{line.amount}</span>
                    </div>
                  ))}
                  {feeLines.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#fff", fontWeight: 700, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <span>Total</span>
                      <span>₹{charge.total}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    style={{ marginTop: 4 }}
                  />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                    I agree to the rules and regulations of this event. Cancellations are only allowed up to {CANCEL_CUTOFF_MIN} minutes before the event starts.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!agreed || paying}
                  style={{
                    padding: "16px", borderRadius: 100,
                    background: (!agreed || paying) ? "rgba(255,255,255,0.1)" : "#fff",
                    color: (!agreed || paying) ? "rgba(255,255,255,0.5)" : "#000",
                    border: "none", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em",
                    cursor: (!agreed || paying) ? "not-allowed" : "pointer",
                    marginTop: 8,
                  }}
                >
                  {paying ? "Processing..." : charge.total > 0 ? `Pay ₹${charge.total}` : "Register"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 400% 100%;
          animation: skeleton-load 1.5s ease-in-out infinite;
        }
        @keyframes skeleton-load {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
        @media (max-width: 900px) {
          .workshop-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
