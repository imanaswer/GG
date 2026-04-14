"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img, Stars, SkillBadge, SportBadge } from "@/components/Shared";
import { Skeleton } from "@/components/ui";
import { useCoach, useCreateBooking } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Tab = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", fontFamily: "inherit",
    background: active ? "#1c1c1c" : "transparent",
    color: active ? "#fff" : "#6b7280",
    transition: "all 0.15s",
  }}>{children}</button>
);

export default function CoachDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: coach, isLoading, error } = useCoach(id);
  const { user } = useAuth();
  const book = useCreateBooking();
  const [tab, setTab] = useState("overview");
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [review, setReview] = useState({ rating: 5, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReview = async () => {
    if (!user) { toast.error("Please sign in to leave a review"); return; }
    if (review.text.trim().length < 10) { toast.error("Review must be at least 10 characters"); return; }
    setSubmittingReview(true);
    const r = await fetch(`/api/coaches/${id}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(review) });
    setSubmittingReview(false);
    if (r.ok) toast.success("Review submitted! Thank you.");
    else { const d = await r.json(); toast.error(d.error ?? "Failed to submit review"); }
  };

  const handleBook = (batchId?: string) => {
    if (!user) { toast.error("Please sign in to book a session"); return; }
    book.mutate({ coachId: id, batchId: batchId ?? selectedBatch ?? undefined });
  };

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <Skeleton style={{ height: 300, borderRadius: 0 }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[180, 160, 140].map(h => <Skeleton key={h} style={{ height: h, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[120, 100, 90].map(h => <Skeleton key={h} style={{ height: h, borderRadius: 12 }} />)}
        </div>
      </div>
    </div>
  );

  if (error || !coach) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#fff", fontSize: 20 }}>Coach not found</p>
        <Link href="/learn" style={{ padding: "10px 22px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Back to coaches</Link>
      </div>
    </div>
  );

  const occupancy = Math.round(((coach.totalSeats - coach.seatsLeft) / coach.totalSeats) * 100);
  const features = Array.isArray(coach.features) ? coach.features : [];

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />

      {/* Hero */}
      <div style={{ position: "relative", height: 320, overflow: "hidden" }}>
        <Img src={coach.imageUrl} alt={coach.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.5) 45%, transparent 100%)" }} />
        <Link href="/learn" style={{
          position: "absolute", top: 20, left: 20,
          width: 38, height: 38, borderRadius: 9, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          textDecoration: "none", color: "#fff", backdropFilter: "blur(4px)",
        }}><ArrowLeft size={18} /></Link>
        <div style={{ position: "absolute", bottom: 24, left: 24, right: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            <SportBadge sport={coach.sport} />
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: "rgba(0,0,0,0.5)", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.15)" }}>{coach.type}</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>{coach.name}</h1>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Stars value={coach.rating} size={15} />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{coach.rating.toFixed(1)}</span>
              <span style={{ color: "#9ca3af", fontSize: 13 }}>({coach.reviewCount} reviews)</span>
            </div>
            <span style={{ color: "#e63946", fontWeight: 800, fontSize: 18 }}>{coach.price}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 28 }} className="coach-grid">
          {/* Left */}
          <div>
            {/* Tab nav */}
            <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 10, padding: "4px", marginBottom: 22, width: "fit-content" }}>
              {["overview", "batches", "reviews"].map(t => (
                <Tab key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === "batches" && ` (${coach.batches?.length ?? 0})`}
                  {t === "reviews" && ` (${coach.reviewCount})`}
                </Tab>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>About</h2>
                  <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7 }}>{coach.description}</p>
                </div>
                {features.length > 0 && (
                  <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Facilities & Features</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                      {features.map((f: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                          <CheckCircle size={15} color="#e63946" style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 13, color: "#9ca3af" }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Contact</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[{ e: "📍", v: coach.address }, { e: "📞", v: coach.phone }, { e: "📧", v: coach.email }].map(({ e, v }) => v && (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#9ca3af" }}>
                        <span>{e}</span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "batches" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {coach.batches?.map(batch => (
                  <div key={batch.id}
                    onClick={() => batch.seats > 0 && setSelectedBatch(batch.id === selectedBatch ? null : batch.id)}
                    style={{
                      background: "#141414", borderRadius: 12, padding: "16px 18px",
                      border: `1px solid ${selectedBatch === batch.id ? "#e63946" : "rgba(255,255,255,0.07)"}`,
                      cursor: batch.seats > 0 ? "pointer" : "default",
                      opacity: batch.seats === 0 ? 0.6 : 1,
                      boxShadow: selectedBatch === batch.id ? "0 0 0 1px #e63946" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <SkillBadge level={batch.level} />
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>📅 {batch.day}</div>
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>🕐 {batch.time}</div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: batch.seats === 0 ? "#ef4444" : batch.seats <= 3 ? "#eab308" : "#4ade80",
                        }}>{batch.seats === 0 ? "Full" : `${batch.seats} seats left`}</span>
                        {selectedBatch === batch.id && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>Selected ✓</span>
                        )}
                        {batch.seats > 0 && (
                          <button
                            onClick={ev => { ev.stopPropagation(); setSelectedBatch(batch.id); handleBook(batch.id); }}
                            disabled={book.isPending}
                            style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                          >Book</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "reviews" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Submit review */}
                {user && (
                  <div style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 12, padding: "18px 20px" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Write a Review</h3>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setReview(p => ({ ...p, rating: n }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill={n <= review.rating ? "#eab308" : "none"} stroke={n <= review.rating ? "#eab308" : "#4b5563"} strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={review.text}
                      onChange={e => setReview(p => ({ ...p, text: e.target.value }))}
                      placeholder="Share your experience with this coach (min 10 characters)…"
                      maxLength={500}
                      style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <span style={{ fontSize: 11, color: "#4b5563" }}>{review.text.length}/500 · Must have a confirmed booking to review</span>
                      <button onClick={handleReview} disabled={submittingReview} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: submittingReview ? "not-allowed" : "pointer", opacity: submittingReview ? 0.7 : 1, fontFamily: "inherit" }}>
                        {submittingReview ? "Submitting…" : "Submit Review"}
                      </button>
                    </div>
                  </div>
                )}
                {!coach.reviews?.length
                  ? <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>No reviews yet. Be the first!</div>
                  : coach.reviews.map(r => (
                      <div key={r.id} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{r.reviewerName}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Stars value={r.rating} size={13} />
                            <span style={{ fontSize: 11, color: "#4b5563" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{r.text}</p>
                      </div>
                    ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Quick info */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Quick Info</h2>
              {[
                { e: "📍", l: "Location", v: coach.location },
                { e: "💰", l: "Price", v: coach.price },
                { e: "🕐", l: "Schedule", v: coach.timing },
                { e: "🎯", l: "Level", v: coach.skillLevel },
              ].map(({ e, l, v }) => (
                <div key={l} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{e}</span>
                  <div>
                    <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{l}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb" }}>{v}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Availability */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Availability</h2>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}>
                <span style={{ color: "#9ca3af" }}>Seats filled</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{coach.totalSeats - coach.seatsLeft}/{coach.totalSeats}</span>
              </div>
              <div style={{ height: 6, background: "#1c1c1c", borderRadius: 99, overflow: "hidden", marginBottom: 9 }}>
                <div style={{ height: "100%", background: coach.seatsLeft === 0 ? "#ef4444" : occupancy > 70 ? "#eab308" : "#e63946", width: `${occupancy}%`, borderRadius: 99, transition: "width 0.5s" }} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: coach.seatsLeft === 0 ? "#ef4444" : coach.seatsLeft <= 3 ? "#eab308" : "#4ade80" }}>
                {coach.seatsLeft === 0 ? "All seats taken" : `${coach.seatsLeft} seats remaining`}
              </p>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => handleBook()}
              disabled={book.isPending || coach.seatsLeft === 0}
              style={{
                width: "100%", height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: coach.seatsLeft === 0 ? "transparent" : "#e63946",
                color: coach.seatsLeft === 0 ? "#6b7280" : "#fff",
                border: coach.seatsLeft === 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                cursor: (book.isPending || coach.seatsLeft === 0) ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: book.isPending ? 0.7 : 1,
              }}>
              {book.isPending ? "Booking…" : coach.seatsLeft === 0 ? "Join Waitlist" : "Book a Session"}
            </button>
            <button
              onClick={() => { navigator.clipboard?.writeText(coach.email); toast.success("Email copied!"); }}
              style={{
                width: "100%", height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "transparent", color: "#9ca3af",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}>
              <Mail size={14} />Contact Coach
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 768px) {
          .coach-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
