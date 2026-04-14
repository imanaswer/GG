"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2, Star, MapPin, Calendar, Users, Target, DollarSign, Clock, ChevronRight, Check, Award } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img } from "@/components/Shared";
import { Skeleton } from "@/components/ui";
import { useCamp, useRegisterCamp } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Tab = "overview" | "schedule" | "coaches" | "reviews";

function T({ id, active, onClick, label }: { id: Tab; active: Tab; onClick: (t: Tab) => void; label: string }) {
  return <button onClick={() => onClick(id)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: active === id ? "#1c1c1c" : "transparent", color: active === id ? "#fff" : "#6b7280", transition: "all 0.15s" }}>{label}</button>;
}

function Divider() { return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "16px 0" }} />; }

export default function CampDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: camp, isLoading, error } = useCamp(id);
  const { user } = useAuth();
  const reg = useRegisterCamp();
  const [tab, setTab] = useState<Tab>("overview");
  const [showModal, setShowModal] = useState(false);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge]   = useState("");

  if (isLoading) return <div style={{ minHeight: "100vh", background: "#080808" }}><NavBar /><Skeleton style={{ height: 380, borderRadius: 0 }} /></div>;
  if (error || !camp) return <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column" }}><NavBar /><div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}><p style={{ color: "#fff", fontSize: 20 }}>Camp not found</p><Link href="/camps" style={{ padding: "10px 22px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 600 }}>Back to Camps</Link></div></div>;

  const spotsLeft = camp.maxParticipants - camp.participants;
  const pct = Math.round((camp.participants / camp.maxParticipants) * 100);
  const daysLeft = Math.max(0, Math.floor((new Date(camp.registrationDeadline).getTime() - Date.now()) / 86400000));
  const regClosed = daysLeft === 0;

  const handleRegister = () => {
    if (!user) { toast.error("Please sign in to register"); return; }
    if (spotsLeft <= 0 || regClosed) return;
    setShowModal(true);
  };
  const handleShare = () => { navigator.clipboard?.writeText(window.location.href); toast.success("Camp link copied! Share with friends to join together."); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) return;
    await reg.mutateAsync({ campId: id, childName: childName.trim(), childAge: parseInt(childAge) || 10 });
    setShowModal(false); setChildName(""); setChildAge("");
    toast.success("Registration submitted! We'll contact you within 24 hours with payment details.");
  };

  const sideInfo = [
    { Icon: DollarSign, label: "Total Price",   value: camp.priceDisplay, sub: "All-inclusive pricing" },
    { Icon: Calendar,   label: "Duration",      value: camp.duration, sub: camp.dates },
    { Icon: Users,      label: "Age Group",     value: camp.ageGroup, sub: null },
    { Icon: Target,     label: "Skill Level",   value: camp.skillLevel, sub: null },
    { Icon: MapPin,     label: "Location",      value: camp.address, sub: `${camp.distance} away` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      {/* Sticky sub-header */}
      <div style={{ position: "sticky", top: 60, zIndex: 40, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/camps" style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", textDecoration: "none", fontSize: 13 }}><ArrowLeft size={16} />Camp Details</Link>
          <button onClick={handleShare} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "inherit" }}><Share2 size={15} />Share</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}>
        {/* Hero Card */}
        <div style={{ margin: "28px 0", background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ position: "relative", height: 380, overflow: "hidden" }}>
            <Img src={camp.imageUrl} alt={camp.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, transparent 100%)" }} />
            {/* Rating badge */}
            <div style={{ position: "absolute", top: 20, right: 20, display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 100, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Star size={16} color="#e63946" fill="#e63946" />
              <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>{camp.rating}</span>
              <span style={{ fontSize: 13, color: "#9ca3af" }}>({camp.reviews})</span>
            </div>
            {/* Only X spots left */}
            {spotsLeft <= 10 && spotsLeft > 0 && (
              <div style={{ position: "absolute", top: 20, left: 20, padding: "7px 16px", borderRadius: 100, background: "#e63946", fontWeight: 800, color: "#fff", fontSize: 13, boxShadow: "0 4px 16px rgba(230,57,70,0.4)" }}>
                Only {spotsLeft} spots left!
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 28px 28px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: "rgba(230,57,70,0.9)", color: "#fff" }}>{camp.sport}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>{camp.skillLevel}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>{camp.duration}</span>
              </div>
              <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>{camp.title}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                <span style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6 }}><Calendar size={14} color="#e63946" />{camp.dates}</span>
                <span style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6 }}><MapPin size={14} color="#e63946" />{camp.location}</span>
                <span style={{ fontSize: 13, color: "#9ca3af", display: "flex", gap: 6 }}><Users size={14} color="#e63946" />{camp.ageGroup}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 28 }} className="detail-grid">
          {/* Left column */}
          <div>
            {/* Registration progress */}
            <div style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 12, padding: "20px 22px", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Enrollment Status</h3>
                  <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{camp.participants} enrolled · {spotsLeft} spots left</p>
                </div>
                <div style={{ padding: "6px 14px", borderRadius: 100, background: spotsLeft <= 5 ? "rgba(230,57,70,0.18)" : "rgba(255,255,255,0.06)", color: spotsLeft <= 5 ? "#e63946" : "#9ca3af", fontWeight: 800, fontSize: 13 }}>
                  {pct}% Full
                </div>
              </div>
              <div style={{ height: 10, background: "#1c1c1c", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #e63946, #f87171)", borderRadius: 99, transition: "width 1s ease" }} />
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20 }}>
              <T id="overview" active={tab} onClick={setTab} label="Overview" />
              <T id="schedule" active={tab} onClick={setTab} label="Schedule" />
              <T id="coaches"  active={tab} onClick={setTab} label="Coaches" />
              <T id="reviews"  active={tab} onClick={setTab} label="Reviews" />
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
                    <Award size={18} color="#e63946" />About This Camp
                  </h3>
                  <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.8 }}>{camp.description}</p>
                </div>
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 14 }}>What's Included</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {camp.included.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><Check size={11} color="#4ade80" /></div>
                        <span style={{ fontSize: 14, color: "#d1d5db" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
                    <Target size={17} color="#e63946" />What to Bring
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {camp.whatToBring.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e63946", flexShrink: 0, marginTop: 6, display: "inline-block" }} />
                        <span style={{ fontSize: 14, color: "#9ca3af" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule */}
            {tab === "schedule" && (
              <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Daily Schedule</h3>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>This schedule repeats for all {camp.duration.toLowerCase()} of the camp</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {camp.dailySchedule.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 10, background: "#1c1c1c" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 150, flexShrink: 0 }}>
                        <Clock size={13} color="#e63946" /><span style={{ fontSize: 12, fontWeight: 700, color: "#e63946" }}>{item.time}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#e5e7eb" }}>{item.activity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coaches */}
            {tab === "coaches" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {camp.coaches.map((coach, i) => (
                  <div key={i} style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#e63946,rgba(230,57,70,0.5))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                      {coach.name.split(" ").pop()?.[0] ?? "C"}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{coach.name}</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af" }}>{coach.experience}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: "rgba(230,57,70,0.12)", color: "#e63946" }}>{coach.specialty}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews/Testimonials */}
            {tab === "reviews" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {camp.testimonials.map((t, i) => (
                  <div key={i} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#e63946,rgba(230,57,70,0.5))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff" }}>{t.name[0]}</div>
                        <div><p style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{t.name}</p><p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{t.age} years old</p></div>
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={14} color="#e63946" fill="#e63946" />)}
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7, fontStyle: "italic" }}>"{t.text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 14, padding: "22px 20px", position: "sticky", top: 120 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 20 }}>Camp Information</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {sideInfo.map(({ Icon, label, value, sub }, i) => (
                  <div key={label}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < sideInfo.length - 1 ? 14 : 0 }}>
                      <Icon size={18} color="#e63946" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{label}</p>
                        {label === "Total Price" ? <p style={{ fontSize: 28, fontWeight: 900, color: "#e63946", letterSpacing: "-0.04em" }}>{value}</p> : <p style={{ fontSize: 14, color: "#9ca3af" }}>{value}</p>}
                        {sub && <p style={{ fontSize: 12, color: label === "Location" ? "#e63946" : "#6b7280", marginTop: 2 }}>{sub}</p>}
                      </div>
                    </div>
                    {i < sideInfo.length - 1 && <Divider />}
                  </div>
                ))}
              </div>

              {daysLeft > 0 && !regClosed && (
                <div style={{ margin: "16px 0 20px", padding: "10px 14px", borderRadius: 9, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
                  <p style={{ fontSize: 12, color: "#eab308", fontWeight: 700 }}>⏰ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to register</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                <button onClick={handleRegister} disabled={spotsLeft <= 0 || regClosed || reg.isPending} style={{ width: "100%", height: 50, borderRadius: 11, fontSize: 15, fontWeight: 800, background: (spotsLeft <= 0 || regClosed) ? "rgba(255,255,255,0.06)" : "#e63946", color: (spotsLeft <= 0 || regClosed) ? "#6b7280" : "#fff", border: "none", cursor: (spotsLeft <= 0 || regClosed || reg.isPending) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: (spotsLeft > 0 && !regClosed) ? "0 4px 18px rgba(230,57,70,0.3)" : "none" }}>
                  {reg.isPending ? "Registering…" : spotsLeft <= 0 ? "Camp Full" : regClosed ? "Registration Closed" : <>Register Now <ChevronRight size={17} /></>}
                </button>
                <button onClick={handleShare} style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Share2 size={15} />Share Camp
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Questions? Contact us</p>
                <a href={`tel:${camp.organizerContact}`} style={{ fontSize: 13, color: "#e63946", fontWeight: 600, textDecoration: "none" }}>{camp.organizerContact}</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "28px", width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>Register for Camp</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>{camp.title}</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Child's Full Name *</label>
                <input placeholder="e.g. Arjun Kumar" value={childName} onChange={e => setChildName(e.target.value)} required style={{ height: 42, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor="#e63946"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Child's Age *</label>
                <input type="number" min="4" max="22" placeholder="e.g. 12" value={childAge} onChange={e => setChildAge(e.target.value)} required style={{ height: 42, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }} onFocus={e => e.target.style.borderColor="#e63946"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)" }}>
                <p style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>Fee: {camp.priceDisplay}</p>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Payment collected at venue on Day 1. Bring printed confirmation.</p>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={reg.isPending} style={{ flex: 1, height: 46, borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#e63946", color: "#fff", border: "none", cursor: reg.isPending ? "not-allowed" : "pointer", opacity: reg.isPending ? 0.7 : 1, fontFamily: "inherit" }}>
                  {reg.isPending ? "Submitting…" : "Confirm Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.detail-grid{@media(max-width:768px){grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
