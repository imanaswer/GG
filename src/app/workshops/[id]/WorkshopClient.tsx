"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, Star, MapPin, Calendar, Users, Target, DollarSign, Clock, ChevronRight, Check, CheckCircle, Award, Phone, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { useWorkshop, useCancelWorkshop, type Workshop } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { WORKSHOP_IMAGE } from "@/lib/premium-images";
import { withinCancelCutoff, CANCEL_CUTOFF_MESSAGE, CANCEL_CUTOFF_MIN } from "@/lib/gameTime";

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.toLocaleDateString("en-IN", { ...opts, year: "numeric" })} – ${e.toLocaleDateString("en-IN", { ...opts, year: "numeric" })}`;
  }
  if (s.getMonth() === e.getMonth() && s.getDate() === e.getDate()) {
    return s.toLocaleDateString("en-IN", { ...opts, year: "numeric" });
  }
  return `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", { ...opts, year: "numeric" })}`;
}

function audienceLabelFor(type: string): string {
  if (type === "youth") return "Youth";
  if (type === "adult") return "Adults";
  return "All ages";
}

export default function WorkshopDetail({ params, initialWorkshop }: { params: Promise<{ id: string }>; initialWorkshop?: Workshop }) {
  const { id } = use(params);
  const { data: workshop, isLoading, error } = useWorkshop(id, initialWorkshop);
  const { user } = useAuth();
  const cancel = useCancelWorkshop();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [regType, setRegType] = useState<"youth" | "adult">("adult");
  const [participantName, setParticipantName] = useState("");
  const [participantAge, setParticipantAge] = useState("");
  const [paying, setPaying] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Hydration fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 420, borderRadius: 28, marginBottom: 32 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[120, 200, 160].map(h => <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !workshop) {
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
              Workshop not found.
            </h1>
            <Link href="/workshops" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 100,
              background: "#fff", color: "#000",
              textDecoration: "none", fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Back to workshops
            </Link>
          </div>
        </main>
      </>
    );
  }

  const spotsLeft    = workshop.maxParticipants - workshop.participants;
  const pct          = Math.min(100, Math.round((workshop.participants / workshop.maxParticipants) * 100));
  const daysLeft     = Math.max(0, Math.floor((new Date(workshop.registrationDeadline).getTime() - Date.now()) / 86400000));
  const regClosed    = daysLeft === 0;
  const img          = workshop.imageUrl || WORKSHOP_IMAGE.src;
  const isRegistered = !!workshop.userRegistration;
  const regPaid      = workshop.userRegistration?.paymentStatus === "paid";
  const canCancel    = !withinCancelCutoff(workshop.startDate, new Date());
  const dateRange    = formatDateRange(workshop.startDate, workshop.endDate);
  const audienceLabel = audienceLabelFor(workshop.audienceType);

  const handleRegister = () => {
    if (!user) { toast.error("Please sign in to register"); return; }
    if (spotsLeft <= 0 || regClosed) return;
    if (workshop.audienceType === "youth") {
      setRegType("youth");
      setParticipantName("");
    } else if (workshop.audienceType === "adult") {
      setRegType("adult");
      setParticipantName(user.name);
    } else {
      setRegType("adult");
      setParticipantName(user.name);
    }
    setParticipantAge("");
    setShowModal(true);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Workshop link copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshop || !user) return;
    if (!participantName.trim()) return;
    const name = participantName.trim();
    const age = regType === "youth" ? (parseInt(participantAge) || 10) : undefined;
    setPaying(true);
    try {
      const order = await createPaymentOrder({ amount: workshop.price, entityType: "workshop", entityId: id });
      const success = await openRazorpayCheckout({
        keyId: order.keyId, orderId: order.orderId, amount: order.amount, currency: order.currency,
        name: "Game Ground", description: `Workshop · ${workshop.title}`,
        prefill: { name: user.name, email: user.email },
      });
      await verifyPayment({
        success, entityType: "workshop", entityId: id, amount: order.amount,
        registration: { entityType: "workshop", participantName: name, participantAge: age, registrationType: regType },
        devMode: order.devMode,
      });
      qc.invalidateQueries({ queryKey: ["workshops"] });
      qc.invalidateQueries({ queryKey: ["workshop", id] });
      setShowModal(false);
      toast.success("Registration complete!");
    } catch (err) {
      toast.error((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const sessionTypeBadge = workshop.sessionType === "series"
    ? `${workshop.sessionCount}-session series`
    : "Single session";

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        <style>{`
          .workshop-grid {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 64px;
          }
          @media (max-width: 1024px) {
            .workshop-grid {
              grid-template-columns: 1fr;
              gap: 40px;
            }
          }
          .instructor-layout {
            display: flex;
            align-items: flex-start;
            gap: 24px;
          }
          @media (max-width: 640px) {
            .instructor-layout {
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
          }
        `}</style>
        {/* Main Content Layout */}
        <div className="container-lg" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div className="workshop-grid">
            
            {/* Left Column: Title & Content */}
            <div>
              <Reveal>
                <Link href="/workshops" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "rgba(255,255,255,0.5)", textDecoration: "none",
                  fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                  marginBottom: 32, transition: "color 200ms",
                }}
                onMouseOver={(e) => e.currentTarget.style.color = "#fff"}
                onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                >
                  <ArrowLeft size={14} /> Back to Workshops
                </Link>
              </Reveal>

              <Reveal delay={0.05}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 6, background: "#fff", color: "#000", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {workshop.sport}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {sessionTypeBadge}
                  </span>
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
                  {workshop.title}
                </h1>
              </Reveal>

              <Reveal delay={0.15}>
                <p style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(20px, 2.5vw, 28px)",
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 48,
                  fontStyle: "italic"
                }}>
                  {workshop.description}
                </p>
              </Reveal>

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
                      src={img} alt={workshop.title}
                      fill priority quality={90} sizes="(max-width: 1000px) 100vw, 800px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </Reveal>

                {/* Highlights */}
                {workshop.highlights.length > 0 && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Highlights</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {workshop.highlights.map((h, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <Check size={16} color="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 15, color: "#fff", lineHeight: 1.5 }}>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}

                {/* Sessions */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                      {workshop.sessionType === "series" ? `${workshop.sessionCount}-session series` : "Session details"}
                    </h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
                      {workshop.sessionType === "series" ? `${workshop.sessionDuration} per session` : workshop.sessionDuration}
                    </p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {workshop.sessions.map((s, i) => (
                        <div key={i} style={{
                          display: "flex", gap: 20, padding: "24px", borderRadius: 8,
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          {workshop.sessionType === "series" && (
                            <div style={{
                              width: 48, height: 48, borderRadius: "50%",
                              border: "1px solid rgba(255,255,255,0.2)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0,
                            }}>{i + 1}</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.date}</span>
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{s.time}</span>
                            </div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8, fontFamily: "var(--font-serif)", fontStyle: "italic" }}>{s.topic}</p>
                            {s.description && <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{s.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>

                {/* Instructor */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Instructor</h2>
                    <div className="instructor-layout">
                      <div style={{
                        width: 96, height: 96, borderRadius: 8,
                        background: workshop.instructor.imageUrl ? undefined : "#222",
                        overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, fontWeight: 800, color: "#fff", flexShrink: 0,
                        // Removed grayscale
                      }}>
                        {workshop.instructor.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={workshop.instructor.imageUrl} alt={workshop.instructor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : (workshop.instructor.name?.[0] ?? "I")}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8, fontFamily: "var(--font-dela)", textTransform: "uppercase" }}>{workshop.instructor.name}</h3>
                        {workshop.instructor.credentials && (
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 6,
                            background: "rgba(255,255,255,0.1)", color: "#fff", marginBottom: 16, display: "inline-block", textTransform: "uppercase", letterSpacing: "0.05em",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%"
                          }}>{workshop.instructor.credentials}</span>
                        )}
                        {workshop.instructor.bio && (
                          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, fontFamily: "var(--font-serif)" }}>
                            {workshop.instructor.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>

              </div>
            </div>

            {/* Right Column: Sidebar */}
            <aside>
              <div style={{ position: "sticky", top: 100 }}>
                
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Total price</p>
                  <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", fontFamily: "var(--font-dela)" }}>
                    {workshop.priceDisplay}
                  </p>
                </div>

                {/* Enrollment status */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, paddingBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
                        Enrollment
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
                        <span style={{ color: "#fff", fontWeight: 700 }}>Workshop is full</span>
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
                        <Users size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{audienceLabel}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <Target size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{workshop.skillLevel}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <Calendar size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{dateRange}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <MapPin size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                          <span>{workshop.address || workshop.location}</span>
                          {workshop.distance && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 400, marginTop: 2 }}>{workshop.distance} away</span>}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workshop.address || workshop.location || "")}`}
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
                    {daysLeft > 0 && !regClosed && daysLeft <= 7 && (
                      <div style={{
                        padding: "12px 16px", borderRadius: 8, marginBottom: 20,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}>
                        <p style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to register
                        </p>
                      </div>
                    )}

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
                            {workshop.userRegistration?.participantName} is enrolled.
                          </p>
                        </div>
                        {canCancel ? (
                          <button
                            disabled={cancel.isPending}
                            onClick={() => { if (confirm("Cancel your registration for this workshop?")) cancel.mutate(id); }}
                            style={{
                              width: "100%", height: 52, borderRadius: 100,
                              fontSize: 13, fontWeight: 700, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                              background: "transparent",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.2)",
                              cursor: cancel.isPending ? "not-allowed" : "pointer",
                              opacity: cancel.isPending ? 0.7 : 1,
                            }}
                          >
                            {cancel.isPending ? "Cancelling…" : "Cancel registration"}
                          </button>
                        ) : (
                          <div style={{
                            padding: "16px", borderRadius: 8,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            textAlign: "center",
                          }}>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                              {CANCEL_CUTOFF_MESSAGE}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : isRegistered && !regPaid ? (
                      <div style={{
                        padding: "20px", borderRadius: 8,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px dashed rgba(255,255,255,0.2)",
                        textAlign: "center",
                      }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                          Payment pending
                        </p>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                          Complete payment to confirm registration
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {spotsLeft > 0 && !regClosed && (
                          <label style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "16px", borderRadius: 8,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            cursor: "pointer",
                          }}>
                            <input
                              type="checkbox"
                              checked={agreed}
                              onChange={(e) => setAgreed(e.target.checked)}
                              style={{ marginTop: 2, accentColor: "#fff" }}
                            />
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                              I accept the <Link href="/terms" style={{ color: "#fff" }}>Terms of Service</Link> and understand the <Link href="/refund-policy" style={{ color: "#fff" }}>cancellation policy</Link>.
                            </span>
                          </label>
                        )}
                        <button
                          onClick={handleRegister}
                          disabled={spotsLeft <= 0 || regClosed || (!isRegistered && !agreed)}
                          style={{
                            width: "100%", height: 56, borderRadius: 100,
                            fontSize: 14, fontWeight: 700, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                            background: spotsLeft > 0 && !regClosed && agreed ? "#fff" : "rgba(255,255,255,0.1)",
                            color: spotsLeft > 0 && !regClosed && agreed ? "#000" : "rgba(255,255,255,0.3)",
                            border: "none",
                            cursor: (spotsLeft > 0 && !regClosed && agreed) ? "pointer" : "not-allowed",
                            transition: "all 200ms",
                          }}
                        >
                          {regClosed ? "Registration Closed" : spotsLeft <= 0 ? "Workshop Full" : "Register Now"}
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
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !paying && setShowModal(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{
                position: "fixed", top: "50%", left: "50%", x: "-50%", y: "-50%", zIndex: 10000,
                width: "90%", maxWidth: 440,
                background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24, padding: 32, overflow: "hidden",
              }}
            >
              <button
                onClick={() => !paying && setShowModal(false)}
                style={{
                  position: "absolute", top: 20, right: 20,
                  width: 32, height: 32, borderRadius: 100,
                  background: "rgba(255,255,255,0.1)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", cursor: "pointer",
                }}
              >
                <XIcon size={16} />
              </button>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8, fontFamily: "var(--font-dela)" }}>Complete Registration</h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>
                Please provide participant details for this workshop.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {workshop.audienceType === "youth" ? (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Child&apos;s Full Name</label>
                      <input
                        required type="text"
                        value={participantName} onChange={e => setParticipantName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        style={{
                          width: "100%", padding: "14px 16px", borderRadius: 12,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: 15, outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Child&apos;s Age</label>
                      <input
                        required type="number" min="5" max="18"
                        value={participantAge} onChange={e => setParticipantAge(e.target.value)}
                        placeholder="e.g. 12"
                        style={{
                          width: "100%", padding: "14px 16px", borderRadius: 12,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: 15, outline: "none",
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Participant Name</label>
                    <input
                      required type="text"
                      value={participantName} onChange={e => setParticipantName(e.target.value)}
                      placeholder="Your full name"
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 15, outline: "none",
                      }}
                    />
                  </div>
                )}

                <div style={{
                  padding: "16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginTop: 8,
                }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Total Due</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{workshop.priceDisplay}</span>
                </div>

                <button
                  type="submit"
                  disabled={paying || !participantName.trim() || (workshop.audienceType === "youth" && !participantAge)}
                  style={{
                    width: "100%", height: 56, borderRadius: 100,
                    background: "#fff", color: "#000",
                    fontSize: 15, fontWeight: 700, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                    border: "none", cursor: paying ? "not-allowed" : "pointer",
                    opacity: paying ? 0.7 : 1, marginTop: 8,
                  }}
                >
                  {paying ? "Processing..." : `Pay ${workshop.priceDisplay}`}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
