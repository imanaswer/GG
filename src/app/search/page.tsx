"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Users, CalendarClock, GraduationCap, Trophy, SearchX, ArrowRight, Loader2 } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img } from "@/components/Shared";
import { useQuery } from "@tanstack/react-query";

type ResultType = "coach" | "game" | "camp" | "event";
type SearchResult = { id: string; type: ResultType; title: string; subtitle: string; image: string; href: string };
type SearchData = { coaches: SearchResult[]; games: SearchResult[]; camps: SearchResult[]; events: SearchResult[] };

const TYPE_META: Record<ResultType, { label: string; color: string; Icon: typeof Users }> = {
  coach: { label: "Coach",  color: "#60a5fa", Icon: GraduationCap },
  game:  { label: "Game",   color: "#4ade80", Icon: Users },
  camp:  { label: "Camp",   color: "#f59e0b", Icon: CalendarClock },
  event: { label: "Event",  color: "#e63946", Icon: Trophy },
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
      <NavBar />

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "120px 24px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14 }}>
            Search
          </div>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.04,
            fontWeight: 400,
            color: "#fff",
            letterSpacing: "-0.035em",
            marginBottom: 14,
          }}>
            Find your next session.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, maxWidth: 560 }}>
            Coaches, pickup games, summer camps, tournaments — everything on Game Ground, one search box.
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <Search size={20} color="rgba(255,255,255,0.45)" style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            style={{
              width: "100%", height: 60,
              paddingLeft: 56, paddingRight: q ? 54 : 22,
              fontSize: 16,
              borderRadius: 16,
              background: "#0b0b0b",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 160ms ease, box-shadow 160ms ease",
            }}
            placeholder="Try &ldquo;basketball coach&rdquo; or &ldquo;pickup football Calicut&rdquo;"
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(230,57,70,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(230,57,70,0.12)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
            autoFocus
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear"
              style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.6)",
                border: "none", cursor: "pointer",
                fontSize: 18, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {!showEmpty && total > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
            {filters.map(f => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.03)",
                    color: active ? "#fff" : "rgba(255,255,255,0.65)",
                    border: "1px solid",
                    borderColor: active ? "transparent" : "rgba(255,255,255,0.08)",
                    boxShadow: active ? "0 4px 14px rgba(230,57,70,0.3)" : "none",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    transition: "all 160ms ease",
                  }}
                >
                  {f.label}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 100,
                    background: active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.05)",
                    color: active ? "#fff" : "rgba(255,255,255,0.5)",
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
            padding: "56px 32px",
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              margin: "0 auto 22px",
              background: "rgba(230,57,70,0.1)",
              border: "1px solid rgba(230,57,70,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Search size={24} color="#e63946" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Start typing to search
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
              Two characters are enough. Search by sport, coach name, venue, or a neighbourhood in Calicut.
            </p>
            <div style={{ marginBottom: 10, fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Popular
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {["Basketball", "Football", "Badminton", "Cricket", "Tennis", "Kozhikode", "Coach"].map(s => (
                <button key={s} onClick={() => setQ(s)} style={{
                  padding: "7px 15px",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && debouncedQ.length >= 2 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0", color: "rgba(255,255,255,0.5)", gap: 10 }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14 }}>Searching for &ldquo;{debouncedQ}&rdquo;…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div style={{
            padding: "56px 32px",
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              margin: "0 auto 22px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <SearchX size={24} color="rgba(255,255,255,0.5)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
              No results for &ldquo;{debouncedQ}&rdquo;
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 24 }}>
              Try a broader term, a different sport, or browse by category below.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/learn" style={browseBtn}>Browse coaches <ArrowRight size={13} /></Link>
              <Link href="/play" style={browseBtn}>Browse games <ArrowRight size={13} /></Link>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && !showEmpty && total > 0 && (
          <>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
              {total} result{total !== 1 ? "s" : ""} for &ldquo;{debouncedQ}&rdquo;
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <ResultSection items={filtered.coaches} title="Coaches & academies" />
              <ResultSection items={filtered.games}   title="Pickup games" />
              <ResultSection items={filtered.camps}   title="Camps" />
              <ResultSection items={filtered.events}  title="Events & tournaments" />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const browseBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  height: 40, padding: "0 16px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.1)",
  textDecoration: "none",
  fontSize: 13, fontWeight: 600,
};

function ResultSection({ items, title }: { items: SearchResult[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14 }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(r => <ResultRow key={`${r.type}-${r.id}`} r={r} />)}
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: SearchResult }) {
  const meta = TYPE_META[r.type];
  return (
    <Link href={r.href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: 14,
          borderRadius: 14,
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer",
          transition: "all 180ms ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "rgba(230,57,70,0.25)";
          el.style.background = "#101010";
          el.style.transform = "translateX(4px)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "rgba(255,255,255,0.06)";
          el.style.background = "#0b0b0b";
          el.style.transform = "translateX(0)";
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 12,
          overflow: "hidden", flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <Img src={r.image} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 10.5, fontWeight: 700,
              padding: "3px 9px", borderRadius: 100,
              background: `${meta.color}18`,
              color: meta.color,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              <meta.Icon size={11} /> {meta.label}
            </span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            {r.title}
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.subtitle}
          </p>
        </div>
        <ArrowRight size={16} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#050505" }}><NavBar /></div>}>
      <SearchResults />
    </Suspense>
  );
}
