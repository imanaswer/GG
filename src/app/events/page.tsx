"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Trophy, Target, Calendar, MapPin, Users, ChevronRight, Sparkles, Award } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img } from "@/components/Shared";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Skeleton } from "@/components/ui";
import { useEvents, type EventFilters, type SportEvent } from "@/hooks/useData";

const TYPE_EMOJI: Record<string, string> = { Tournament:"🏆", Marathon:"🏃", Festival:"🎪", League:"⚽", Workshop:"🎓", Seminar:"📢", Tryout:"🔍" };

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "Live";
  const isOpen = status === "Registration Open";
  const isFull = status === "Full";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 11px", borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: isLive ? "rgba(239,68,68,0.9)" : isOpen ? "rgba(34,197,94,0.9)" : isFull ? "rgba(107,114,128,0.7)" : "rgba(96,165,250,0.85)",
      color: "#fff",
    }}>
      {isLive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "pulse 1s infinite" }} />}
      {status}
    </div>
  );
}

function EventCard({ event, featured }: { event: SportEvent; featured?: boolean }) {
  const pct = Math.round((event.participants / event.maxParticipants) * 100);
  const isLive = event.status === "Live";

  return (
    <Link href={`/events/${event.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#141414",
        border: `1px solid ${isLive ? "rgba(239,68,68,0.45)" : featured ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16, overflow: "hidden", cursor: "pointer",
        transition: "transform 0.25s, box-shadow 0.25s", height: "100%", display: "flex", flexDirection: "column",
        boxShadow: isLive ? "0 0 24px rgba(239,68,68,0.12)" : "none",
      }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(-8px)"; d.style.boxShadow = `0 24px 60px ${isLive ? "rgba(239,68,68,0.22)" : "rgba(230,57,70,0.18)"}`; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(0)"; d.style.boxShadow = isLive ? "0 0 24px rgba(239,68,68,0.12)" : "none"; }}
      >
        <div style={{ position: "relative", height: featured ? 240 : 200, overflow: "hidden", flexShrink: 0 }}>
          <Img src={event.imageUrl} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)" }} />
          {/* Featured badge */}
          {featured && (
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 100, background: "linear-gradient(135deg,#f59e0b,#d97706)", fontSize: 11, fontWeight: 800, color: "#000" }}>
              <Award size={11} />Featured
            </div>
          )}
          {/* Status */}
          <div style={{ position: "absolute", top: 14, right: 14 }}><StatusBadge status={event.status} /></div>
          {/* Type bottom */}
          <div style={{ position: "absolute", bottom: 12, left: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(0,0,0,0.6)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
              {event.type}
            </span>
          </div>
        </div>

        <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{event.sport}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>{event.difficulty}</span>
          </div>

          <h3 style={{ fontSize: featured ? 17 : 15, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.3, flex: 1 }}>{event.title}</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            <div style={{ display:"flex",gap:7,fontSize:12,color:"#9ca3af" }}><Calendar size={12} color="#e63946" style={{flexShrink:0,marginTop:1}}/><span>{event.date}</span></div>
            <div style={{ display:"flex",gap:7,fontSize:12,color:"#9ca3af" }}><MapPin size={12} color="#e63946" style={{flexShrink:0,marginTop:1}}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event.location}</span></div>
            <div style={{ display:"flex",gap:7,fontSize:12,color:"#9ca3af" }}><Users size={12} color="#e63946" style={{flexShrink:0,marginTop:1}}/><span>{event.participants}/{event.maxParticipants} {featured ? "registered" : "spots"}</span></div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: "#1c1c1c", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#ef4444" : pct >= 75 ? "#eab308" : "#e63946", borderRadius: 99, transition: "width 1s ease" }} />
          </div>

          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.07)" }}>
            <div>
              {event.prizePool && event.prizePool !== "Prizes & Trophies" ? (
                <><p style={{ fontSize:10,color:"#6b7280" }}>Prize Pool</p><p style={{ fontSize:featured?18:15,fontWeight:900,color:"#e63946" }}>{event.prizePool}</p></>
              ) : (
                <><p style={{ fontSize:10,color:"#6b7280" }}>Entry Fee</p><p style={{ fontSize:featured?18:15,fontWeight:900,color:event.entryFeeAmount===0?"#4ade80":"#fff" }}>{event.entryFee}</p></>
              )}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6,padding:featured?"10px 20px":"7px 14px",borderRadius:9,background:featured?"#e63946":"transparent",border:featured?"none":"1px solid rgba(255,255,255,0.12)",color:featured?"#fff":"#d1d5db",fontSize:featured?14:12,fontWeight:700,boxShadow:featured?"0 4px 16px rgba(230,57,70,0.3)":"none" }}>
              {featured?"Register":"View Details"}<ChevronRight size={featured?16:13}/>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>({});
  const [search,  setSearch]  = useState("");
  const { data, isLoading, error } = useEvents({ ...filters, q: search || undefined });
  const featured = data?.filter(e => e.featured) ?? [];
  const regular  = data?.filter(e => !e.featured) ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", padding: "64px 24px", background: "linear-gradient(135deg, rgba(230,57,70,0.18) 0%, #080808 60%)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.25, background: "radial-gradient(circle at 20% 50%, #e63946 0%, transparent 50%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.28)", color: "#e63946", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            <Sparkles size={14} />Compete & Win Amazing Prizes
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", marginBottom: 14 }}>
            Discover <span style={{ color: "#e63946" }}>Exciting</span> Events
          </h1>
          <p style={{ fontSize: 17, color: "#9ca3af", lineHeight: 1.65 }}>
            From local tournaments to city-wide marathons — find your next competitive challenge across Kozhikode.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Search + 4 filters */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <Search size={18} color="#6b7280" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <Input style={{ paddingLeft: 46, height: 48, fontSize: 15 }} placeholder="Search events by name, sport, or location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 16 }}>
            {[
              { label: "Sport", Icon: Filter, key: "sport" as keyof EventFilters, opts: [["all","All Sports"],["Basketball","Basketball"],["Football","Football"],["Tennis","Tennis"],["Cricket","Cricket"],["Running","Running"],["Badminton","Badminton"],["Multi-Sport","Multi-Sport"]] },
              { label: "Type", Icon: Trophy, key: "type" as keyof EventFilters, opts: [["all","All Types"],["Tournament","Tournament"],["League","League"],["Marathon","Marathon"],["Festival","Festival"],["Workshop","Workshop"],["Seminar","Seminar"]] },
              { label: "Difficulty", Icon: Target, key: "difficulty" as keyof EventFilters, opts: [["all","All Levels"],["Beginner","Beginner"],["Intermediate","Intermediate"],["Advanced","Advanced"],["All Levels","All Levels"]] },
              { label: "When", Icon: Calendar, key: "when" as keyof EventFilters, opts: [["all","Any Time"],["this-week","This Week"],["this-month","This Month"],["upcoming","Upcoming"]] },
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
            {Array(6).fill(0).map((_,i) => <div key={i} style={{ background:"#141414",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden" }}><Skeleton style={{ height:220 }}/><div style={{ padding:18,display:"flex",flexDirection:"column",gap:10 }}><Skeleton style={{ height:15,width:"70%" }}/><Skeleton style={{ height:11,width:"50%" }}/></div></div>)}
          </div>
        )}
        {error && <p style={{ textAlign:"center",padding:"60px 0",color:"#ef4444" }}>Failed to load events. Please refresh.</p>}

        {!isLoading && !error && (
          <>
            {/* Featured Events */}
            {featured.length > 0 && (
              <div style={{ marginBottom: 52 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <Sparkles size={20} color="#e63946" />
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Featured Events</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 22 }}>
                  {featured.map(ev => <EventCard key={ev.id} event={ev} featured />)}
                </div>
              </div>
            )}

            {/* All Events */}
            {regular.length > 0 && (
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 24 }}>All Events</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
                  {regular.map(ev => <EventCard key={ev.id} event={ev} />)}
                </div>
              </div>
            )}

            {!featured.length && !regular.length && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Trophy size={56} color="#4b5563" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No events found</h3>
                <p style={{ color: "#6b7280" }}>Try adjusting your filters or check back later for new events</p>
              </div>
            )}
          </>
        )}
      </div>
      <style jsx global>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
