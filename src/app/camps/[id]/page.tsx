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
import { useCamp, useCancelCamp } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { CAMP_IMAGE } from "@/lib/premium-images";

type Tab = "overview" | "schedule" | "coaches" | "reviews";

function TabButton({ id, active, onClick, label, count }: { id: Tab; active: Tab; onClick: (t: Tab) => void; label: string; count?: number }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: "10px 18px", borderRadius: 100,
        fontSize: 13, fontWeight: 600,
        border: "1px solid",
        background: isActive ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.02)",
        color: isActive ? "#ff6b74" : "rgba(255,255,255,0.55)",
        borderColor: isActive ? "rgba(230,57,70,0.35)" : "rgba(255,255,255,0.06)",
        cursor: "pointer", fontFamily: "inherit",
        transition: "all 180ms",
      }}
    >
      {label}{count !== undefined && <span style={{ opacity: 0.5 }}> ({count})</span>}
    </button>
  );
}

export default function CampDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: camp, isLoading, error } = useCamp(id);
  const { user } = useAuth();
  const cancel = useCancelCamp();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
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
            <div className="skeleton" style={{ height: 420, borderRadius: 28, marginBottom: 32 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }} className="camp-grid">
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
            <h1 className="display" style={{ fontSize: 42, color: "#fff", marginBottom: 12 }}>
              Camp not found.
            </h1>
            <Link href="/camps" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 100,
              background: "#e63946", color: "#fff",
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
  const canCancel    = new Date(camp.startDate).getTime() - Date.now() >= 90 * 60000;

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

  const sideInfo = [
    { Icon: DollarSign, label: "Total price", value: camp.priceDisplay, sub: "All-inclusive", emphasis: true },
    { Icon: Calendar,   label: "Duration",    value: camp.duration,     sub: camp.dates,     emphasis: false },
    { Icon: Users,      label: "Age group",   value: camp.ageGroup,     sub: null,           emphasis: false },
    { Icon: Target,     label: "Level",       value: camp.skillLevel,   sub: null,           emphasis: false },
    { Icon: MapPin,     label: "Location",    value: camp.address,      sub: `${camp.distance} away`, emphasis: false },
  ];

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Hero */}
        <section style={{ position: "relative", paddingTop: 120, paddingBottom: 48, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
            <Image
              src={img} alt={camp.title}
              fill priority quality={80} sizes="100vw"
              style={{ objectFit: "cover", filter: "saturate(0.55) brightness(0.55)" }}
            />
          </div>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.3) 20%, #050505 100%)",
          }} />

          <div className="container-lg" style={{ position: "relative" }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
                <Link href="/camps" style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 12, color: "rgba(255,255,255,0.7)",
                  textDecoration: "none", backdropFilter: "blur(10px)",
                }}>
                  <ArrowLeft size={12} /> All camps
                </Link>
                <button
                  onClick={handleShare}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "7px 14px", borderRadius: 100,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12, color: "rgba(255,255,255,0.7)",
                    cursor: "pointer", fontFamily: "inherit",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Share2 size={12} /> Share
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
                  background: "rgba(230,57,70,0.95)", color: "#fff",
                }}>{camp.sport}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
                  background: "rgba(0,0,0,0.5)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                }}>{camp.duration}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>{camp.skillLevel}</span>
                {spotsLeft <= 10 && spotsLeft > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "4px 11px", borderRadius: 100,
                    background: "#e63946", color: "#fff",
                    boxShadow: "0 4px 16px rgba(230,57,70,0.4)",
                  }}>
                    Only {spotsLeft} spots left
                  </span>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <h1 className="display" style={{
                fontSize: "clamp(40px, 6vw, 88px)",
                color: "#fff", marginBottom: 24, maxWidth: 1100,
              }}>
                {camp.title}
              </h1>
            </Reveal>

            <Reveal delay={0.18}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Star size={14} color="#e63946" fill="#e63946" />
                  <span style={{ color: "#fff", fontWeight: 700 }}>{camp.rating}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>({camp.reviews} reviews)</span>
                </div>
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Calendar size={14} color="#e63946" /> {camp.dates}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <MapPin size={14} color="#e63946" /> {camp.location}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Users size={14} color="#e63946" /> {camp.ageGroup}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Body */}
        <section style={{ paddingBottom: 120 }}>
          <div className="container-lg">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 32 }} className="camp-grid">
              {/* Left */}
              <div>
                {/* Enrollment status */}
                <Reveal>
                  <div style={{
                    background: "rgba(13,13,13,0.7)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(230,57,70,0.18)",
                    borderRadius: 20, padding: "22px 24px", marginBottom: 24,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <h3 className="eyebrow" style={{ marginBottom: 4 }}>Enrollment status</h3>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                          <strong style={{ color: "#fff", fontWeight: 700 }}>{camp.participants}</strong> enrolled · {spotsLeft} spots left
                        </p>
                      </div>
                      <div style={{
                        padding: "6px 14px", borderRadius: 100,
                        background: spotsLeft <= 5 ? "rgba(230,57,70,0.18)" : "rgba(255,255,255,0.04)",
                        color: spotsLeft <= 5 ? "#ff6b74" : "rgba(255,255,255,0.7)",
                        fontWeight: 800, fontSize: 13,
                      }}>
                        {pct}% full
                      </div>
                    </div>
                    <div style={{
                      height: 6, background: "rgba(255,255,255,0.05)",
                      borderRadius: 100, overflow: "hidden",
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          height: "100%",
                          background: "linear-gradient(90deg, #e63946 0%, #f87171 100%)",
                        }}
                      />
                    </div>
                  </div>
                </Reveal>

                {/* Tabs */}
                <Reveal>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                    <TabButton id="overview" active={tab} onClick={setTab} label="Overview" />
                    <TabButton id="schedule" active={tab} onClick={setTab} label="Schedule" count={camp.dailySchedule.length} />
                    <TabButton id="coaches"  active={tab} onClick={setTab} label="Coaches"  count={camp.coaches.length} />
                    <TabButton id="reviews"  active={tab} onClick={setTab} label="Reviews"  count={camp.testimonials.length} />
                  </div>
                </Reveal>

                {/* Overview */}
                {tab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Reveal>
                      <div style={{
                        background: "rgba(13,13,13,0.7)",
                        backdropFilter: "blur(18px)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 20, padding: "24px 28px",
                      }}>
                        <h3 className="eyebrow" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                          <Award size={14} color="#e63946" /> About this camp
                        </h3>
                        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.75 }}>
                          {camp.description}
                        </p>
                      </div>
                    </Reveal>

                    {camp.highlights.length > 0 && (
                      <Reveal>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 20, padding: "24px 28px",
                        }}>
                          <h3 className="eyebrow" style={{ marginBottom: 16 }}>Highlights</h3>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                            {camp.highlights.map((h, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <span style={{
                                  width: 6, height: 6, borderRadius: "50%",
                                  background: "#e63946", flexShrink: 0, marginTop: 7,
                                }} />
                                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Reveal>
                    )}

                    <Reveal>
                      <div style={{
                        background: "rgba(13,13,13,0.7)",
                        backdropFilter: "blur(18px)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 20, padding: "24px 28px",
                      }}>
                        <h3 className="eyebrow" style={{ marginBottom: 16 }}>What&rsquo;s included</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {camp.included.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: 100,
                                background: "rgba(74,222,128,0.12)",
                                border: "1px solid rgba(74,222,128,0.25)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, marginTop: 1,
                              }}>
                                <Check size={11} color="#4ade80" />
                              </div>
                              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>

                    <Reveal>
                      <div style={{
                        background: "rgba(13,13,13,0.7)",
                        backdropFilter: "blur(18px)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 20, padding: "24px 28px",
                      }}>
                        <h3 className="eyebrow" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                          <Target size={14} color="#e63946" /> What to bring
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {camp.whatToBring.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#e63946", flexShrink: 0, marginTop: 7,
                              }} />
                              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  </div>
                )}

                {/* Schedule */}
                {tab === "schedule" && (
                  <Reveal>
                    <div style={{
                      background: "rgba(13,13,13,0.7)",
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 20, padding: "24px 28px",
                    }}>
                      <h3 className="eyebrow" style={{ marginBottom: 6 }}>Daily schedule</h3>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>
                        Repeats for all {camp.duration.toLowerCase()} of the camp.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {camp.dailySchedule.map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex", alignItems: "center", gap: 16,
                              padding: "14px 18px", borderRadius: 14,
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 150, flexShrink: 0 }}>
                              <Clock size={13} color="#e63946" />
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#ff6b74" }}>{item.time}</span>
                            </div>
                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{item.activity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}

                {/* Coaches */}
                {tab === "coaches" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {camp.coaches.map((coach, i) => (
                      <Reveal key={i}>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(230,57,70,0.18)",
                          borderRadius: 20, padding: "22px 24px",
                          display: "flex", alignItems: "flex-start", gap: 16,
                        }}>
                          <div style={{
                            width: 58, height: 58, borderRadius: "50%",
                            background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, fontWeight: 800, color: "#fff",
                            flexShrink: 0,
                            boxShadow: "0 4px 20px rgba(230,57,70,0.35)",
                          }}>
                            {coach.name.split(" ").pop()?.[0] ?? "C"}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>
                              {coach.name}
                            </h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.65)",
                              }}>{coach.experience}</span>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                                background: "rgba(230,57,70,0.12)", color: "#ff6b74",
                              }}>{coach.specialty}</span>
                            </div>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}

                {/* Reviews */}
                {tab === "reviews" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {camp.testimonials.length === 0 && (
                      <div style={{
                        padding: "60px 24px", textAlign: "center",
                        background: "rgba(13,13,13,0.7)",
                        borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.5)",
                      }}>
                        No testimonials yet.
                      </div>
                    )}
                    {camp.testimonials.map((t, i) => (
                      <Reveal key={i}>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 20, padding: "22px 24px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 42, height: 42, borderRadius: "50%",
                                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 700, fontSize: 16, color: "#fff",
                              }}>
                                {t.name[0]}
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{t.name}</p>
                                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                                  {t.age} years old
                                </p>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 2 }}>
                              {Array.from({ length: t.rating }).map((_, j) => (
                                <Star key={j} size={13} color="#e63946" fill="#e63946" />
                              ))}
                            </div>
                          </div>
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontStyle: "italic" }}>
                            &ldquo;{t.text}&rdquo;
                          </p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside>
                <div style={{
                  position: "sticky", top: 100,
                  background: "rgba(13,13,13,0.75)",
                  backdropFilter: "blur(18px)",
                  border: "1px solid rgba(230,57,70,0.2)",
                  borderRadius: 24, padding: "24px 22px",
                }}>
                  <h3 className="eyebrow" style={{ marginBottom: 20 }}>Camp information</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {sideInfo.map(({ Icon, label, value, sub, emphasis }, i) => (
                      <div key={label} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        paddingBottom: i < sideInfo.length - 1 ? 16 : 0,
                        borderBottom: i < sideInfo.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "rgba(230,57,70,0.1)",
                          border: "1px solid rgba(230,57,70,0.18)",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={13} color="#ff6b74" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: 10, color: "rgba(255,255,255,0.4)",
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            marginBottom: 3,
                          }}>
                            {label}
                          </p>
                          {emphasis ? (
                            <p style={{
                              fontSize: 28, fontWeight: 800,
                              color: "#ff6b74", letterSpacing: "-0.03em",
                            }}>
                              {value}
                            </p>
                          ) : (
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{value}</p>
                          )}
                          {sub && (
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                              {sub}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {daysLeft > 0 && !regClosed && daysLeft <= 7 && (
                    <div style={{
                      margin: "18px 0",
                      padding: "10px 14px", borderRadius: 14,
                      background: "rgba(234,179,8,0.08)",
                      border: "1px solid rgba(234,179,8,0.2)",
                    }}>
                      <p style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700 }}>
                        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to register
                      </p>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                    {isRegistered && regPaid ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{
                          padding: "16px", borderRadius: 16,
                          background: "rgba(74,222,128,0.08)",
                          border: "1px solid rgba(74,222,128,0.25)",
                          textAlign: "center",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
                            <CheckCircle size={18} color="#4ade80" />
                            <p style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>
                              Registered
                            </p>
                          </div>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                            {camp.userRegistration?.childName} is enrolled for this camp
                          </p>
                        </div>
                        {canCancel ? (
                          <button
                            disabled={cancel.isPending}
                            onClick={() => { if (confirm("Cancel your registration for this camp?")) cancel.mutate(id); }}
                            style={{
                              width: "100%", height: 44, borderRadius: 100,
                              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                              background: "transparent",
                              color: "#f87171",
                              border: "1px solid rgba(239,68,68,0.3)",
                              cursor: cancel.isPending ? "not-allowed" : "pointer",
                              opacity: cancel.isPending ? 0.7 : 1,
                            }}
                          >
                            {cancel.isPending ? "Cancelling…" : "Cancel registration"}
                          </button>
                        ) : (
                          <div style={{
                            padding: "10px 14px", borderRadius: 14,
                            background: "rgba(234,179,8,0.08)",
                            border: "1px solid rgba(234,179,8,0.2)",
                            textAlign: "center",
                          }}>
                            <p style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                              Cancellation is not allowed within 90 minutes of the start time
                            </p>
                          </div>
                        )}
                      </div>
                    ) : isRegistered && !regPaid ? (
                      <div style={{
                        padding: "16px", borderRadius: 16,
                        background: "rgba(234,179,8,0.08)",
                        border: "1px solid rgba(234,179,8,0.25)",
                        textAlign: "center",
                      }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>
                          Payment pending
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                          Complete payment to confirm registration
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {spotsLeft > 0 && !regClosed && (
                          <label style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            padding: "12px 14px", borderRadius: 14,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            cursor: "pointer",
                          }}>
                            <input
                              type="checkbox"
                              checked={agreed}
                              onChange={e => setAgreed(e.target.checked)}
                              style={{ marginTop: 2, accentColor: "#e63946", width: 16, height: 16, flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                              I agree that cancellations are only allowed up to 90 minutes before the start time
                            </span>
                          </label>
                        )}
                        <Magnetic strength={6}>
                          <button
                            onClick={handleRegister}
                            disabled={(!agreed && spotsLeft > 0 && !regClosed) || spotsLeft <= 0 || regClosed || paying}
                            style={{
                              width: "100%", height: 52, borderRadius: 100,
                              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                              background: (spotsLeft <= 0 || regClosed || !agreed)
                                ? "rgba(255,255,255,0.04)"
                                : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                              color: (spotsLeft <= 0 || regClosed || !agreed) ? "rgba(255,255,255,0.45)" : "#fff",
                              border: (spotsLeft <= 0 || regClosed || !agreed) ? "1px solid rgba(255,255,255,0.08)" : "none",
                              cursor: (!agreed || spotsLeft <= 0 || regClosed || paying) ? "not-allowed" : "pointer",
                              opacity: (!agreed && spotsLeft > 0 && !regClosed) ? 0.5 : 1,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                              boxShadow: (agreed && spotsLeft > 0 && !regClosed) ? "0 0 28px rgba(230,57,70,0.35)" : "none",
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
                    <button
                      onClick={handleShare}
                      style={{
                        width: "100%", height: 44, borderRadius: 100,
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      }}
                    >
                      <Share2 size={13} /> Share camp
                    </button>
                  </div>

                  <div style={{
                    textAlign: "center",
                    marginTop: 20, paddingTop: 18,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                      Questions? Contact organizer
                    </p>
                    <a
                      href={`tel:${camp.organizerContact}`}
                      style={{
                        fontSize: 14, color: "#ff6b74", fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <Phone size={12} /> {camp.organizerContact}
                    </a>
                  </div>
                </div>
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
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
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
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 24, padding: 32,
                width: "100%", maxWidth: 440,
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                <h2 className="display" style={{ fontSize: 26, color: "#fff", letterSpacing: "-0.02em" }}>
                  Register for camp
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: 30, height: 30, borderRadius: 100,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <XIcon size={14} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
                {camp.title}
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <label className="eyebrow" style={{ margin: 0 }}>Child&rsquo;s full name</label>
                  <input
                    placeholder="e.g. Arjun Kumar"
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    required
                    style={{
                      height: 44, padding: "0 14px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#fff", fontSize: 14, fontFamily: "inherit",
                      outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(230,57,70,0.35)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <label className="eyebrow" style={{ margin: 0 }}>Child&rsquo;s age</label>
                  <input
                    type="number" min="4" max="22"
                    placeholder="e.g. 12"
                    value={childAge}
                    onChange={e => setChildAge(e.target.value)}
                    required
                    style={{
                      height: 44, padding: "0 14px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#fff", fontSize: 14, fontFamily: "inherit",
                      outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(230,57,70,0.35)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                </div>

                <div style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: "rgba(230,57,70,0.06)",
                  border: "1px solid rgba(230,57,70,0.2)",
                }}>
                  <p style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
                    Fee: <span style={{ color: "#ff6b74" }}>{camp.priceDisplay}</span>
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                    Secure payment via Razorpay. Slot reserved after payment.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      flex: 1, height: 48, borderRadius: 100,
                      fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paying}
                    style={{
                      flex: 1, height: 48, borderRadius: 100,
                      fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                      background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                      color: "#fff", border: "none",
                      cursor: paying ? "not-allowed" : "pointer",
                      opacity: paying ? 0.7 : 1,
                      boxShadow: "0 2px 18px rgba(230,57,70,0.3)",
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
