"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Share2, MessageCircle } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img, SlotBar, SkillBadge, SportBadge, fmtDate } from "@/components/Shared";
import { Skeleton } from "@/components/ui";
import { useGame, useJoinGame, useLeaveGame } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from "@/lib/razorpay";
import { useQueryClient } from "@tanstack/react-query";

export default function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const { data: game, isLoading, error } = useGame(id);
  const { user } = useAuth();
  const join  = useJoinGame();
  const leave = useLeaveGame();
  const qc = useQueryClient();
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <Skeleton style={{ height: 300, borderRadius: 0 }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[200, 160, 180].map(h => <Skeleton key={h} style={{ height: h, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[120, 100, 80].map(h => <Skeleton key={h} style={{ height: h, borderRadius: 12 }} />)}
        </div>
      </div>
    </div>
  );

  if (error || !game) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#fff", fontSize: 20 }}>Game not found</p>
        <Link href="/play" style={{ padding: "10px 22px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 600 }}>Back to games</Link>
      </div>
    </div>
  );

  const isFull      = game.slotsLeft === 0 || game.status === "full";
  const isOrganizer = user?.id === game.organizerId;
  const isJoined    = game.players?.some(p => p.userId === user?.id);
  const rules       = Array.isArray(game.rules) ? game.rules : [];
  const filled      = game.slots - game.slotsLeft;
  const isPast      = new Date(game.scheduledAt).getTime() + game.duration * 60000 < Date.now();

  const handleComplete = async () => {
    if (!confirm("Mark this game as complete and record attendance?")) return;
    setCompleting(true);
    const r = await fetch(`/api/games/${game.id}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attendance: {} }) });
    setCompleting(false);
    if (r.ok) toast.success("Game marked complete! Attendance recorded.");
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
    toast.success("Link copied!");
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
      toast.success("Payment successful! You've joined the game. 🎉");
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
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />

      {/* Hero */}
      <div style={{ position: "relative", height: 320, overflow: "hidden" }}>
        <Img src={game.imageUrl} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.5) 45%, transparent 100%)" }} />
        <Link href="/play" style={{ position: "absolute", top: 20, left: 20, width: 38, height: 38, borderRadius: 9, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#fff" }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8 }}>
          <button onClick={handleShare} style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none", cursor: "pointer" }}>
            <Share2 size={16} />
          </button>
          <button onClick={handleWhatsApp} style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(37,211,102,0.85)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none", cursor: "pointer" }} title="Share on WhatsApp">
            <MessageCircle size={16} />
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 24, left: 24, right: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            <SportBadge sport={game.sport} />
            <SkillBadge level={game.skillLevel} />
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: game.costAmount === 0 ? "rgba(34,197,94,0.85)" : "rgba(0,0,0,0.6)", color: "#fff", border: game.costAmount > 0 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>{game.cost}</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>{game.title}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6, alignItems: "center" }}><span>📍</span><span>{game.location}</span></div>
            <div style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6, alignItems: "center" }}><span>🕐</span><span>{fmtDate(game.scheduledAt)} · {game.duration}min</span></div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 290px", gap: 28 }} className="game-grid">
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {game.description && (
              <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>About This Game</h2>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7 }}>{game.description}</p>
              </div>
            )}

            {rules.length > 0 && (
              <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Rules & Guidelines</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rules.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle size={15} color="#e63946" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: "#9ca3af" }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
                Players Joined
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>({filled}/{game.slots})</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {game.players?.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: "#1c1c1c" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 13, flexShrink: 0 }}>
                      {p.name[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      {p.userId === game.organizerId && <p style={{ fontSize: 10, color: "#e63946" }}>Organizer</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto", flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth={1}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      <span style={{ fontSize: 11, color: "#fff" }}>{p.rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.min(game.slotsLeft, 4) }).map((_, i) => (
                  <div key={`e${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 12px", borderRadius: 9, border: "1.5px dashed rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 12, color: "#4b5563" }}>Open spot</span>
                  </div>
                ))}
                {game.slotsLeft > 4 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 12px", borderRadius: 9, background: "#1c1c1c" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>+{game.slotsLeft - 4} more open</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Organizer */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Organizer</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 18, flexShrink: 0 }}>
                  {game.organizerName?.[0] ?? "?"}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{game.organizerName}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth={1}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{game.organizerRating?.toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>· {game.organizerGames} games</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slots */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: "#9ca3af" }}>Spots filled</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{filled}/{game.slots}</span>
              </div>
              <SlotBar filled={filled} total={game.slots} />
              <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                {isFull
                  ? <><AlertCircle size={13} color="#ef4444" /><span style={{ color: "#ef4444", fontWeight: 600 }}>Game is full</span></>
                  : <><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} /><span style={{ color: "#4ade80", fontWeight: 600 }}>{game.slotsLeft} spot{game.slotsLeft !== 1 ? "s" : ""} remaining</span></>
                }
              </div>
            </div>

            {/* Location */}
            {game.address && (
              <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Location</h2>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#9ca3af" }}>
                  <span>📍</span><span>{game.address}</span>
                </div>
              </div>
            )}

            {/* Player Actions */}
            {!isOrganizer && user && (
              isJoined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button disabled={leave.isPending} onClick={() => leave.mutate(game.id)} style={{ width: "100%", height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)", cursor: leave.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: leave.isPending ? 0.7 : 1 }}>
                    {leave.isPending ? "Leaving…" : "Leave Game"}
                  </button>
                  {/* WhatsApp contact organizer */}
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Hey! I joined ${game.title} — are we still on?`)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40, borderRadius: 10, background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.3)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                    <MessageCircle size={14} />Message Organiser
                  </a>
                </div>
              ) : (
                <button disabled={join.isPending || paying} onClick={isFull ? () => join.mutate(game.id) : handleJoin} style={{ width: "100%", height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: isFull ? "transparent" : "#e63946", color: isFull ? "#9ca3af" : "#fff", border: isFull ? "1px solid rgba(255,255,255,0.12)" : "none", cursor: (join.isPending || paying) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (join.isPending || paying) ? 0.7 : 1, boxShadow: isFull ? "none" : "0 3px 14px rgba(230,57,70,0.25)" }}>
                  {(join.isPending || paying) ? (paying ? "Processing payment…" : "Joining…") : isFull ? "Join Waitlist" : game.costAmount > 0 ? `Pay ${game.cost} · Join` : "Join Game · Free"}
                </button>
              )
            )}
            {!user && (
              <Link href="/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", textDecoration: "none", boxShadow: "0 3px 14px rgba(230,57,70,0.25)" }}>
                Sign In to Join
              </Link>
            )}

            {/* Organizer Controls */}
            {isOrganizer && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)", textAlign: "center", fontSize: 13, color: "#e63946", fontWeight: 600 }}>
                  ✦ You organized this game
                </div>
                {(game.status === "open" || game.status === "full") && (
                  <>
                    {isPast && (
                      <button onClick={handleComplete} disabled={completing} style={{ width: "100%", height: 42, borderRadius: 10, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: completing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: completing ? 0.7 : 1 }}>
                        {completing ? "Completing…" : "✓ Mark as Complete"}
                      </button>
                    )}
                    <button onClick={handleCancel} disabled={cancelling} style={{ width: "100%", height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: cancelling ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: cancelling ? 0.7 : 1 }}>
                      {cancelling ? "Cancelling…" : "Cancel Game"}
                    </button>
                  </>
                )}
                {game.status === "cancelled" && <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>This game was cancelled</p>}
                {game.status === "completed" && <p style={{ textAlign: "center", fontSize: 13, color: "#4ade80" }}>Game completed ✓</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`@media(max-width:768px){.game-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
