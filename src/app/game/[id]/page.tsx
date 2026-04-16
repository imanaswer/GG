"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, AlertCircle, Share2, MessageCircle, MapPin, Clock, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { SkillBadge, SportBadge, fmtDate } from "@/components/Shared";
import { useGame, useJoinGame, useLeaveGame } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { GAME_FALLBACKS, pickFallback } from "@/lib/premium-images";

export default function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: game, isLoading, error } = useGame(id);
  const { user } = useAuth();
  const join  = useJoinGame();
  const leave = useLeaveGame();
  const qc = useQueryClient();
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 360, borderRadius: 28, marginBottom: 40 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }} className="game-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[160, 160, 200].map(h => <div key={h} className="skeleton" style={{ height: h, borderRadius: 20 }} />)}
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

  if (error || !game) {
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
              Game not found.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>
              This game may have been cancelled or completed.
            </p>
            <Link href="/play" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 100,
              background: "#e63946", color: "#fff",
              textDecoration: "none", fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Back to games
            </Link>
          </div>
        </main>
      </>
    );
  }

  const isFull      = game.slotsLeft === 0 || game.status === "full";
  const isOrganizer = user?.id === game.organizerId;
  const isJoined    = game.players?.some(p => p.userId === user?.id);
  const rules       = Array.isArray(game.rules) ? game.rules : [];
  const filled      = game.slots - game.slotsLeft;
  const pct         = Math.min(100, Math.round((filled / game.slots) * 100));
  const isPast      = new Date(game.scheduledAt).getTime() + game.duration * 60000 < Date.now();
  const img         = game.imageUrl || pickFallback(GAME_FALLBACKS, game.id).src;

  const handleComplete = async () => {
    if (!confirm("Mark this game as complete and record attendance?")) return;
    setCompleting(true);
    const r = await fetch(`/api/games/${game.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendance: {} }),
    });
    setCompleting(false);
    if (r.ok) toast.success("Game marked complete. Attendance recorded.");
    else toast.error("Failed to complete game");
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this game? This cannot be undone.")) return;
    setCancelling(true);
    const r = await fetch(`/api/games/${game.id}/cancel`, { method: "POST" });
    setCancelling(false);
    if (r.ok) toast.success("Game cancelled.");
    else toast.error("Failed to cancel game");
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleJoin = async () => {
    if (!game || !user) return;
    if (game.costAmount <= 0) { join.mutate(game.id); return; }
    setPaying(true);
    try {
      const order = await createPaymentOrder({ amount: game.costAmount, entityType: "game", entityId: game.id });
      const success = await openRazorpayCheckout({
        keyId: order.keyId, orderId: order.orderId, amount: order.amount, currency: order.currency,
        name: "Game Ground", description: `Pickup game · ${game.title}`,
        prefill: { name: user.name, email: user.email },
      });
      await verifyPayment({
        success, entityType: "game", entityId: game.id, amount: order.amount,
        registration: { entityType: "game" },
        devMode: order.devMode,
      });
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", game.id] });
      toast.success("Payment successful. You've joined the game.");
    } catch (err) {
      toast.error((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Join me for ${game.title} at ${game.location}! ${window.location.href}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Hero */}
        <section style={{ position: "relative", paddingTop: 120, paddingBottom: 48, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
            <Image
              src={img} alt={game.title}
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
                <Link href="/play" style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 14px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 12, color: "rgba(255,255,255,0.7)",
                  textDecoration: "none", backdropFilter: "blur(10px)",
                }}>
                  <ArrowLeft size={12} /> All games
                </Link>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleShare}
                    style={{
                      width: 38, height: 38, borderRadius: 100,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", cursor: "pointer", backdropFilter: "blur(10px)",
                    }}
                    title="Copy link"
                  >
                    <Share2 size={15} />
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    style={{
                      width: 38, height: 38, borderRadius: 100,
                      background: "rgba(37,211,102,0.9)",
                      border: "1px solid rgba(37,211,102,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", cursor: "pointer",
                    }}
                    title="Share on WhatsApp"
                  >
                    <MessageCircle size={15} />
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                <SportBadge sport={game.sport} />
                <SkillBadge level={game.skillLevel} />
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                  background: game.costAmount === 0 ? "rgba(34,197,94,0.92)" : "rgba(0,0,0,0.55)",
                  color: game.costAmount === 0 ? "#000" : "#fff",
                  border: game.costAmount > 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
                  backdropFilter: "blur(8px)",
                }}>
                  {game.cost}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <h1 className="display" style={{
                fontSize: "clamp(40px, 6vw, 88px)",
                color: "#fff", marginBottom: 24,
              }}>
                {game.title}
              </h1>
            </Reveal>

            <Reveal delay={0.18}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={14} color="#e63946" /> {game.location}
                </div>
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={14} color="#e63946" /> {fmtDate(game.scheduledAt)} · {game.duration}min
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Body */}
        <section style={{ paddingBottom: 120 }}>
          <div className="container-lg">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 32 }} className="game-grid">
              {/* Left */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {game.description && (
                  <Reveal>
                    <div style={{
                      background: "rgba(13,13,13,0.7)",
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 20, padding: "24px 28px",
                    }}>
                      <h2 className="eyebrow" style={{ marginBottom: 14 }}>About this game</h2>
                      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                        {game.description}
                      </p>
                    </div>
                  </Reveal>
                )}

                {rules.length > 0 && (
                  <Reveal>
                    <div style={{
                      background: "rgba(13,13,13,0.7)",
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 20, padding: "24px 28px",
                    }}>
                      <h2 className="eyebrow" style={{ marginBottom: 18 }}>Rules &amp; guidelines</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {rules.map((r, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <CheckCircle size={15} color="#e63946" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{r}</span>
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                      <h2 className="eyebrow" style={{ margin: 0 }}>Roster</h2>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                        {filled}/{game.slots} confirmed
                      </span>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                      gap: 10,
                    }}>
                      {game.players?.map(p => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", borderRadius: 14,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, color: "#fff", fontSize: 13, flexShrink: 0,
                          }}>
                            {p.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{
                              fontSize: 13, fontWeight: 600, color: "#fff",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {p.name}
                            </p>
                            {p.userId === game.organizerId && (
                              <p style={{ fontSize: 10, color: "#ff6b74", fontWeight: 600, letterSpacing: "0.04em" }}>
                                ORGANIZER
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                            <Star size={11} fill="#eab308" color="#eab308" />
                            <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
                              {p.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {Array.from({ length: Math.min(game.slotsLeft, 4) }).map((_, i) => (
                        <div
                          key={`e${i}`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "10px 12px", borderRadius: 14,
                            border: "1.5px dashed rgba(255,255,255,0.1)",
                          }}
                        >
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Open spot</span>
                        </div>
                      ))}

                      {game.slotsLeft > 4 && (
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "10px 12px", borderRadius: 14,
                          background: "rgba(255,255,255,0.02)",
                        }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                            +{game.slotsLeft - 4} more open
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Right sidebar */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Organizer */}
                <Reveal>
                  <div style={{
                    background: "rgba(13,13,13,0.7)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 20, padding: "20px 22px",
                  }}>
                    <h2 className="eyebrow" style={{ marginBottom: 14 }}>Organizer</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: "50%",
                        background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, color: "#fff", fontSize: 18, flexShrink: 0,
                        boxShadow: "0 4px 16px rgba(230,57,70,0.35)",
                      }}>
                        {game.organizerName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: "#fff", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {game.organizerName}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <Star size={11} fill="#eab308" color="#eab308" />
                          <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
                            {game.organizerRating?.toFixed(1) ?? "—"}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                            · {game.organizerGames ?? 0} games
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Slots */}
                <Reveal>
                  <div style={{
                    background: "rgba(13,13,13,0.7)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 20, padding: "20px 22px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>Spots filled</span>
                      <span style={{ color: "#fff", fontWeight: 700 }}>{filled}/{game.slots}</span>
                    </div>
                    <div style={{
                      height: 5, background: "rgba(255,255,255,0.05)",
                      borderRadius: 100, overflow: "hidden",
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          height: "100%",
                          background: pct >= 100 ? "#ef4444" : pct >= 75 ? "#eab308" : "#e63946",
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                      {isFull ? (
                        <>
                          <AlertCircle size={13} color="#f87171" />
                          <span style={{ color: "#f87171", fontWeight: 700 }}>Game is full</span>
                        </>
                      ) : (
                        <>
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%", background: "#4ade80",
                            boxShadow: "0 0 8px #4ade80",
                          }} />
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>
                            {game.slotsLeft} spot{game.slotsLeft !== 1 ? "s" : ""} remaining
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Location */}
                {game.address && (
                  <Reveal>
                    <div style={{
                      background: "rgba(13,13,13,0.7)",
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 20, padding: "20px 22px",
                    }}>
                      <h2 className="eyebrow" style={{ marginBottom: 12 }}>Location</h2>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
                        <MapPin size={14} color="#e63946" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{game.address}</span>
                      </div>
                    </div>
                  </Reveal>
                )}

                {/* Player actions */}
                {!isOrganizer && user && (
                  isJoined ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button
                        disabled={leave.isPending}
                        onClick={() => leave.mutate(game.id)}
                        style={{
                          width: "100%", height: 48, borderRadius: 100,
                          fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                          background: "rgba(255,255,255,0.03)",
                          color: "rgba(255,255,255,0.75)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          cursor: leave.isPending ? "not-allowed" : "pointer",
                          opacity: leave.isPending ? 0.7 : 1,
                        }}
                      >
                        {leave.isPending ? "Leaving…" : "Leave game"}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Hey! I joined ${game.title} — are we still on?`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          height: 44, borderRadius: 100,
                          background: "rgba(37,211,102,0.1)",
                          color: "#25d366",
                          border: "1px solid rgba(37,211,102,0.3)",
                          textDecoration: "none",
                          fontSize: 13, fontWeight: 700,
                        }}
                      >
                        <MessageCircle size={14} /> Message organiser
                      </a>
                    </div>
                  ) : (
                    <Magnetic strength={6}>
                      <button
                        disabled={join.isPending || paying}
                        onClick={isFull ? () => join.mutate(game.id) : handleJoin}
                        style={{
                          width: "100%", height: 52, borderRadius: 100,
                          fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                          border: isFull ? "1px solid rgba(255,255,255,0.1)" : "none",
                          background: isFull
                            ? "transparent"
                            : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                          color: isFull ? "rgba(255,255,255,0.55)" : "#fff",
                          cursor: (join.isPending || paying) ? "not-allowed" : "pointer",
                          opacity: (join.isPending || paying) ? 0.7 : 1,
                          boxShadow: isFull ? "none" : "0 0 28px rgba(230,57,70,0.35)",
                        }}
                      >
                        {(join.isPending || paying)
                          ? (paying ? "Processing payment…" : "Joining…")
                          : isFull
                            ? "Join waitlist"
                            : game.costAmount > 0
                              ? `Pay ${game.cost} · Join`
                              : "Join game · Free"}
                      </button>
                    </Magnetic>
                  )
                )}

                {!user && (
                  <Magnetic strength={6}>
                    <Link
                      href="/login"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        height: 52, borderRadius: 100,
                        fontSize: 14, fontWeight: 700,
                        background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                        color: "#fff", textDecoration: "none",
                        boxShadow: "0 0 28px rgba(230,57,70,0.35)",
                      }}
                    >
                      Sign in to join
                    </Link>
                  </Magnetic>
                )}

                {/* Organizer controls */}
                {isOrganizer && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{
                      padding: "12px 16px", borderRadius: 14,
                      background: "rgba(230,57,70,0.08)",
                      border: "1px solid rgba(230,57,70,0.22)",
                      textAlign: "center",
                      fontSize: 13, color: "#ff6b74", fontWeight: 600,
                    }}>
                      You organized this game
                    </div>
                    {(game.status === "open" || game.status === "full") && (
                      <>
                        {isPast && (
                          <button
                            onClick={handleComplete}
                            disabled={completing}
                            style={{
                              width: "100%", height: 46, borderRadius: 100,
                              fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                              background: "#4ade80", color: "#000", border: "none",
                              cursor: completing ? "not-allowed" : "pointer",
                              opacity: completing ? 0.7 : 1,
                              boxShadow: "0 2px 14px rgba(74,222,128,0.3)",
                            }}
                          >
                            {completing ? "Completing…" : "Mark as complete"}
                          </button>
                        )}
                        <button
                          onClick={handleCancel}
                          disabled={cancelling}
                          style={{
                            width: "100%", height: 44, borderRadius: 100,
                            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                            background: "transparent",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.3)",
                            cursor: cancelling ? "not-allowed" : "pointer",
                            opacity: cancelling ? 0.7 : 1,
                          }}
                        >
                          {cancelling ? "Cancelling…" : "Cancel game"}
                        </button>
                      </>
                    )}
                    {game.status === "cancelled" && (
                      <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                        This game was cancelled.
                      </p>
                    )}
                    {game.status === "completed" && (
                      <p style={{ textAlign: "center", fontSize: 13, color: "#4ade80" }}>
                        Game completed.
                      </p>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .game-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
