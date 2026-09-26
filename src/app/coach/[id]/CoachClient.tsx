"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, MapPin, Clock, Target, DollarSign, Calendar, X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { Stars, SkillBadge, SportBadge } from "@/components/Shared";
import { useCoach, useCreateBooking, useCancelBooking, type Coach } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { COACH_FALLBACKS, HERO_BACKDROPS, pickFallback, gameImage } from "@/lib/premium-images";
import { mapsHref } from "@/lib/maps";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { isInstantPayEligible } from "@/lib/coachPayment";
import { resolvePhone } from "@/lib/phone";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        padding: "12px 0",
        marginRight: "32px",
        fontSize: 16, fontWeight: 500,
        color: active ? "#fff" : "rgba(255,255,255,0.4)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "color 0.3s ease",
      }}
    >
      {children}
      {active && (
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 2, background: "#fff"
        }} />
      )}
    </button>
  );
}

export default function CoachDetail({ params, initialCoach }: { params: Promise<{ id: string }>; initialCoach?: Coach }) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: coach, isLoading, error } = useCoach(id);
  const book = useCreateBooking();
  const cancelBooking = useCancelBooking();

  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "batches" | "photos" | "reviews">("overview");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [review, setReview] = useState({ rating: 5, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [justBooked, setJustBooked] = useState(false);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (coach?.batches && coach.batches.length > 0) {
      const available = coach.batches.find(b => b.seats > 0);
      if (available) setSelectedBatch(available.id);
    }
  }, [coach?.batches]);

  const contact = resolvePhone(phone, user?.phone);
  const effectiveStatus = justBooked ? "pending" : coach?.userBooking?.status;
  const activeBooking = effectiveStatus === "pending" || effectiveStatus === "approved";
  const themeColor = coach ? ((coach as { themeColor?: string }).themeColor || "#fff") : "#fff";
  const fixedPrice = coach ? isInstantPayEligible(coach) : false;

  const handleInstantPay = async (batchId?: string) => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (activeBooking) { toast.error("You already have an active booking"); return; }
    const cleanedPhone = contact.value;
    if (!cleanedPhone) { toast.error("Please add a mobile number"); return; }
    if (!contact.valid) { toast.error("Please enter a valid mobile number"); return; }
    if (!coach) return;

    try {
      setPaying(true);
      const order = await createPaymentOrder({ entityType: "coach", entityId: id });
      
      const res = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: coach.name,
        description: `Booking for ${coach.sport}`,
        prefill: { name: user.name, email: user.email, contact: cleanedPhone },
      });
      
      await verifyPayment({
        success: res,
        entityType: "coach",
        entityId: id,
        amount: order.amount,
        registration: { entityType: "coach", batchId: batchId ?? selectedBatch ?? undefined, phone: cleanedPhone }
      });
      
      toast.success("Payment successful! Session booked.");
      setJustBooked(true);
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Payment failed or cancelled.");
    } finally { setPaying(false); }
  };

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
    const cleanedPhone = contact.value;
    if (!cleanedPhone) { toast.error("Please add a mobile number so the team can reach you"); return; }
    if (!contact.valid) { toast.error("Please enter a valid mobile number"); return; }
    book.mutate(
      { coachId: id, batchId: batchId ?? selectedBatch ?? undefined, phone: cleanedPhone },
      { onSuccess: () => setJustBooked(true) },
    );
  };

  const handleCancel = () => {
    const bookingId = coach?.userBooking?.id;
    if (!bookingId) { toast.error("No booking to cancel"); return; }
    if (!confirm("Cancel this booking request? This cannot be undone.")) return;
    cancelBooking.mutate(bookingId, { onSuccess: () => setJustBooked(false) });
  };

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main className="noise" style={{ background: "#000", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 500, borderRadius: 28, marginBottom: 80 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 64 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[200, 160, 140].map(h => (
                  <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[160, 220, 80].map(h => (
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
        <main className="noise" style={{
          background: "#000", minHeight: "100vh",
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
              background: "#fff", color: "#000",
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
  // Use coverImageUrl for the immersive hero backdrop, or fall back to a sport-specific image
  const heroImg = coach.coverImageUrl || gameImage(coach.sport, coach.id).src;
  const portraitImg = coach.imageUrl || pickFallback(COACH_FALLBACKS, coach.id).src;

  const quickInfo: { Icon: typeof MapPin; l: string; v: string; href?: string }[] = [
    { Icon: MapPin,   l: "Location", v: coach.location, href: coach.location ? mapsHref(coach) : undefined },
    { Icon: DollarSign, l: "Price",  v: coach.price    },
    { Icon: Clock,    l: "Schedule", v: coach.timing   },
    { Icon: Target,   l: "Level",    v: coach.skillLevel },
  ];

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main className="noise" style={{ background: "#000", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        
        {/* Massive Immersive Hero */}
        <section style={{
          position: "relative",
          height: "80vh",
          minHeight: 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 60,
        }}>
          {/* Background image full bleed */}
          <div style={{ position: "absolute", inset: 0 }}>
            <Image
              src={heroImg} alt=""
              fill priority quality={90} sizes="100vw"
              style={{ objectFit: "cover", filter: "saturate(0.7) brightness(0.7)" }}
            />
          </div>
          {/* Gradient to blend into the black background below */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, #000 0%, transparent 60%, rgba(0,0,0,0.6) 100%)",
          }} />

          <div className="container-lg" style={{ position: "relative", zIndex: 10 }}>
            <Reveal>
              <Link href="/learn" style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 100,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 13, color: "rgba(255,255,255,0.9)",
                textDecoration: "none", marginBottom: 40,
                backdropFilter: "blur(12px)",
              }}>
                <ArrowLeft size={14} /> Back to Directory
              </Link>
            </Reveal>

            <Reveal delay={0.1}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
                <div style={{
                  background: themeColor, color: "#000",
                  padding: "8px 16px", borderRadius: 100, fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase"
                }}>
                  {coach.sport}
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "white", padding: "8px 16px", borderRadius: 100, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase"
                }}>
                  {coach.type}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <h1 style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: "clamp(64px, 12vw, 140px)",
                lineHeight: 0.9,
                color: "#fff",
                margin: "0 0 24px -6px", // Slight negative margin to align visually
                textShadow: "0 20px 40px rgba(0,0,0,0.5)"
              }}>
                {coach.name}
              </h1>
            </Reveal>

            <Reveal delay={0.3}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, fontSize: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={20} color={themeColor} fill={themeColor} />
                  <span style={{ fontWeight: 700 }}>{coach.rating.toFixed(1)}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>({coach.reviewCount} reviews)</span>
                </div>
                <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />
                <span style={{ color: themeColor, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>
                  {coach.price}
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Body Content */}
        <section style={{ padding: "80px 0 160px" }}>
          <div className="container-lg">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 80 }} className="coach-grid">
              
              {/* Left Column (Editorial Content) */}
              <div>
                <Reveal>
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 48, display: "flex", gap: 8, overflowX: "auto" }}>
                    <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                      Overview
                    </TabButton>
                    <TabButton active={tab === "batches"} onClick={() => setTab("batches")}>
                      Batches
                    </TabButton>
                    <TabButton active={tab === "photos"} onClick={() => setTab("photos")}>
                      Photos
                    </TabButton>
                    <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
                      Reviews
                    </TabButton>
                  </div>
                </Reveal>

                {tab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
                    <Reveal>
                      <div>
                        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: "white", marginBottom: 24 }}>About</h2>
                        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontWeight: 400 }}>
                          {coach.description}
                        </p>
                      </div>
                    </Reveal>

                    {features.length > 0 && (
                      <Reveal>
                        <div>
                          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: "white", marginBottom: 32 }}>Facilities</h2>
                          <div style={{
                            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24,
                          }}>
                            {features.map((f, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                                <CheckCircle size={20} color={themeColor} style={{ marginTop: 2 }} />
                                <span style={{ color: "#E5E5E5", fontSize: 17, lineHeight: 1.4 }}>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Reveal>
                    )}

                    <Reveal>
                      <div>
                        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: "white", marginBottom: 32 }}>Location</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                          {[
                            { Icon: MapPin, v: coach.address, href: coach.address ? mapsHref(coach) : undefined },
                          ].filter(row => row.v).map(({ Icon, v, href }) => (
                            <div key={v} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                              <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 12 }}>
                                <Icon size={24} color={themeColor} />
                              </div>
                              {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                   style={{ color: "#E5E5E5", textDecoration: "none", fontSize: 18, lineHeight: 1.5, marginTop: 4, transition: "color 0.2s" }}
                                   onMouseEnter={e => { e.currentTarget.style.color = themeColor; }}
                                   onMouseLeave={e => { e.currentTarget.style.color = "#E5E5E5"; }}>
                                  {v}
                                </a>
                              ) : (
                                <span style={{ fontSize: 18, lineHeight: 1.5, color: "#E5E5E5", marginTop: 4 }}>{v}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  </div>
                )}

                {tab === "batches" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {!coach.batches?.length ? (
                      <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)" }}>No batches published yet.</p>
                    ) : (
                      coach.batches.map(batch => {
                        const isSelected = selectedBatch === batch.id;
                        const isFull = batch.seats === 0;
                        return (
                          <div
                            key={batch.id}
                            className="batch-card"
                            onClick={() => !isFull && setSelectedBatch(isSelected ? null : batch.id)}
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              borderRadius: 24,
                              border: `1px solid ${isSelected ? themeColor : "rgba(255,255,255,0.08)"}`,
                              cursor: isFull ? "default" : "pointer",
                              opacity: isFull ? 0.5 : 1,
                              transition: "all 0.3s ease",
                            }}
                          >
                            <div className="batch-info">
                              <SkillBadge level={batch.level} />
                              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16, color: "#E5E5E5" }}>
                                <Calendar size={18} color={themeColor} /> {batch.day}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16, color: "#E5E5E5" }}>
                                <Clock size={18} color={themeColor} /> {batch.time}
                              </div>
                            </div>

                            <div className="batch-actions">
                              <span style={{
                                fontSize: 15, fontWeight: 700,
                                color: isFull ? "#fff" : batch.seats <= 3 ? "#fbbf24" : "#4ade80",
                              }}>
                                {isFull ? "Full" : `${batch.seats} seat${batch.seats === 1 ? "" : "s"} left`}
                              </span>
                              {isSelected && (
                                <span style={{
                                  fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                                  padding: "6px 14px", borderRadius: 100,
                                  background: themeColor, color: "#000", display: "inline-block"
                                }}>
                                  Selected
                                </span>
                              )}
                              {!isFull && (
                                <button
                                  className="batch-book-btn"
                                  onClick={ev => { ev.stopPropagation(); setSelectedBatch(batch.id); if (fixedPrice) { handleInstantPay(batch.id); } else { handleBook(batch.id); } }}
                                  disabled={book.isPending || paying}
                                  style={{
                                    padding: "12px 28px", borderRadius: 100,
                                    fontSize: 14, fontWeight: 700,
                                    background: "rgba(255,255,255,0.1)",
                                    color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
                                    cursor: book.isPending ? "not-allowed" : "pointer",
                                    fontFamily: "inherit",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = themeColor; e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.color = "#000"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#fff"; }}
                                >
                                  {book.isPending ? "…" : "Book this batch"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {tab === "photos" && (
                  <div>
                    {!coach.photos?.length ? (
                      <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)" }}>No photos uploaded yet.</p>
                    ) : (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: 24,
                      }}>
                        {coach.photos.map((src, i) => (
                          <button
                            key={`${src}-${i}`}
                            onClick={() => setLightbox(i)}
                            style={{
                              position: "relative",
                              aspectRatio: "1",
                              borderRadius: 20,
                              overflow: "hidden",
                              border: "none",
                              background: "rgba(255,255,255,0.05)",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            <Image
                              src={src}
                              alt={`Facility photo ${i + 1}`}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 240px"
                              style={{ objectFit: "cover", transition: "transform 0.4s ease" }}
                              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "reviews" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {user && (
                      <Reveal>
                        <div style={{
                          background: "rgba(255,255,255,0.02)",
                          border: `1px solid rgba(255,255,255,0.1)`,
                          borderRadius: 24, padding: "40px",
                        }}>
                          <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40, color: "white", marginBottom: 24 }}>Leave a Review</h3>
                          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setReview(p => ({ ...p, rating: n }))}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              >
                                <Star size={32} color={n <= review.rating ? themeColor : "rgba(255,255,255,0.2)"} fill={n <= review.rating ? themeColor : "none"} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={review.text}
                            onChange={e => setReview(p => ({ ...p, text: e.target.value }))}
                            placeholder="Share your experience..."
                            maxLength={500}
                            style={{
                              width: "100%", minHeight: 120,
                              padding: "20px", borderRadius: 16,
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(0,0,0,0.2)",
                              color: "#fff", fontSize: 16,
                              fontFamily: "inherit", outline: "none", resize: "none",
                              boxSizing: "border-box",
                              transition: "border-color 0.2s"
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = themeColor; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                          />
                          <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            marginTop: 20, flexWrap: "wrap", gap: 16,
                          }}>
                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                              {review.text.length}/500 characters
                            </span>
                            <button
                              onClick={handleReview}
                              disabled={submittingReview}
                              style={{
                                padding: "14px 32px", borderRadius: 100,
                                fontSize: 15, fontWeight: 700,
                                background: themeColor, color: "#000", border: "none",
                                cursor: submittingReview ? "not-allowed" : "pointer",
                                opacity: submittingReview ? 0.7 : 1,
                              }}
                            >
                              {submittingReview ? "Submitting…" : "Post Review"}
                            </button>
                          </div>
                        </div>
                      </Reveal>
                    )}

                    {!coach.reviews?.length ? (
                      <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)" }}>No reviews yet. Be the first to share your experience.</p>
                    ) : (
                      coach.reviews.map(r => (
                        <div
                          key={r.id}
                          style={{
                            background: "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                            padding: "32px 0",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                            <span style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>{r.reviewerName}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <div style={{ display: "flex" }}>
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={16} fill={i < r.rating ? themeColor : "none"} color={i < r.rating ? themeColor : "rgba(255,255,255,0.2)"} />
                                ))}
                              </div>
                              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                            {r.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Right Sidebar (Sticky) */}
              <aside className={tab !== "overview" ? "hide-on-mobile" : ""}>
                <div style={{ position: "sticky", top: 120, display: "flex", flexDirection: "column", gap: 32 }}>
                  
                  {/* Portrait & Quick Info Combined Card */}
                  <Reveal delay={0.2}>
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 32, padding: "32px",
                      backdropFilter: "blur(20px)",
                    }}>
                      <div style={{
                        position: "relative", width: "100%", aspectRatio: "4/5",
                        borderRadius: 20, overflow: "hidden", marginBottom: 32,
                      }}>
                        <Image
                          src={portraitImg} alt={coach.name}
                          fill sizes="380px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {quickInfo.map(({ Icon, l, v, href }) => (
                          <div key={l} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ opacity: 0.5, flexShrink: 0 }}><Icon size={20} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                {l}
                              </p>
                              {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                   style={{ fontSize: 16, fontWeight: 700, color: themeColor, textDecoration: "none", display: "block", wordBreak: "break-word" }}>
                                  {v}
                                </a>
                              ) : (
                                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", wordBreak: "break-word" }}>{v}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>

                  {/* Booking Module */}
                  <Reveal delay={0.3}>
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 32, padding: "32px",
                      backdropFilter: "blur(20px)",
                    }}>
                      <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "white", marginBottom: 24 }}>Book Session</h2>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 12 }}>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>Capacity</span>
                        <span style={{ color: "#fff", fontWeight: 700 }}>
                          {coach.totalSeats - coach.seatsLeft}/{coach.totalSeats} booked
                        </span>
                      </div>
                      <div style={{
                        height: 4, background: "rgba(255,255,255,0.1)",
                        borderRadius: 100, overflow: "hidden", marginBottom: 16,
                      }}>
                        <div style={{
                          height: "100%", width: `${occupancy}%`,
                          background: coach.seatsLeft === 0 ? "#fff" : themeColor,
                          transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                        }} />
                      </div>

                      <div style={{ marginTop: 32 }}>
                        {activeBooking ? (
                          <div style={{
                            background: effectiveStatus === "approved" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                            border: `1px solid ${effectiveStatus === "approved" ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
                            borderRadius: 20, padding: "24px",
                            textAlign: "center",
                          }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                              {effectiveStatus === "approved" ? "Session Approved" : "Request Pending"}
                            </p>
                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
                              {effectiveStatus === "approved" ? "You're all set." : "Waiting for confirmation."}
                            </p>
                            {effectiveStatus === "pending" && coach.userBooking?.id && (
                              <button
                                onClick={handleCancel}
                                disabled={cancelBooking.isPending}
                                style={{
                                  width: "100%", padding: "12px", borderRadius: 100,
                                  background: "transparent", color: "#fff", border: "1px solid rgba(248,113,113,0.3)",
                                  cursor: "pointer", fontWeight: 600,
                                }}
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {coach.seatsLeft > 0 && contact.needsInput && (
                              <div style={{ marginBottom: 24 }}>
                                <input
                                  type="tel"
                                  value={phone}
                                  onChange={e => setPhone(e.target.value)}
                                  placeholder="Mobile Number"
                                  style={{
                                    width: "100%", height: 56, borderRadius: 16,
                                    padding: "0 20px", fontSize: 16,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#fff", outline: "none",
                                  }}
                                />
                              </div>
                            )}
                            
                            {fixedPrice && coach.seatsLeft > 0 && (
                              <button
                                onClick={() => handleInstantPay()}
                                disabled={paying || book.isPending}
                                style={{
                                  width: "100%", height: "auto", minHeight: 64, padding: "12px 24px", borderRadius: 100, marginBottom: 16,
                                  fontSize: 16, fontWeight: 800, border: "none",
                                  background: themeColor, color: "#000",
                                  cursor: paying ? "not-allowed" : "pointer",
                                  transition: "transform 0.2s",
                                  whiteSpace: "normal", lineHeight: 1.3,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                              >
                                {paying ? "Processing…" : `Pay & Book Instantly · ₹${coach.priceMin}`}
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleBook()}
                              disabled={book.isPending || paying || coach.seatsLeft === 0}
                              style={{
                                width: "100%", height: "auto", minHeight: 64, padding: "12px 24px", borderRadius: 100,
                                fontSize: 16, fontWeight: 800, border: coach.seatsLeft === 0 ? "1px solid rgba(255,255,255,0.2)" : "none",
                                background: coach.seatsLeft === 0 ? "transparent" : (fixedPrice ? "rgba(255,255,255,0.1)" : themeColor),
                                color: coach.seatsLeft === 0 ? "rgba(255,255,255,0.5)" : (fixedPrice ? "#fff" : "#000"),
                                cursor: (book.isPending || paying || coach.seatsLeft === 0) ? "not-allowed" : "pointer",
                                whiteSpace: "normal", lineHeight: 1.3,
                              }}
                            >
                              {book.isPending
                                ? "Booking…"
                                : coach.seatsLeft === 0
                                  ? "Waitlist Full"
                                  : fixedPrice ? "Request Session Instead" : "Book Session"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Reveal>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      {lightbox !== null && coach.photos && coach.photos[lightbox] && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightbox(null); }}
            style={{
              position: "absolute", top: 32, right: 32, width: 48, height: 48, borderRadius: 100,
              background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={24} />
          </button>
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: "relative", width: "100%", maxWidth: 1200, height: "80vh", background: "transparent" }}
          >
            <Image
              src={coach.photos[lightbox]}
              alt="Facility"
              fill style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      <style>{`
        .batch-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          padding: 32px;
        }
        .batch-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1 1 240px;
        }
        .batch-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: flex-end;
          text-align: right;
        }
        
        @media (max-width: 992px) {
          .coach-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 48px !important; }
          .hide-on-mobile { display: none !important; }
        }

        @media (max-width: 640px) {
          .batch-card {
            padding: 24px;
            flex-direction: column;
            align-items: flex-start;
          }
          .batch-info {
            flex: none;
            width: 100%;
          }
          .batch-actions {
            align-items: flex-start;
            text-align: left;
            width: 100%;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 24px;
          }
          .batch-book-btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
