"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Users, CalendarClock, GraduationCap, Trophy, SearchX, ArrowRight, Loader2 } from "lucide-react";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { Img } from "@/components/Shared";
import { useQuery } from "@tanstack/react-query";

type ResultType = "coach" | "game" | "camp" | "event";
type SearchResult = { id: string; type: ResultType; title: string; subtitle: string; image: string; href: string };
type SearchData = { coaches: SearchResult[]; games: SearchResult[]; camps: SearchResult[]; events: SearchResult[] };

const TYPE_META: Record<ResultType, { label: string; color: string; Icon: typeof Users }> = {
  coach: { label: "Coach",  color: "#60a5fa", Icon: GraduationCap },
  game:  { label: "Game",   color: "#4ade80", Icon: Users },
  camp:  { label: "Camp",   color: "#f59e0b", Icon: CalendarClock },
  event: { label: "Event",  color: "#a855f7", Icon: Trophy }, // Changed from red to purple
};

type FilterKey = "all" | ResultType;

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const url = debouncedQ ? `/search?q=${encodeURIComponent(debouncedQ)}` : "/search";
    router.replace(url, { scroll: false });
  }, [debouncedQ, router]);

  const { data, isLoading } = useQuery<SearchData>({
    queryKey: ["search", debouncedQ],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`).then(r => r.json()).then(d => d.data ?? d),
    enabled: debouncedQ.length >= 2,
  });

  const counts = useMemo(() => ({
    coach: data?.coaches?.length ?? 0,
    game:  data?.games?.length  ?? 0,
    camp:  data?.camps?.length  ?? 0,
    event: data?.events?.length ?? 0,
  }), [data]);

  const total = counts.coach + counts.game + counts.camp + counts.event;

  const filtered = useMemo(() => {
    if (!data) return { coaches: [], games: [], camps: [], events: [] };
    const showAll = filter === "all";
    return {
      coaches: showAll || filter === "coach" ? (data.coaches ?? []) : [],
      games:   showAll || filter === "game"  ? (data.games   ?? []) : [],
      camps:   showAll || filter === "camp"  ? (data.camps   ?? []) : [],
      events:  showAll || filter === "event" ? (data.events  ?? []) : [],
    };
  }, [data, filter]);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all",   label: "All",       count: total },
    { key: "coach", label: "Coaches",   count: counts.coach },
    { key: "game",  label: "Games",     count: counts.game },
    { key: "camp",  label: "Camps",     count: counts.camp },
    { key: "event", label: "Events",    count: counts.event },
  ];

  const showEmpty = debouncedQ.length < 2;
  const showNoResults = !isLoading && debouncedQ.length >= 2 && total === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <PremiumNav />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "120px 24px 100px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>
            Search
          </div>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(36px, 6vw, 64px)",
            lineHeight: 1,
            fontWeight: 400,
            color: "#fff",
            letterSpacing: "-0.03em",
            marginBottom: 20,
          }}>
            Find your next session.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 560 }}>
            Coaches, pickup games, summer camps, tournaments — everything on Game Ground, one search box.
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 40 }}>
          <Search size={22} color="rgba(255,255,255,0.5)" style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            style={{
              width: "100%", height: 64,
              paddingLeft: 40, paddingRight: q ? 40 : 0,
              fontSize: 24,
              fontFamily: "var(--font-serif)",
              background: "transparent",
              border: "none",
              borderBottom: "2px solid rgba(255,255,255,0.1)",
              color: "#fff",
              outline: "none",
              transition: "border-color 200ms ease",
            }}
            placeholder="Type to search..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = "#fff"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            autoFocus
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear"
              style={{
                position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 16, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {!showEmpty && total > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 48, flexWrap: "wrap" }}>
            {filters.map(f => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: active ? "#fff" : "transparent",
                    color: active ? "#050505" : "rgba(255,255,255,0.5)",
                    border: "1px solid",
                    borderColor: active ? "#fff" : "rgba(255,255,255,0.15)",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    transition: "all 200ms ease",
                  }}
                >
                  {f.label}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: active ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                    color: active ? "#050505" : "rgba(255,255,255,0.5)",
                  }}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div style={{
            padding: "80px 0",
            textAlign: "center",
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              margin: "0 auto 32px",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Search size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: "var(--font-serif)", color: "#fff", marginBottom: 16, letterSpacing: "-0.02em" }}>
              Start typing to search
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 40, maxWidth: 420, margin: "0 auto 40px" }}>
              Two characters are enough. Search by sport, coach name, venue, or a neighbourhood in Calicut.
            </p>
            <div style={{ marginBottom: 16, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Popular searches
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {["Basketball", "Football", "Badminton", "Cricket", "Tennis", "Kozhikode", "Coach"].map(s => (
                <button key={s} onClick={() => setQ(s)} style={{
                  padding: "10px 20px",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && debouncedQ.length >= 2 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", gap: 12 }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 15, fontFamily: "var(--font-serif)" }}>Searching for &ldquo;{debouncedQ}&rdquo;…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div style={{
            padding: "80px 0",
            textAlign: "center",
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              margin: "0 auto 32px",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <SearchX size={28} color="rgba(255,255,255,0.4)" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: "var(--font-serif)", color: "#fff", marginBottom: 16, letterSpacing: "-0.02em" }}>
              No results for &ldquo;{debouncedQ}&rdquo;
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 40 }}>
              Try a broader term, a different sport, or browse by category below.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/learn" style={browseBtn}>Browse coaches <ArrowRight size={14} /></Link>
              <Link href="/play" style={browseBtn}>Browse games <ArrowRight size={14} /></Link>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && !showEmpty && total > 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
              <ResultSection items={filtered.coaches} title="Coaches & Academies" />
              <ResultSection items={filtered.games}   title="Pickup Games" />
              <ResultSection items={filtered.camps}   title="Camps" />
              <ResultSection items={filtered.events}  title="Events & Tournaments" />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const browseBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  height: 48, padding: "0 24px", borderRadius: 100,
  background: "transparent",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  textDecoration: "none",
  fontSize: 14, fontWeight: 600,
  transition: "all 200ms ease",
};

function ResultSection({ items, title }: { items: SearchResult[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 style={{ 
        fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", 
        textTransform: "uppercase", letterSpacing: "0.15em", 
        marginBottom: 24, paddingBottom: 16,
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}>
        {title} <span style={{ color: "rgba(255,255,255,0.15)", marginLeft: 8 }}>({items.length})</span>
      </h2>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map(r => <ResultRow key={`${r.type}-${r.id}`} r={r} />)}
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: SearchResult }) {
  const meta = TYPE_META[r.type];
  return (
    <Link href={r.href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 24,
          padding: "20px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer",
          transition: "all 200ms ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.paddingLeft = "16px";
          el.style.paddingRight = "16px";
          el.style.background = "rgba(255,255,255,0.02)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.paddingLeft = "0px";
          el.style.paddingRight = "0px";
          el.style.background = "transparent";
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          overflow: "hidden", flexShrink: 0,
          background: "#111",
        }}>
          <Img src={r.image} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 700,
              color: meta.color,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              <meta.Icon size={12} /> {meta.label}
            </span>
          </div>
          <p style={{ 
            fontSize: 18, fontWeight: 400, fontFamily: "var(--font-serif)", 
            color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" 
          }}>
            {r.title}
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.subtitle}
          </p>
        </div>
        <ArrowRight size={18} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050505" }}><PremiumNav /></div>}>
      <SearchResults />
    </Suspense>
  );
}
