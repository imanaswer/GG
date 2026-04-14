"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2, Trophy, MapPin, Calendar, Users, DollarSign, Target, Award, ChevronRight } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img } from "@/components/Shared";
import { Skeleton } from "@/components/ui";
import { useEvent, useRegisterEvent } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Tab = "overview" | "format" | "prizes" | "schedule";

function T({ id, active, onClick, label }: { id: Tab; active: Tab; onClick: (t: Tab) => void; label: string }) {
  return <button onClick={() => onClick(id)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: active === id ? "#1c1c1c" : "transparent", color: active === id ? "#fff" : "#6b7280", transition: "all 0.15s", whiteSpace: "nowrap" }}>{label}</button>;
}
function Divider() { return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "14px 0" }} />; }

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "Live";
  const isOpen = status === "Registration Open";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 100, fontSize: 12, fontWeight: 700, background: isLive ? "rgba(239,68,68,0.9)" : isOpen ? "rgba(34,197,94,0.9)" : "rgba(107,114,128,0.8)", color: "#fff" }}>
      {isLive && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "pulse 1s infinite" }} />}
      {status}
    </span>
  );
}

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event, isLoading, error } = useEvent(id);
  const { user } = useAuth();
  const reg = useRegisterEvent();
  const [tab, setTab] = useState<Tab>("overview");
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName]   = useState("");

  if (isLoading) return <div style={{ minHeight: "100vh", background: "#080808" }}><NavBar /><Skeleton style={{ height: 400, borderRadius: 0 }} /></div>;
  if (error || !event) return <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column" }}><NavBar /><div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}><p style={{ color: "#fff", fontSize: 20 }}>Event not found</p><Link href="/events" style={{ padding: "10px 22px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 600 }}>Back to Events</Link></div></div>;

  const spotsLeft = event.maxParticipants - event.participants;
  const pct = Math.round((event.participants / event.maxParticipants) * 100);
  const regClosed = new Date(event.registrationDeadline) < new Date();
  const isLive = event.status === "Live";
  const isTeam = event.type === "Tournament" || event.type === "League" || event.type === "Festival";

  const handleRegister = () => {
    if (!user)      { toast.error("Please sign in to register"); return; }
    if (regClosed)  { toast.error("Registration deadline has passed"); return; }
    if (spotsLeft <= 0) { toast.error("Event is full"); return; }
    if (isTeam) { setShowModal(true); return; }
    reg.mutate({ eventId: id });
  };
  const handleShare = () => { navigator.clipboard?.writeText(window.location.href); toast.success("Event link copied! Share with your team to register together."); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await reg.mutateAsync({ eventId: id, teamName: teamName.trim() || undefined });
    setShowModal(false); setTeamName("");
    toast.success("Registration submitted! We'll send confirmation details shortly.");
  };

  const sideInfo = [
    { Icon: DollarSign, label: "Entry Fee",     value: event.entryFee, big: true },
    { Icon: Trophy,     label: "Prize Pool",    value: event.prizePool, big: true, accent: true },
    { Icon: Users,      label: "Participants",  value: `${event.participants}/${event.maxParticipants}` },
    { Icon: MapPin,     label: "Location",      value: event.address, sub: `${event.distance} away` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      {isLive && (
        <div style={{ background: "rgba(239,68,68,0.1)", borderBottom: "1px solid rgba(239,68,68,0.25)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>🔴 This event is happening LIVE right now at {event.location}</span>
        </div>
      )}
      {/* Sub-header */}
      <div style={{ position: "sticky", top: 60, zIndex: 40, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/events" style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", textDecoration: "none", fontSize: 13 }}><ArrowLeft size={16} />Event Details</Link>
          <button onClick={handleShare} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "inherit" }}><Share2 size={15} />Share</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}>
        {/* Hero Card */}
        <div style={{ margin: "28px 0", background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ position: "relative", height: 400, overflow: "hidden" }}>
            <Img src={event.imageUrl} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, transparent 100%)" }} />
            {/* Prize pool badge top-right */}
            <div style={{ position: "absolute", top: 20, right: 20, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#d97706)", fontWeight: 900, fontSize: 16, color: "#000", boxShadow: "0 6px 24px rgba(245,158,11,0.4)" }}>
              <Trophy size={18} />{event.prizePool}
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 28px 28px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: "rgba(230,57,70,0.9)", color: "#fff" }}>{event.sport}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", textTransform: "capitalize" }}>{event.type}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>{event.difficulty}</span>
                <StatusBadge status={event.status} />
              </div>
              <h1 style={{ fontSize: "clamp(22px, 4vw, 40px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 14 }}>{event.title}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                <span style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6 }}><Calendar size={14} color="#e63946" />{event.date}</span>
                <span style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6 }}><MapPin size={14} color="#e63946" />{event.location}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 28 }} className="detail-grid">
          {/* Left */}
          <div>
            {/* Registration progress */}
            <div style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 12, padding: "20px 22px", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Registration Status</h3>
                  <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{event.participants} registered · {spotsLeft} spots left</p>
                </div>
                <div style={{ padding: "6px 14px", borderRadius: 100, background: pct >= 80 ? "rgba(230,57,70,0.18)" : "rgba(255,255,255,0.06)", color: pct >= 80 ? "#e63946" : "#9ca3af", fontWeight: 800, fontSize: 13 }}>
                  {pct}% Full
                </div>
              </div>
              <div style={{ height: 10, background: "#1c1c1c", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#e63946,#f87171)", borderRadius: 99, transition: "width 1s ease" }} />
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20, flexWrap: "wrap" }}>
              <T id="overview" active={tab} onClick={setTab} label="Overview" />
              <T id="format"   active={tab} onClick={setTab} label="Format" />
              <T id="prizes"   active={tab} onClick={setTab} label="Prizes" />
              <T id="schedule" active={tab} onClick={setTab} label="Schedule" />
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}><Award size={18} color="#e63946" />About This Event</h3>
                  <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.8 }}>{event.description}</p>
                </div>
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}><Target size={17} color="#e63946" />Requirements</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {event.requirements.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e63946", flexShrink: 0, marginTop: 6, display: "inline-block" }} />
                        <span style={{ fontSize: 14, color: "#9ca3af" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Format */}
            {tab === "format" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {event.format.map((item, i) => (
                  <div key={i} style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(230,57,70,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontWeight: 900, color: "#e63946", fontSize: 13 }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "#e5e7eb", paddingTop: 5 }}>{item}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Prizes */}
            {tab === "prizes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {event.prizes.map((prize, i) => (
                  <div key={i} style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, transition: "border-color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(230,57,70,0.45)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(230,57,70,0.18)"}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Trophy size={22} color="#fff" />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{prize}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Schedule */}
            {tab === "schedule" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {event.schedule.map((item, i) => (
                  <div key={i} style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(230,57,70,0.15)", flexShrink: 0 }}>
                      <p style={{ fontWeight: 800, color: "#e63946", fontSize: 13 }}>{item.day}</p>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <Calendar size={13} color="#e63946" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.time}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#9ca3af" }}>{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 14, padding: "22px 20px", position: "sticky", top: 120 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 20 }}>Event Information</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {sideInfo.map(({ Icon, label, value, big, accent, sub }, i) => (
                  <div key={label}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < sideInfo.length - 1 ? 14 : 0 }}>
                      <Icon size={18} color="#e63946" style={{ marginTop: 3, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{label}</p>
                        {big ? <p style={{ fontSize: 24, fontWeight: 900, color: accent ? "#eab308" : "#e63946", letterSpacing: "-0.03em" }}>{value}</p> : <p style={{ fontSize: 14, color: "#9ca3af" }}>{value}</p>}
                        {sub && <p style={{ fontSize: 12, color: "#e63946", marginTop: 2 }}>{sub}</p>}
                      </div>
                    </div>
                    {i < sideInfo.length - 1 && <Divider />}
                  </div>
                ))}
              </div>

              {!regClosed && spotsLeft > 0 && (
                <div style={{ margin: "16px 0", padding: "10px 14px", borderRadius: 9, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
                  <p style={{ fontSize: 12, color: "#eab308", fontWeight: 700 }}>⏰ Deadline: {new Date(event.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                {!isLive ? (
                  <button onClick={handleRegister} disabled={regClosed || spotsLeft <= 0 || reg.isPending} style={{ width: "100%", height: 50, borderRadius: 11, fontSize: 15, fontWeight: 800, background: (regClosed || spotsLeft <= 0) ? "rgba(255,255,255,0.06)" : "#e63946", color: (regClosed || spotsLeft <= 0) ? "#6b7280" : "#fff", border: "none", cursor: (regClosed || spotsLeft <= 0 || reg.isPending) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: (!regClosed && spotsLeft > 0) ? "0 4px 18px rgba(230,57,70,0.3)" : "none" }}>
                    {reg.isPending ? "Registering…" : regClosed ? "Registration Closed" : spotsLeft <= 0 ? "Event Full" : <>Register Your Team <ChevronRight size={17} /></>}
                  </button>
                ) : (
                  <div style={{ padding: "14px", borderRadius: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", textAlign: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>🔴 Event is Live Now!</p>
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>Come watch at {event.location}</p>
                  </div>
                )}
                <button onClick={handleShare} style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Share2 size={15} />Share Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team registration modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "28px", width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>Register for Event</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>{event.title}</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Team Name (optional)</label>
                <input placeholder="e.g. Thunder Hawks" value={teamName} onChange={e => setTeamName(e.target.value)} style={{ height: 42, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor="#e63946"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              {event.entryFeeAmount > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)" }}>
                  <p style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>Entry Fee: {event.entryFee}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>Fee is payable at the venue on event day.</p>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={reg.isPending} style={{ flex: 1, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: reg.isPending ? "not-allowed" : "pointer", opacity: reg.isPending ? 0.7 : 1, fontFamily: "inherit" }}>
                  {reg.isPending ? "Registering…" : "Confirm Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.detail-grid{@media(max-width:768px){grid-template-columns:1fr!important}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
