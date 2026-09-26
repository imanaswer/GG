"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, Star, MapPin, Calendar, Users, Target, DollarSign, Clock, ChevronRight, Check, CheckCircle, Award, Phone, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { SkillBadge, SportBadge } from "@/components/Shared";
import { useCamp, useCancelCamp, type Camp } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { CAMP_IMAGE } from "@/lib/premium-images";
import { withinCancelCutoff, CANCEL_CUTOFF_MESSAGE, CANCEL_CUTOFF_MIN } from "@/lib/gameTime";

export default function CampDetail({ params, initialCamp }: { params: Promise<{ id: string }>; initialCamp?: Camp }) {
  const { id } = use(params);
  const { data: camp, isLoading, error } = useCamp(id, initialCamp);
  const { user } = useAuth();
  const cancel = useCancelCamp();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge]   = useState("");
  const [paying, setPaying] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 360, borderRadius: 28, marginBottom: 40 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }} className="camp-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[160, 160, 200].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 20 }} />)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[120, 100, 80].map(h => <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />)}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !camp) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{
          background: "#050505", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{ textAlign: "center" }}>
            <h1 className="display" style={{ fontFamily: "var(--font-dela)", fontSize: 42, color: "#fff", marginBottom: 12, textTransform: "uppercase" }}>
              Camp not found.
            </h1>
            <Link href="/camps" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 100,
              background: "#fff", color: "#000",
              textDecoration: "none", fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Back to camps
            </Link>
          </div>
        </main>
      </>
    );
  }

  const spotsLeft    = camp.maxParticipants - camp.participants;
  const pct          = Math.min(100, Math.round((camp.participants / camp.maxParticipants) * 100));
  const daysLeft     = Math.max(0, Math.floor((new Date(camp.registrationDeadline).getTime() - Date.now()) / 86400000));
  const regClosed    = daysLeft === 0;
  const img          = camp.imageUrl || CAMP_IMAGE.src;
  const isRegistered = !!camp.userRegistration;
  const regPaid      = camp.userRegistration?.paymentStatus === "paid";
  const canCancel    = !withinCancelCutoff(camp.startDate, new Date());

  const handleRegister = () => {
    if (!user) { toast.error("Please sign in to register"); return; }
    if (spotsLeft <= 0 || regClosed) return;
    setShowModal(true);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Camp link copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camp || !user) return;
    if (!childName.trim()) return;
    const age  = parseInt(childAge) || 10;
    const name = childName.trim();
    setPaying(true);
    try {
      const order = await createPaymentOrder({ amount: camp.price, entityType: "camp", entityId: id });
      const success = await openRazorpayCheckout({
        keyId: order.keyId, orderId: order.orderId, amount: order.amount, currency: order.currency,
        name: "Game Ground", description: `Camp registration · ${camp.title}`,
        prefill: { name: user.name, email: user.email },
      });
      await verifyPayment({
        success, entityType: "camp", entityId: id, amount: order.amount,
        registration: { entityType: "camp", childName: name, childAge: age },
        devMode: order.devMode,
      });
      qc.invalidateQueries({ queryKey: ["camps"] });
      qc.invalidateQueries({ queryKey: ["camp", id] });
      setShowModal(false); setChildName(""); setChildAge("");
      toast.success("Registration complete. See you at the camp.");
    } catch (err) {
      toast.error((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Hero */}
        <section style={{ position: "relative", paddingTop: 120, paddingBottom: 60, overflow: "hidden", minHeight: "50vh", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
            <Image
              src={img} alt={camp.title}
              fill priority quality={80} sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.7) 60%, #050505 100%)",
          }} />

          <div className="container-lg" style={{ position: "relative", zIndex: 10 }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 60, flexWrap: "wrap", gap: 12 }}>
                <Link href="/camps" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 100,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 11, fontWeight: 700, color: "#fff",
                  textDecoration: "none", backdropFilter: "blur(20px)",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  transition: "background 300ms ease"
                }}>
                  <ArrowLeft size={14} /> Back
                </Link>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleShare}
                    style={{
                      width: 44, height: 44, borderRadius: 100,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", cursor: "pointer", backdropFilter: "blur(20px)",
                      transition: "background 300ms ease"
                    }}
                    title="Copy link"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                <SportBadge sport={camp.sport} />
                <SkillBadge level={camp.skillLevel} />
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: "blur(12px)", letterSpacing: "0.05em", textTransform: "uppercase"
                }}>
                  {camp.priceDisplay}
                </span>
                {spotsLeft <= 10 && spotsLeft > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                    background: "#fff", color: "#000",
                    border: "none",
                    backdropFilter: "blur(12px)", letterSpacing: "0.05em", textTransform: "uppercase",
                    boxShadow: "0 0 16px rgba(255,255,255,0.2)"
                  }}>
                    Only {spotsLeft} spots left
                  </span>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 style={{
                fontFamily: "var(--font-dela)",
                fontSize: "clamp(40px, 8vw, 96px)",
                color: "#fff", marginBottom: 32,
                lineHeight: 0.85, textTransform: "uppercase",
                maxWidth: 1100,
              }}>
                {camp.title}
              </h1>
            </Reveal>

            <Reveal delay={0.15}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 32, fontSize: 13, fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MapPin size={16} color="#fff" /> {camp.location}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Calendar size={16} color="#fff" /> {camp.dates}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Star size={16} color="#fff" fill="#fff" /> {camp.rating} ({camp.reviews} REVIEWS)
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Body */}
        <section style={{ paddingBottom: 120 }}>
          <div className="container-lg">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 32 }} className="camp-grid">
              
              {/* Left Column (Content) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 60 }}>
                
                {/* About */}
                <Reveal>
                  <div>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>About this camp</h2>
                    <p style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "#fff", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
                      {camp.description}
                    </p>
                  </div>
                </Reveal>

                {/* Highlights */}
                {camp.highlights.length > 0 && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Highlights</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {camp.highlights.map((h, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", marginTop: 10, flexShrink: 0 }} />
                            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}

                {/* Included & What to Bring (Two Column) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>What&rsquo;s included</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {camp.included.map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <Check size={16} color="#fff" style={{ marginTop: 4, flexShrink: 0 }} />
                            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>What to bring</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {camp.whatToBring.map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", marginTop: 10, flexShrink: 0 }} />
                            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                </div>

                {/* Schedule */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Daily schedule</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24, fontStyle: "italic" }}>
                      Repeats for all {camp.duration.toLowerCase()} of the camp.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {camp.dailySchedule.map((item, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 16,
                          padding: "16px 20px", borderRadius: 16,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120, flexShrink: 0 }}>
                            <Clock size={14} color="#fff" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.time}</span>
                          </div>
                          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>{item.activity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>

                {/* Coaches */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Coaches</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                      {camp.coaches.map((coach, i) => (
                        <div key={i} style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 20, padding: "20px",
                          display: "flex", alignItems: "center", gap: 16,
                        }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: "50%",
                            background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, fontWeight: 800, color: "#000", flexShrink: 0,
                          }}>
                            {coach.name.split(" ").pop()?.[0] ?? "C"}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.01em" }}>
                              {coach.name}
                            </h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 100,
                                border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)",
                                textTransform: "uppercase", letterSpacing: "0.05em"
                              }}>{coach.experience}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 100,
                                background: "rgba(255,255,255,0.1)", color: "#fff",
                                textTransform: "uppercase", letterSpacing: "0.05em"
                              }}>{coach.specialty}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>

                {/* Reviews */}
                {camp.testimonials.length > 0 && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Reviews</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                        {camp.testimonials.map((t, i) => (
                          <div key={i} style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 20, padding: "24px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{
                                  width: 40, height: 40, borderRadius: "50%",
                                  background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                                  fontWeight: 800, fontSize: 14, color: "#000",
                                }}>
                                  {t.name[0]}
                                </div>
                                <div>
                                  <p style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{t.name}</p>
                                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                                    {t.age} years old
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 2 }}>
                                {Array.from({ length: t.rating }).map((_, j) => (
                                  <Star key={j} size={12} color="#fff" fill="#fff" />
                                ))}
                              </div>
                            </div>
                            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, fontStyle: "italic" }}>
                              &ldquo;{t.text}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}

              </div>

              {/* Right Sidebar */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                
                {/* Enrollment status */}
                <Reveal>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Spots filled</span>
                      <span style={{ color: "#fff" }}>{camp.participants}/{camp.maxParticipants}</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: "100%", background: "#fff" }}
                      />
                    </div>
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      {spotsLeft <= 0 ? (
                        <span style={{ color: "#fff", fontWeight: 700 }}>Camp is full</span>
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
                        <span>{camp.ageGroup}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <Target size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{camp.skillLevel}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <DollarSign size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{camp.priceDisplay} <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 400, marginLeft: 6 }}>All-inclusive</span></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <MapPin size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                          <span>{camp.address}</span>
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 400, marginTop: 2 }}>{camp.distance} away</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(camp.address)}`}
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

                {/* Organizer */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Questions?</h2>
                    <a
                      href={`tel:${camp.organizerContact}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 20px", borderRadius: 100, textDecoration: "none",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                        transition: "background 300ms ease"
                      }}
                    >
                      <Phone size={14} /> Call Organizer
                    </a>
                  </div>
                </Reveal>

                {/* Action Box */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Total price</p>
                      <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", fontFamily: "var(--font-dela)" }}>
                        {camp.priceDisplay}
                      </p>
                    </div>

                    {daysLeft > 0 && !regClosed && daysLeft <= 7 && (
                      <div style={{
                        padding: "12px 16px", borderRadius: 16, marginBottom: 20,
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}>
                        <p style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to register
                        </p>
                      </div>
                    )}

                    {isRegistered && regPaid ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{
                          padding: "20px", borderRadius: 20,
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
                            {camp.userRegistration?.childName} is enrolled.
                          </p>
                        </div>
                        {canCancel ? (
                          <button
                            disabled={cancel.isPending}
                            onClick={() => { if (confirm("Cancel your registration for this camp?")) cancel.mutate(id); }}
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
                            padding: "16px", borderRadius: 20,
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
                        padding: "20px", borderRadius: 20,
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
                            padding: "16px", borderRadius: 20,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            cursor: "pointer",
                          }}>
                            <input
                              type="checkbox"
                              checked={agreed}
                              onChange={e => setAgreed(e.target.checked)}
                              style={{ marginTop: 2, accentColor: "#000", width: 16, height: 16, flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                              I agree that cancellations are only allowed up to {CANCEL_CUTOFF_MIN} minutes before the start time.
                            </span>
                          </label>
                        )}
                        <Magnetic strength={6}>
                          <button
                            onClick={handleRegister}
                            disabled={(!agreed && spotsLeft > 0 && !regClosed) || spotsLeft <= 0 || regClosed || paying}
                            style={{
                              width: "100%", height: 56, borderRadius: 100,
                              fontSize: 14, fontWeight: 800, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                              background: (spotsLeft <= 0 || regClosed || !agreed)
                                ? "rgba(255,255,255,0.04)"
                                : "#fff",
                              color: (spotsLeft <= 0 || regClosed || !agreed) ? "rgba(255,255,255,0.45)" : "#000",
                              border: (spotsLeft <= 0 || regClosed || !agreed) ? "1px solid rgba(255,255,255,0.08)" : "none",
                              cursor: (!agreed || spotsLeft <= 0 || regClosed || paying) ? "not-allowed" : "pointer",
                              opacity: (!agreed && spotsLeft > 0 && !regClosed) ? 0.5 : 1,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                              boxShadow: (agreed && spotsLeft > 0 && !regClosed) ? "0 0 24px rgba(255,255,255,0.2)" : "none",
                              transition: "all 300ms ease"
                            }}
                          >
                            {paying
                              ? "Registering…"
                              : spotsLeft <= 0
                                ? "Camp full"
                                : regClosed
                                  ? "Registration closed"
                                  : <>Register now <ChevronRight size={16} /></>}
                          </button>
                        </Magnetic>
                      </div>
                    )}
                  </div>
                </Reveal>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* Registration Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#0d0d0d",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24, padding: 40,
                width: "100%", maxWidth: 440,
                boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <h2 className="display" style={{ fontFamily: "var(--font-serif)", fontSize: 36, color: "#fff", fontWeight: 400 }}>
                  Register
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 100,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <XIcon size={14} />
                </button>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 32 }}>
                {camp.title}
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>Child&rsquo;s full name</label>
                  <input
                    placeholder="e.g. Arjun Kumar"
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    required
                    style={{
                      height: 52, padding: "0 16px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#fff", fontSize: 15, fontFamily: "inherit",
                      outline: "none", transition: "border-color 0.2s"
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>Child&rsquo;s age</label>
                  <input
                    type="number" min="4" max="22"
                    placeholder="e.g. 12"
                    value={childAge}
                    onChange={e => setChildAge(e.target.value)}
                    required
                    style={{
                      height: 52, padding: "0 16px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#fff", fontSize: 15, fontFamily: "inherit",
                      outline: "none", transition: "border-color 0.2s"
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </div>

                <div style={{
                  padding: "16px 20px", borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <p style={{ fontSize: 15, color: "#fff", fontWeight: 700, marginBottom: 6 }}>
                    Fee: <span style={{ color: "#fff" }}>{camp.priceDisplay}</span>
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                    Secure payment via Razorpay. Slot reserved after payment.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      flex: 1, height: 52, borderRadius: 100,
                      fontSize: 13, fontWeight: 700, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                      background: "transparent",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.2)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paying}
                    style={{
                      flex: 1, height: 52, borderRadius: 100,
                      fontSize: 13, fontWeight: 800, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                      background: "#fff",
                      color: "#000", border: "none",
                      cursor: paying ? "not-allowed" : "pointer",
                      opacity: paying ? 0.7 : 1,
                      boxShadow: "0 4px 20px rgba(255,255,255,0.2)",
                    }}
                  >
                    {paying ? "Processing…" : `Pay ${camp.priceDisplay}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .camp-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
