"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, Trophy, MapPin, Calendar, Users, DollarSign, Target, Award, ChevronRight, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { useEvent, useRegisterEvent } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { EVENT_IMAGE } from "@/lib/premium-images";

type Tab = "overview" | "format" | "prizes" | "schedule";

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

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "Live";
  const isOpen = status === "Registration Open";
  const isFull = status === "Full";
  const bg = isLive ? "rgba(239,68,68,0.92)"
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

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event, isLoading, error } = useEvent(id);
  const { user } = useAuth();
  const reg = useRegisterEvent();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName]   = useState("");
  const [paying, setPaying] = useState(false);

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
              background: "#e63946", color: "#fff",
              textDecoration: "none", fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Back to events
            </Link>
          </div>
        </main>
      </>
    );
  }

  const spotsLeft = event.maxParticipants - event.participants;
  const pct       = Math.min(100, Math.round((event.participants / event.maxParticipants) * 100));
  const regClosed = new Date(event.registrationDeadline) < new Date();
  const isLive    = event.status === "Live";
  const isTeam    = event.type === "Tournament" || event.type === "League" || event.type === "Festival";
  const hasPrize  = event.prizePool && event.prizePool !== "Prizes & Trophies";
  const img       = event.imageUrl || EVENT_IMAGE.src;

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
    { Icon: MapPin,     label: "Location",    value: event.address,    sub: `${event.distance} away` },
  ];

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Live banner */}
        {isLive && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            borderBottom: "1px solid rgba(239,68,68,0.25)",
            padding: "10px 24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            position: "relative", zIndex: 20,
          }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 12px #ef4444",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5", letterSpacing: "0.04em" }}>
              LIVE NOW · {event.location}
            </span>
          </div>
        )}

        {/* Hero */}
        <section style={{ position: "relative", paddingTop: 120, paddingBottom: 48, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.38 }}>
            <Image
              src={img} alt={event.title}
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
                <Link href="/events" style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 12, color: "rgba(255,255,255,0.7)",
                  textDecoration: "none", backdropFilter: "blur(10px)",
                }}>
                  <ArrowLeft size={12} /> All events
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
                }}>{event.sport}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
                  background: "rgba(0,0,0,0.5)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                }}>{event.type}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>{event.difficulty}</span>
                <StatusBadge status={event.status} />
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <h1 className="display" style={{
                fontSize: "clamp(40px, 6vw, 88px)",
                color: "#fff", marginBottom: 24, maxWidth: 1100,
              }}>
                {event.title}
              </h1>
            </Reveal>

            <Reveal delay={0.18}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Calendar size={14} color="#e63946" /> {event.date}
                </div>
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <MapPin size={14} color="#e63946" /> {event.location}
                </div>
                {hasPrize && (
                  <>
                    <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#eab308", fontWeight: 700 }}>
                      <Trophy size={14} /> {event.prizePool}
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Body */}
        <section style={{ paddingBottom: 120 }}>
          <div className="container-lg">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 32 }} className="event-grid">
              {/* Left */}
              <div>
                {/* Registration status */}
                <Reveal>
                  <div style={{
                    background: "rgba(13,13,13,0.7)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(230,57,70,0.18)",
                    borderRadius: 20, padding: "22px 24px", marginBottom: 24,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <h3 className="eyebrow" style={{ marginBottom: 4 }}>Registration status</h3>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                          <strong style={{ color: "#fff", fontWeight: 700 }}>{event.participants}</strong> registered · {spotsLeft} spots left
                        </p>
                      </div>
                      <div style={{
                        padding: "6px 14px", borderRadius: 100,
                        background: pct >= 80 ? "rgba(230,57,70,0.18)" : "rgba(255,255,255,0.04)",
                        color: pct >= 80 ? "#ff6b74" : "rgba(255,255,255,0.7)",
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
                    <TabButton id="format"   active={tab} onClick={setTab} label="Format"   count={event.format.length} />
                    <TabButton id="prizes"   active={tab} onClick={setTab} label="Prizes"   count={event.prizes.length} />
                    <TabButton id="schedule" active={tab} onClick={setTab} label="Schedule" count={event.schedule.length} />
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
                          <Award size={14} color="#e63946" /> About this event
                        </h3>
                        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.75 }}>
                          {event.description}
                        </p>
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
                          <Target size={14} color="#e63946" /> Requirements
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {event.requirements.map((r, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#e63946", flexShrink: 0, marginTop: 7,
                              }} />
                              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  </div>
                )}

                {/* Format */}
                {tab === "format" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {event.format.map((item, i) => (
                      <Reveal key={i}>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(230,57,70,0.18)",
                          borderRadius: 18, padding: "18px 20px",
                          display: "flex", alignItems: "flex-start", gap: 14,
                        }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: "rgba(230,57,70,0.15)",
                            border: "1px solid rgba(230,57,70,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <span style={{ fontWeight: 800, color: "#ff6b74", fontSize: 13 }}>{i + 1}</span>
                          </div>
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", paddingTop: 6 }}>{item}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}

                {/* Prizes */}
                {tab === "prizes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {event.prizes.map((prize, i) => (
                      <Reveal key={i}>
                        <div
                          className="prize-card"
                          style={{
                            background: "rgba(13,13,13,0.7)",
                            backdropFilter: "blur(18px)",
                            border: "1px solid rgba(234,179,8,0.2)",
                            borderRadius: 20, padding: "20px 22px",
                            display: "flex", alignItems: "center", gap: 16,
                            transition: "border-color 220ms, box-shadow 220ms",
                          }}
                        >
                          <div style={{
                            width: 52, height: 52, borderRadius: "50%",
                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
                          }}>
                            <Trophy size={22} color="#000" />
                          </div>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{prize}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}

                {/* Schedule */}
                {tab === "schedule" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {event.schedule.map((item, i) => (
                      <Reveal key={i}>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 18, padding: "18px 22px",
                          display: "flex", alignItems: "flex-start", gap: 16,
                        }}>
                          <div style={{
                            padding: "6px 14px", borderRadius: 100,
                            background: "rgba(230,57,70,0.12)",
                            border: "1px solid rgba(230,57,70,0.25)",
                            flexShrink: 0,
                          }}>
                            <p style={{ fontWeight: 800, color: "#ff6b74", fontSize: 12, letterSpacing: "0.04em" }}>
                              {item.day}
                            </p>
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                              <Calendar size={13} color="#e63946" />
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.time}</span>
                            </div>
                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{item.event}</p>
                          </div>
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
                  <h3 className="eyebrow" style={{ marginBottom: 20 }}>Event information</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {sideInfo.map(({ Icon, label, value, sub, emphasis }, i) => (
                      <div key={label} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        paddingBottom: i < sideInfo.length - 1 ? 16 : 0,
                        borderBottom: i < sideInfo.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: emphasis === "gold" ? "rgba(234,179,8,0.1)" : "rgba(230,57,70,0.1)",
                          border: emphasis === "gold" ? "1px solid rgba(234,179,8,0.22)" : "1px solid rgba(230,57,70,0.18)",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={13} color={emphasis === "gold" ? "#fbbf24" : "#ff6b74"} />
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
                              fontSize: 24, fontWeight: 800,
                              color: emphasis === "gold" ? "#fbbf24" : "#ff6b74",
                              letterSpacing: "-0.03em",
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

                  {!regClosed && spotsLeft > 0 && (
                    <div style={{
                      margin: "18px 0",
                      padding: "10px 14px", borderRadius: 14,
                      background: "rgba(234,179,8,0.08)",
                      border: "1px solid rgba(234,179,8,0.2)",
                    }}>
                      <p style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700 }}>
                        Deadline: {new Date(event.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                    {isLive ? (
                      <div style={{
                        padding: "16px", borderRadius: 16,
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        textAlign: "center",
                      }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>
                          Event is live now
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                          Come watch at {event.location}
                        </p>
                      </div>
                    ) : (
                      <Magnetic strength={6}>
                        <button
                          onClick={handleRegister}
                          disabled={regClosed || spotsLeft <= 0 || reg.isPending || paying}
                          style={{
                            width: "100%", height: 52, borderRadius: 100,
                            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                            background: (regClosed || spotsLeft <= 0)
                              ? "rgba(255,255,255,0.04)"
                              : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                            color: (regClosed || spotsLeft <= 0) ? "rgba(255,255,255,0.45)" : "#fff",
                            border: (regClosed || spotsLeft <= 0) ? "1px solid rgba(255,255,255,0.08)" : "none",
                            cursor: (regClosed || spotsLeft <= 0 || reg.isPending || paying) ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                            boxShadow: (!regClosed && spotsLeft > 0) ? "0 0 28px rgba(230,57,70,0.35)" : "none",
                          }}
                        >
                          {(reg.isPending || paying)
                            ? "Processing…"
                            : regClosed
                              ? "Registration closed"
                              : spotsLeft <= 0
                                ? "Event full"
                                : <>{isTeam ? "Register your team" : (event.entryFeeAmount > 0 ? `Pay ${event.entryFee}` : "Register")} <ChevronRight size={16} /></>}
                        </button>
                      </Magnetic>
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
                      <Share2 size={13} /> Share event
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* Modal */}
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
                  Register for event
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
                {event.title}
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <label className="eyebrow" style={{ margin: 0 }}>Team name (optional)</label>
                  <input
                    placeholder="e.g. Thunder Hawks"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
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
                {event.entryFeeAmount > 0 && (
                  <div style={{
                    padding: "14px 16px", borderRadius: 14,
                    background: "rgba(230,57,70,0.06)",
                    border: "1px solid rgba(230,57,70,0.2)",
                  }}>
                    <p style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
                      Entry fee: <span style={{ color: "#ff6b74" }}>{event.entryFee}</span>
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                      Secure payment via Razorpay. Team slot reserved after payment.
                    </p>
                  </div>
                )}

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
                    disabled={reg.isPending || paying}
                    style={{
                      flex: 1, height: 48, borderRadius: 100,
                      fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                      background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                      color: "#fff", border: "none",
                      cursor: (reg.isPending || paying) ? "not-allowed" : "pointer",
                      opacity: (reg.isPending || paying) ? 0.7 : 1,
                      boxShadow: "0 2px 18px rgba(230,57,70,0.3)",
                    }}
                  >
                    {(reg.isPending || paying)
                      ? "Processing…"
                      : event.entryFeeAmount > 0
                        ? `Pay ${event.entryFee}`
                        : "Confirm registration"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .event-grid { grid-template-columns: 1fr !important; }
        }
        .prize-card:hover {
          border-color: rgba(234,179,8,0.4) !important;
          box-shadow: 0 20px 48px rgba(234,179,8,0.1);
        }
      `}</style>
    </>
  );
}
