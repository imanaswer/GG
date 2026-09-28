"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, AlertCircle, Share2, MessageCircle, MapPin, Clock, Star, Navigation } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { SkillBadge, SportBadge, fmtDate } from "@/components/Shared";
import { TierBadge } from "@/components/TierBadge";
import { useGame, useJoinGame, useLeaveGame } from "@/hooks/useData";
import { mapsHref, hasMapTarget } from "@/lib/maps";
import { useAuth } from "@/context/AuthContext";
import { gameImage } from "@/lib/premium-images";
import { whatsAppLink } from "@/lib/whatsapp";
import { CANCEL_CUTOFF_MS, CANCEL_CUTOFF_MIN, CANCEL_CUTOFF_MESSAGE } from "@/lib/gameTime";
import { HostPaymentCard, PayHostPanel, HostPaymentRoster } from "@/components/HostPayment";

export default function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: game, isLoading, error } = useGame(id);
  const { user } = useAuth();
  const join  = useJoinGame();
  const leave = useLeaveGame();
  // Captured once at mount rather than read during render: Date.now() in the
  // render body is an impure call, and a page-load-time reference is what these
  // "has it started / can I still cancel" decisions actually mean.
  const [now] = useState(() => Date.now());
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  if (isLoading) {
    return (
      <>
        <PremiumNav variant="solid" />
        <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
          <div className="container-lg">
            <div className="skeleton" style={{ height: 360, borderRadius: 28, marginBottom: 40 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }} className="game-grid">
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
              background: "#fff", color: "#000",
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
  const joinable    = !["cancelled", "completed", "archived"].includes(game.status);
  const isOrganizer = user?.id === game.organizerId;
  const isJoined    = game.players?.some(p => p.userId === user?.id);
  const rules       = Array.isArray(game.rules) ? game.rules : [];
  const filled      = game.slots - game.slotsLeft;
  const pct         = Math.min(100, Math.round((filled / game.slots) * 100));
  const isPast      = new Date(game.scheduledAt).getTime() + game.duration * 60000 < now;
  // The cutoff comes from the shared rule module — this was the last hand-copied
  // "90 minutes" left after the server-side copies were consolidated.
  const canCancel   = new Date(game.scheduledAt).getTime() - now >= CANCEL_CUTOFF_MS;
  // A host may cancel their own game ONLY when nobody has joined. (Backend also
  // enforces this; the UI mirrors it so the action isn't offered when blocked.)
  const playerCount    = game.players?.length ?? 0;
  const hostCanCancel  = playerCount === 0;
  const img         = game.imageUrl || gameImage(game.sport, game.id).src;

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

  const executeCancel = async () => {
    setCancelling(true);
    setShowCancelModal(false);
    const r = await fetch(`/api/games/${game.id}/cancel`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setCancelling(false);
    
    if (r.ok || j?.error === "Game is already cancelled") {
      toast.success("Game cancelled.");
      window.location.href = "/play";
    }
    else {
      toast.error(j?.error ?? "Failed to cancel game");
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  // Joining is free of any in-app payment, whatever the entry fee. The fee is
  // collected by the host directly (see the payment section and the post-join
  // panel); Game Ground never processes it.
  const handleJoin = () => {
    if (!game || !user) return;
    join.mutate(game.id, {
      onSuccess: () => {
        if (game.costAmount > 0) toast.success("You're in. Next step — pay the host directly.");
      },
    });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const hostWhatsApp = whatsAppLink(
    game.organizerPhone,
    `Hi ${game.organizerName ?? "there"}, I'm reaching out about your game "${game.title}" at ${game.location}.${shareUrl ? ` ${shareUrl}` : ""}`,
  );

  const joinedWhatsApp = whatsAppLink(
    game.organizerPhone,
    `Hi ${game.organizerName ?? "there"}, I've joined "${game.title}" — are we still on?`,
  );

  const handleWhatsApp = () => {
    if (hostWhatsApp) window.open(hostWhatsApp, "_blank", "noopener,noreferrer");
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
              src={img} alt={game.title}
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
                <Link href="/play" style={{
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
                  {!isOrganizer && hostWhatsApp && (
                    <button
                      onClick={handleWhatsApp}
                      style={{
                        width: 44, height: 44, borderRadius: 100,
                        background: "#fff",
                        border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#000", cursor: "pointer",
                      }}
                      title="Message the host on WhatsApp"
                    >
                      <MessageCircle size={16} fill="#000" />
                    </button>
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                <SportBadge sport={game.sport} />
                <SkillBadge level={game.skillLevel} />
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                  background: game.costAmount === 0 ? "#fff" : "rgba(255,255,255,0.1)",
                  color: game.costAmount === 0 ? "#000" : "#fff",
                  border: game.costAmount > 0 ? "1px solid rgba(255,255,255,0.2)" : "none",
                  backdropFilter: "blur(12px)", letterSpacing: "0.05em", textTransform: "uppercase"
                }}>
                  {game.cost}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 style={{
                fontFamily: "var(--font-dela)",
                fontSize: "clamp(48px, 10vw, 120px)",
                color: "#fff", marginBottom: 32,
                lineHeight: 0.85, textTransform: "uppercase",
              }}>
                {game.title}
              </h1>
            </Reveal>

            <Reveal delay={0.15}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 32, fontSize: 13, fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MapPin size={16} color="#fff" /> {game.location}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock size={16} color="#fff" /> {fmtDate(game.scheduledAt)} · {game.duration}min
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
              <div style={{ display: "flex", flexDirection: "column", gap: 60 }}>
                {game.description && (
                  <Reveal>
                    <div>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>About this game</h2>
                      <p style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "#fff", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
                        {game.description}
                      </p>
                    </div>
                  </Reveal>
                )}

                {rules.length > 0 && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Rules &amp; guidelines</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {rules.map((r, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", marginTop: 10, flexShrink: 0 }} />
                            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                )}

                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 40 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
                      <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>Roster</h2>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                        {filled}/{game.slots} confirmed
                      </span>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 12,
                    }}>
                      {game.players?.map(p => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "12px", borderRadius: 16,
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div style={{
                            width: 38, height: 38, borderRadius: "50%",
                            background: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, color: "#000", fontSize: 14, flexShrink: 0,
                          }}>
                            {p.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{
                              fontSize: 14, fontWeight: 700, color: "#fff",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {p.name}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              {p.tier && <TierBadge tier={p.tier} score={p.reputationScore} size="xs" />}
                              {p.userId === game.organizerId && (
                                <span style={{ fontSize: 9.5, color: "#a1a1aa", fontWeight: 700, letterSpacing: "0.06em" }}>
                                  ORGANIZER
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <Star size={12} fill="#fff" color="#fff" />
                            <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>
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
                            padding: "12px", borderRadius: 16,
                            border: "1px dashed rgba(255,255,255,0.15)",
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Open spot</span>
                        </div>
                      ))}

                      {game.slotsLeft > 4 && (
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "12px", borderRadius: 16,
                          background: "rgba(255,255,255,0.02)",
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            +{game.slotsLeft - 4} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* How the host collects the entry fee. Absent on free games. */}
                {game.hostPayment && (
                  <Reveal delay={0.06}>
                    <HostPaymentCard payment={game.hostPayment} />
                  </Reveal>
                )}

                {/* Host's own record of who has paid them. */}
                {isOrganizer && game.hostPayment && (
                  <Reveal delay={0.06}>
                    <HostPaymentRoster
                      gameId={game.id}
                      players={(game.players ?? []).map(pl => ({ userId: pl.userId, name: pl.name, paymentStatus: pl.paymentStatus }))}
                    />
                  </Reveal>
                )}
              </div>

              {/* Right sidebar */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                {/* Organizer */}
                <Reveal>
                  <div>
                    <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Organizer</h2>
                    <Link href={`/profile/${game.organizerId}`} style={{ display: "flex", alignItems: "center", gap: 16, textDecoration: "none", cursor: "pointer" }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, color: "#000", fontSize: 16, flexShrink: 0,
                      }}>
                        {game.organizerName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: "#fff", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {game.organizerName}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <Star size={12} fill="#fff" color="#fff" />
                          <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>
                            {game.organizerRating?.toFixed(1) ?? "—"}
                          </span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                            · {game.organizerGames ?? 0} games
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                </Reveal>

                {/* Slots */}
                <Reveal>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Spots filled</span>
                      <span style={{ color: "#fff" }}>{filled}/{game.slots}</span>
                    </div>
                    <div style={{
                      height: 4, background: "rgba(255,255,255,0.1)",
                      overflow: "hidden",
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          height: "100%",
                          background: "#fff",
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      {isFull ? (
                        <span style={{ color: "#fff", fontWeight: 700 }}>Game is full</span>
                      ) : (
                        <span style={{ color: "#fff", fontWeight: 700 }}>
                          {game.slotsLeft} spot{game.slotsLeft !== 1 ? "s" : ""} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </Reveal>

                {/* Location */}
                {game.address && (
                  <Reveal>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
                      <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Location</h2>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>
                        <MapPin size={16} color="#fff" style={{ flexShrink: 0, marginTop: 4 }} />
                        <span>{game.address}</span>
                      </div>
                      {hasMapTarget(game) && (
                        <a
                          href={mapsHref(game)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 8, marginTop: 20,
                            padding: "10px 16px", borderRadius: 100, textDecoration: "none",
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                            transition: "background 300ms ease"
                          }}
                        >
                          <Navigation size={14} /> Get directions
                        </a>
                      )}
                    </div>
                  </Reveal>
                )}

                {/* Joined a paid game — the fee is still outstanding and settling
                    it is the player's next move, not something joining completed. */}
                {!isOrganizer && isJoined && game.hostPayment && (
                  <PayHostPanel
                    payment={game.hostPayment}
                    gameId={game.id}
                    myPaymentStatus={game.players?.find(pl => pl.userId === user?.id)?.paymentStatus}
                    whatsAppHref={joinedWhatsApp}
                  />
                )}

                {/* Player actions */}
                {!isOrganizer && user && (
                  isJoined ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {canCancel ? (
                        <button
                          disabled={leave.isPending}
                          onClick={() => setShowLeaveModal(true)}
                          style={{
                            width: "100%", height: 56, borderRadius: 100,
                            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                            background: "transparent",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.1)",
                            cursor: leave.isPending ? "not-allowed" : "pointer",
                            opacity: leave.isPending ? 0.7 : 1,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                          }}
                        >
                          {leave.isPending ? "Leaving…" : "Leave game"}
                        </button>
                      ) : (
                        <div style={{
                          padding: "16px", borderRadius: 16,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          textAlign: "center",
                        }}>
                          <p style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                            {CANCEL_CUTOFF_MESSAGE}
                          </p>
                        </div>
                      )}
                      {joinedWhatsApp && (
                        <a
                          href={joinedWhatsApp}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            height: 56, borderRadius: 100,
                            background: "#fff",
                            color: "#000",
                            border: "none",
                            textDecoration: "none",
                            fontSize: 14, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                          }}
                        >
                          <MessageCircle size={16} fill="#000" /> Message organiser
                        </a>
                      )}
                    </div>
                  ) : joinable ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                          style={{ marginTop: 2, accentColor: "#fff", width: 16, height: 16, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                          I agree that cancellations are only allowed up to {CANCEL_CUTOFF_MIN} minutes before the start time
                        </span>
                      </label>
                      <Magnetic strength={6}>
                        <button
                          disabled={!agreed || join.isPending}
                          onClick={isFull ? () => join.mutate(game.id) : handleJoin}
                          style={{
                            width: "100%", height: 56, borderRadius: 100,
                            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                            border: isFull ? "1px solid rgba(255,255,255,0.1)" : "none",
                            background: (!agreed || isFull)
                              ? "transparent"
                              : "#fff",
                            color: (!agreed || isFull) ? "rgba(255,255,255,0.55)" : "#000",
                            cursor: (!agreed || join.isPending) ? "not-allowed" : "pointer",
                            opacity: (!agreed || join.isPending) ? 0.5 : 1,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                            transition: "all 300ms ease"
                          }}
                        >
                          {join.isPending
                            ? "Joining…"
                            : isFull
                              ? "Join waitlist"
                              : game.costAmount > 0
                                ? "Join · Pay host directly"
                                : "Join game · Free"}
                        </button>
                      </Magnetic>
                    </div>
                  ) : (
                    <div style={{
                      height: 52, borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 700,
                    }}>
                      {game.status === "completed" ? "This game is over" : "This game is closed"}
                    </div>
                  )
                )}

                {!user && (
                  <Magnetic strength={6}>
                    <Link
                      href="/login"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        height: 56, borderRadius: 100,
                        fontSize: 14, fontWeight: 700,
                        background: "#fff",
                        color: "#000", textDecoration: "none",
                        textTransform: "uppercase", letterSpacing: "0.05em",
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
                      padding: "16px", borderRadius: 16,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      textAlign: "center",
                      fontSize: 13, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"
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
                              width: "100%", height: 56, borderRadius: 100,
                              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                              background: "#fff", color: "#000", border: "none",
                              cursor: completing ? "not-allowed" : "pointer",
                              opacity: completing ? 0.7 : 1,
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}
                          >
                            {completing ? "Completing…" : "Mark as complete"}
                          </button>
                        )}
                        {hostCanCancel ? (
                          <button
                            onClick={() => setShowCancelModal(true)}
                            disabled={cancelling}
                            style={{
                              width: "100%", height: 56, borderRadius: 100,
                              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                              background: "transparent",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.1)",
                              cursor: cancelling ? "not-allowed" : "pointer",
                              opacity: cancelling ? 0.7 : 1,
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}
                          >
                            {cancelling ? "Cancelling…" : "Cancel game"}
                          </button>
                        ) : (
                          <p style={{
                            padding: "12px 16px", borderRadius: 14,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            textAlign: "center", fontSize: 12.5, lineHeight: 1.5,
                            color: "rgba(255,255,255,0.6)",
                          }}>
                            This game cannot be cancelled because players have already joined. Please contact an administrator.
                          </p>
                        )}
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

        {/* Premium Cancel Modal */}
        <AnimatePresence>
          {showCancelModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              <motion.div
                initial={{ y: 20, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: "rgba(15, 15, 15, 0.9)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "40px",
                  maxWidth: 480,
                  width: "90%",
                  textAlign: "center",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)",
                }}
              >
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#fff", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Cancel this game?
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 32 }}>
                  This action cannot be undone. All players will be notified that the game is cancelled.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    onClick={executeCancel}
                    style={{
                      width: "100%", height: 56, borderRadius: 100,
                      fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                      background: "#ff4444", color: "#000", border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    Yes, Cancel Game
                  </button>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    style={{
                      width: "100%", height: 56, borderRadius: 100,
                      fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                      background: "transparent", color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    Keep Game
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLeaveModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              <motion.div
                initial={{ y: 20, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: "rgba(15, 15, 15, 0.9)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "40px",
                  maxWidth: 480,
                  width: "90%",
                  textAlign: "center",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)",
                }}
              >
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#fff", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Leave this game?
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 32 }}>
                  Are you sure you want to give up your spot? If there is a waitlist, the next person will automatically take your place.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    onClick={() => {
                      setShowLeaveModal(false);
                      leave.mutate(game.id);
                    }}
                    style={{
                      width: "100%", height: 56, borderRadius: 100,
                      fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                      background: "#ff4444", color: "#000", border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    Yes, Leave Game
                  </button>
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    style={{
                      width: "100%", height: 56, borderRadius: 100,
                      fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                      background: "transparent", color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    Stay in Game
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      <style>{`
        @media (max-width: 900px) {
          .game-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
