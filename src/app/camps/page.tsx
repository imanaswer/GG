"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Clock, Users, Star, Target, Award, Sparkles, ChevronRight, Calendar, MapPin } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img } from "@/components/Shared";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Skeleton } from "@/components/ui";
import { useCamps, type CampFilters } from "@/hooks/useData";

function spotsLabel(p: number, max: number) {
  const left = max - p;
  if (left <= 0)  return { text: "Full",                  bg: "rgba(239,68,68,0.9)"  };
  if (left <= 5)  return { text: `Only ${left} spots!`,   bg: "rgba(234,179,8,0.9)" };
  return              { text: `${left} spots left`,    bg: "rgba(34,197,94,0.9)"  };
}

export default function CampsPage() {
  const [filters, setFilters] = useState<CampFilters>({});
  const [search, setSearch]   = useState("");
  const { data, isLoading, error } = useCamps({ ...filters, q: search || undefined });
  const featured = data?.filter(c => c.featured) ?? [];
  const regular  = data?.filter(c => !c.featured) ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", padding: "64px 24px", background: "linear-gradient(135deg, rgba(230,57,70,0.18) 0%, #080808 60%)" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 380, height: 380, background: "rgba(230,57,70,0.18)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.28)", color: "#e63946", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            <Sparkles size={14} />Intensive Training Programs
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", marginBottom: 14 }}>
            Transform Your <span style={{ color: "#e63946" }}>Skills</span>
          </h1>
          <p style={{ fontSize: 17, color: "#9ca3af", lineHeight: 1.65 }}>
            Multi-day intensive training camps designed to accelerate your athletic development — for all ages across Kozhikode.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Search + 4 filter dropdowns */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <Search size={18} color="#6b7280" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <Input style={{ paddingLeft: 46, height: 48, fontSize: 15 }} placeholder="Search camps by name, sport, or location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 16 }}>
            {[
              { label: "Sport", Icon: Filter, key: "sport" as keyof CampFilters, opts: [["all","All Sports"],["Basketball","Basketball"],["Football","Football"],["Badminton","Badminton"],["Cricket","Cricket"],["Tennis","Tennis"],["Fitness","Fitness"],["Multi-Sport","Multi-Sport"]] },
              { label: "Skill Level", Icon: Target, key: "skillLevel" as keyof CampFilters, opts: [["all","All Levels"],["Beginner","Beginner"],["Intermediate","Intermediate"],["Advanced","Advanced"],["All Levels","All Levels"]] },
              { label: "Duration", Icon: Clock, key: "duration" as keyof CampFilters, opts: [["all","Any Duration"],["short","1–5 Days"],["medium","6–10 Days"],["long","10+ Days"]] },
              { label: "Age Group", Icon: Users, key: "ageGroup" as keyof CampFilters, opts: [["all","All Ages"],["6–12 years","6–12 years"],["10–16 years","10–16 years"],["12–18 years","12–18 years"],["15–25 years","15–25 years"]] },
            ].map(({ label, Icon, key, opts }) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 5, marginBottom: 7, fontWeight: 500 }}>
                  <Icon size={13} />{label}
                </label>
                <Select onValueChange={v => setFilters(p => ({ ...p, [key]: v === "all" ? undefined : v }))}>
                  <SelectTrigger><SelectValue placeholder={`All ${label}s`} /></SelectTrigger>
                  <SelectContent>{opts.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
            {Array(6).fill(0).map((_,i) => <div key={i} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}><Skeleton style={{ height: 220 }} /><div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}><Skeleton style={{ height: 15, width: "70%" }} /><Skeleton style={{ height: 11, width: "50%" }} /></div></div>)}
          </div>
        )}
        {error && <p style={{ textAlign: "center", padding: "60px 0", color: "#ef4444" }}>Failed to load camps. Please refresh.</p>}

        {!isLoading && !error && (
          <>
            {/* ─── Featured Camps ───────────────────────────────────────── */}
            {featured.length > 0 && (
              <div style={{ marginBottom: 52 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <Award size={22} color="#e63946" />
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Featured Camps</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
                  {featured.map(camp => {
                    const sl = spotsLabel(camp.participants, camp.maxParticipants);
                    return (
                      <Link key={camp.id} href={`/camps/${camp.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ background: "#141414", border: "1px solid rgba(230,57,70,0.4)", borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "transform 0.25s, box-shadow 0.25s" }}
                          onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(-8px)"; d.style.boxShadow = "0 24px 64px rgba(230,57,70,0.22)"; }}
                          onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}>
                          {/* Image */}
                          <div style={{ position: "relative", height: 260, overflow: "hidden" }}>
                            <Img src={camp.imageUrl} alt={camp.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)" }} />
                            {/* Animated featured badge */}
                            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 100, background: "linear-gradient(135deg,#f59e0b,#d97706)", fontSize: 11, fontWeight: 800, color: "#000", boxShadow: "0 2px 12px rgba(245,158,11,0.5)" }}>
                              <Sparkles size={11} />Featured
                            </div>
                            {/* Spots badge */}
                            <div style={{ position: "absolute", top: 14, right: 14, padding: "5px 12px", borderRadius: 100, background: sl.bg, fontSize: 11, fontWeight: 700, color: "#fff" }}>
                              {sl.text}
                            </div>
                            <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
                              <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(230,57,70,0.9)", color: "#fff" }}>{camp.sport}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(0,0,0,0.6)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>{camp.duration}</span>
                              </div>
                              <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{camp.title}</h3>
                            </div>
                          </div>
                          {/* Content */}
                          <div style={{ padding: "18px 20px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <Star size={15} color="#e63946" fill="#e63946" />
                                <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{camp.rating}</span>
                                <span style={{ fontSize: 13, color: "#6b7280" }}>({camp.reviews})</span>
                              </div>
                              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "#9ca3af", fontWeight: 600 }}>{camp.skillLevel}</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                              {[{Icon:Calendar,v:camp.dates},{Icon:MapPin,v:camp.location},{Icon:Users,v:`${camp.ageGroup} • ${camp.participants}/${camp.maxParticipants} enrolled`}].map(({Icon,v})=>(
                                <div key={v} style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#9ca3af" }}><Icon size={14} color="#e63946" style={{flexShrink:0}}/><span>{v}</span></div>
                              ))}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                              {camp.highlights.map((h,i) => (
                                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#9ca3af" }}>
                                  <span style={{ width:6,height:6,borderRadius:"50%",background:"#e63946",flexShrink:0,display:"inline-block" }}/>{h}
                                </div>
                              ))}
                            </div>
                            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                              <div>
                                <p style={{ fontSize:11,color:"#6b7280" }}>Total Price</p>
                                <p style={{ fontSize:28,fontWeight:900,color:"#e63946",letterSpacing:"-0.04em" }}>{camp.priceDisplay}</p>
                              </div>
                              <div style={{ display:"flex",alignItems:"center",gap:7,padding:"11px 22px",borderRadius:10,background:"#e63946",color:"#fff",fontSize:14,fontWeight:700,boxShadow:"0 4px 16px rgba(230,57,70,0.3)" }}>
                                Register Now<ChevronRight size={16}/>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── All Camps ─────────────────────────────────────────────── */}
            {regular.length > 0 && (
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 24 }}>All Camps</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
                  {regular.map(camp => {
                    const sl = spotsLabel(camp.participants, camp.maxParticipants);
                    return (
                      <Link key={camp.id} href={`/camps/${camp.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s", display: "flex", flexDirection: "column", height: "100%" }}
                          onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(-5px)"; d.style.borderColor = "rgba(230,57,70,0.35)"; }}
                          onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(0)"; d.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                          <div style={{ position: "relative", height: 200, overflow: "hidden", flexShrink: 0 }}>
                            <Img src={camp.imageUrl} alt={camp.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />
                            <div style={{ position: "absolute", top: 12, right: 12, padding: "3px 10px", borderRadius: 100, background: sl.bg, fontSize: 11, fontWeight: 700, color: "#fff" }}>{sl.text}</div>
                            <div style={{ position: "absolute", bottom: 12, left: 12 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(0,0,0,0.65)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>{camp.duration}</span>
                            </div>
                          </div>
                          <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{camp.sport}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Star size={12} color="#e63946" fill="#e63946" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{camp.rating}</span>
                              </div>
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.3, flex: 1 }}>{camp.title}</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                              <div style={{ display: "flex", gap: 6, fontSize: 12, color: "#9ca3af" }}><Calendar size={12} color="#e63946" style={{flexShrink:0,marginTop:1}}/><span>{camp.dates}</span></div>
                              <div style={{ display: "flex", gap: 6, fontSize: 12, color: "#9ca3af" }}><Users size={12} color="#e63946" style={{flexShrink:0,marginTop:1}}/><span>{camp.ageGroup}</span></div>
                            </div>
                            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                              <div><p style={{ fontSize:10,color:"#6b7280" }}>Price</p><p style={{ fontSize:20,fontWeight:900,color:"#e63946" }}>{camp.priceDisplay}</p></div>
                              <div style={{ display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",color:"#d1d5db",fontSize:12,fontWeight:600,transition:"all 0.15s" }}>
                                Details<ChevronRight size={13}/>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {!featured.length && !regular.length && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Target size={56} color="#4b5563" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No camps found</h3>
                <p style={{ color: "#6b7280" }}>Try adjusting your filters or check back later for new camps</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
