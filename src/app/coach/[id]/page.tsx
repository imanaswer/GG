"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, Mail, Phone, MapPin, Clock, Target, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { Stars, SkillBadge, SportBadge } from "@/components/Shared";
import { useCoach, useCreateBooking } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { COACH_FALLBACKS, pickFallback } from "@/lib/premium-images";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        padding: "10px 18px", borderRadius: 100,
        fontSize: 13, fontWeight: 600,
        border: "1px solid",
        background: active ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.02)",
        color: active ? "#ff6b74" : "rgba(255,255,255,0.55)",
        borderColor: active ? "rgba(230,57,70,0.35)" : "rgba(255,255,255,0.06)",
        cursor: "pointer", fontFamily: "inherit",
        transition: "all 180ms",
      }}
    >
      {children}
    </button>
  );
}

export default function CoachDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: coach, isLoading, error } = useCoach(id);
  const { user } = useAuth();
  const book = useCreateBooking();
  const [tab, setTab] = useState<"overview" | "batches" | "reviews">("overview");
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [review, setReview] = useState({ rating: 5, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReview = async () => {
    if (!user) { toast.error("Please sign in to leave a review"); return; }
    if (review.text.trim().length < 10) { toast.error("Review must be at least 10 characters"); return; }
    setSubmittingReview(true);
    const r = await fetch(`/api/coaches/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
    setSubmittingReview(false);
    if (r.ok) { toast.success("Review submitted. Thank you."); setReview({ rating: 5, text: "" }); }
    else { const d = await r.json(); toast.error(d.error ?? "Failed to submit review"); }
  };

  const handleBook = (batchId?: string) => {
    if (!user) { toast.error("Please sign in to book a session"); return; }
    book.mutate({ coachId: id, batchId: batchId ?? selectedBatch ?? undefined });
  };

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 420, borderRadius: 28, marginBottom: 40 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }} className="coach-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[200, 160, 140].map(h => (
                  <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[160, 120, 80].map(h => (
                  <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !coach) {
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
              Coach not found.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>
              The coach you&rsquo;re looking for may have moved or retired from the platform.
            </p>
            <Link href="/learn" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 100,
              background: "#e63946", color: "#fff",
              textDecoration: "none", fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Back to coaches
            </Link>
          </div>
        </main>
      </>
    );
  }

  const occupancy = Math.round(((coach.totalSeats - coach.seatsLeft) / coach.totalSeats) * 100);
  const features  = Array.isArray(coach.features) ? coach.features : [];
  const img       = coach.imageUrl || pickFallback(COACH_FALLBACKS, coach.id).src;

  const quickInfo = [
    { Icon: MapPin,   l: "Location", v: coach.location },
    { Icon: DollarSign, l: "Price",  v: coach.price    },
    { Icon: Clock,    l: "Schedule", v: coach.timing   },
    { Icon: Target,   l: "Level",    v: coach.skillLevel },
  ];

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Hero */}
        <section style={{
          position: "relative", paddingTop: 120, paddingBottom: 64, overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
            <Image
              src={img} alt={coach.name}
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
              <Link href="/learn" style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 14px", borderRadius: 100,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12, color: "rgba(255,255,255,0.7)",
                textDecoration: "none", marginBottom: 32,
                backdropFilter: "blur(10px)",
              }}>
                <ArrowLeft size={12} /> All coaches
              </Link>
            </Reveal>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 40, alignItems: "end" }} className="coach-hero-grid">
              <div>
                <Reveal delay={0.04}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                    <SportBadge sport={coach.sport} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                      background: "rgba(0,0,0,0.5)", color: "#e5e7eb",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backdropFilter: "blur(8px)",
                    }}>{coach.type}</span>
                    <SkillBadge level={coach.skillLevel} />
                  </div>
                </Reveal>

                <Reveal delay={0.08}>
                  <h1 className="display" style={{
                    fontSize: "clamp(40px, 6vw, 88px)",
                    color: "#fff", marginBottom: 20,
                  }}>
                    {coach.name}
                  </h1>
                </Reveal>

                <Reveal delay={0.14}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Stars value={coach.rating} size={15} />
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{coach.rating.toFixed(1)}</span>
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>({coach.reviewCount} reviews)</span>
                    </div>
                    <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
                    <span style={{ color: "#ff6b74", fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em" }}>
                      {coach.price}
                    </span>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.22}>
                <div className="coach-hero-portrait" style={{
                  position: "relative", aspectRatio: "4/5",
                  borderRadius: 24, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                }}>
                  <Image
                    src={img} alt={coach.name}
                    fill sizes="(max-width: 900px) 100vw, 320px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Body */}
        <section style={{ paddingBottom: 120 }}>
          <div className="container-lg">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 32 }} className="coach-grid">
              {/* Left column */}
              <div>
                {/* Tab nav */}
                <Reveal>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                    <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                      Overview
                    </TabButton>
                    <TabButton active={tab === "batches"} onClick={() => setTab("batches")}>
                      Batches <span style={{ opacity: 0.5 }}>({coach.batches?.length ?? 0})</span>
                    </TabButton>
                    <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
                      Reviews <span style={{ opacity: 0.5 }}>({coach.reviewCount})</span>
                    </TabButton>
                  </div>
                </Reveal>

                {tab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Reveal>
                      <div style={{
                        background: "rgba(13,13,13,0.7)",
                        backdropFilter: "blur(18px)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 20, padding: "24px 28px",
                      }}>
                        <h2 className="eyebrow" style={{ marginBottom: 14 }}>About</h2>
                        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                          {coach.description}
                        </p>
                      </div>
                    </Reveal>

                    {features.length > 0 && (
                      <Reveal>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 20, padding: "24px 28px",
                        }}>
                          <h2 className="eyebrow" style={{ marginBottom: 18 }}>Facilities &amp; features</h2>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                            gap: 12,
                          }}>
                            {features.map((f, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <CheckCircle size={15} color="#e63946" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>{f}</span>
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
                        <h2 className="eyebrow" style={{ marginBottom: 18 }}>Contact</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {[
                            { Icon: MapPin, v: coach.address },
                            { Icon: Phone,  v: coach.phone },
                            { Icon: Mail,   v: coach.email },
                          ].filter(row => row.v).map(({ Icon, v }) => (
                            <div key={v} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                              <Icon size={14} color="#e63946" style={{ flexShrink: 0 }} />
                              <span>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  </div>
                )}

                {tab === "batches" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {!coach.batches?.length ? (
                      <div style={{
                        padding: "60px 24px", textAlign: "center",
                        background: "rgba(13,13,13,0.7)",
                        borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.5)",
                      }}>
                        No batches published yet. Use the booking panel to request a session.
                      </div>
                    ) : (
                      coach.batches.map(batch => {
                        const isSelected = selectedBatch === batch.id;
                        const isFull = batch.seats === 0;
                        return (
                          <div
                            key={batch.id}
                            onClick={() => !isFull && setSelectedBatch(isSelected ? null : batch.id)}
                            style={{
                              background: "rgba(13,13,13,0.7)",
                              backdropFilter: "blur(18px)",
                              borderRadius: 20, padding: "18px 22px",
                              border: `1px solid ${isSelected ? "rgba(230,57,70,0.5)" : "rgba(255,255,255,0.06)"}`,
                              cursor: isFull ? "default" : "pointer",
                              opacity: isFull ? 0.55 : 1,
                              boxShadow: isSelected ? "0 0 0 1px rgba(230,57,70,0.3), 0 24px 60px rgba(230,57,70,0.15)" : "none",
                              transition: "all 220ms",
                              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 240px" }}>
                              <SkillBadge level={batch.level} />
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>
                                <Calendar size={13} color="#e63946" /> {batch.day}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>
                                <Clock size={13} color="#e63946" /> {batch.time}
                              </div>
                            </div>

                            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: isFull ? "#f87171" : batch.seats <= 3 ? "#fbbf24" : "#4ade80",
                              }}>
                                {isFull ? "Full" : `${batch.seats} seat${batch.seats === 1 ? "" : "s"} left`}
                              </span>
                              {isSelected && (
                                <span style={{
                                  fontSize: 11, fontWeight: 700,
                                  padding: "3px 10px", borderRadius: 100,
                                  background: "rgba(230,57,70,0.15)", color: "#ff6b74",
                                }}>
                                  Selected
                                </span>
                              )}
                              {!isFull && (
                                <button
                                  onClick={ev => { ev.stopPropagation(); setSelectedBatch(batch.id); handleBook(batch.id); }}
                                  disabled={book.isPending}
                                  style={{
                                    padding: "8px 18px", borderRadius: 100,
                                    fontSize: 12, fontWeight: 700,
                                    background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                                    color: "#fff", border: "none",
                                    cursor: book.isPending ? "not-allowed" : "pointer",
                                    opacity: book.isPending ? 0.6 : 1,
                                    fontFamily: "inherit",
                                    boxShadow: "0 2px 14px rgba(230,57,70,0.3)",
                                  }}
                                >
                                  {book.isPending ? "…" : "Book"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {tab === "reviews" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {user && (
                      <Reveal>
                        <div style={{
                          background: "rgba(13,13,13,0.7)",
                          backdropFilter: "blur(18px)",
                          border: "1px solid rgba(230,57,70,0.18)",
                          borderRadius: 20, padding: "24px 28px",
                        }}>
                          <h3 className="eyebrow" style={{ marginBottom: 16 }}>Write a review</h3>
                          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setReview(p => ({ ...p, rating: n }))}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                              >
                                <svg
                                  width="24" height="24" viewBox="0 0 24 24"
                                  fill={n <= review.rating ? "#eab308" : "none"}
                                  stroke={n <= review.rating ? "#eab308" : "rgba(255,255,255,0.3)"}
                                  strokeWidth={2}
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={review.text}
                            onChange={e => setReview(p => ({ ...p, text: e.target.value }))}
                            placeholder="Share your experience with this coach (min 10 characters)…"
                            maxLength={500}
                            style={{
                              width: "100%", minHeight: 96,
                              padding: "12px 14px", borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.02)",
                              color: "#fff", fontSize: 14,
                              fontFamily: "inherit", outline: "none", resize: "none",
                              boxSizing: "border-box",
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(230,57,70,0.35)"; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                          />
                          <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            marginTop: 14, flexWrap: "wrap", gap: 10,
                          }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                              {review.text.length}/500 · Must have a confirmed booking to review
                            </span>
                            <button
                              onClick={handleReview}
                              disabled={submittingReview}
                              style={{
                                padding: "9px 20px", borderRadius: 100,
                                fontSize: 13, fontWeight: 700,
                                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                                color: "#fff", border: "none",
                                cursor: submittingReview ? "not-allowed" : "pointer",
                                opacity: submittingReview ? 0.7 : 1,
                                fontFamily: "inherit",
                                boxShadow: "0 2px 14px rgba(230,57,70,0.3)",
                              }}
                            >
                              {submittingReview ? "Submitting…" : "Submit review"}
                            </button>
                          </div>
                        </div>
                      </Reveal>
                    )}

                    {!coach.reviews?.length ? (
                      <div style={{
                        padding: "60px 24px", textAlign: "center",
                        background: "rgba(13,13,13,0.7)",
                        borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.5)",
                      }}>
                        No reviews yet. Be the first to share your experience.
                      </div>
                    ) : (
                      coach.reviews.map(r => (
                        <div
                          key={r.id}
                          style={{
                            background: "rgba(13,13,13,0.7)",
                            backdropFilter: "blur(18px)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 20, padding: "20px 24px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{r.reviewerName}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Stars value={r.rating} size={13} />
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>
                            {r.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Quick info */}
                <Reveal>
                  <div style={{
                    background: "rgba(13,13,13,0.7)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 20, padding: "20px 22px",
                  }}>
                    <h2 className="eyebrow" style={{ marginBottom: 16 }}>Quick info</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {quickInfo.map(({ Icon, l, v }) => (
                        <div key={l} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 10,
                            background: "rgba(230,57,70,0.1)",
                            border: "1px solid rgba(230,57,70,0.18)",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Icon size={13} color="#ff6b74" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                              {l}
                            </p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{v}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>

                {/* Availability */}
                <Reveal>
                  <div style={{
                    background: "rgba(13,13,13,0.7)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 20, padding: "20px 22px",
                  }}>
                    <h2 className="eyebrow" style={{ marginBottom: 14 }}>Availability</h2>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>Seats filled</span>
                      <span style={{ color: "#fff", fontWeight: 700 }}>
                        {coach.totalSeats - coach.seatsLeft}/{coach.totalSeats}
                      </span>
                    </div>
                    <div style={{
                      height: 6, background: "rgba(255,255,255,0.05)",
                      borderRadius: 100, overflow: "hidden", marginBottom: 10,
                    }}>
                      <div style={{
                        height: "100%", width: `${occupancy}%`,
                        background: coach.seatsLeft === 0 ? "#ef4444" : occupancy > 70 ? "#eab308" : "#e63946",
                        transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
                      }} />
                    </div>
                    <p style={{
                      fontSize: 12, fontWeight: 700,
                      color: coach.seatsLeft === 0 ? "#f87171" : coach.seatsLeft <= 3 ? "#fbbf24" : "#4ade80",
                    }}>
                      {coach.seatsLeft === 0 ? "All seats taken" : `${coach.seatsLeft} seats remaining`}
                    </p>
                  </div>
                </Reveal>

                {/* CTAs */}
                <Reveal>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Magnetic strength={6}>
                      <button
                        onClick={() => handleBook()}
                        disabled={book.isPending || coach.seatsLeft === 0}
                        style={{
                          width: "100%", height: 52, borderRadius: 100,
                          fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                          border: coach.seatsLeft === 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                          background: coach.seatsLeft === 0
                            ? "transparent"
                            : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                          color: coach.seatsLeft === 0 ? "rgba(255,255,255,0.55)" : "#fff",
                          cursor: (book.isPending || coach.seatsLeft === 0) ? "not-allowed" : "pointer",
                          opacity: book.isPending ? 0.7 : 1,
                          boxShadow: coach.seatsLeft === 0 ? "none" : "0 0 28px rgba(230,57,70,0.35)",
                        }}
                      >
                        {book.isPending
                          ? "Booking…"
                          : coach.seatsLeft === 0
                            ? "Join waitlist"
                            : selectedBatch ? "Book selected batch" : "Book a session"}
                      </button>
                    </Magnetic>

                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(coach.email);
                        toast.success("Email copied to clipboard");
                      }}
                      style={{
                        width: "100%", height: 44, borderRadius: 100,
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      <Mail size={13} /> Contact coach
                    </button>
                  </div>
                </Reveal>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .coach-hero-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .coach-hero-portrait { max-width: 280px; }
          .coach-grid       { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
