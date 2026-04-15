"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img } from "@/components/Shared";
import { Input } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";

type SearchResult = { id: string; type: string; title: string; subtitle: string; image: string; href: string };
type SearchData = { coaches: SearchResult[]; games: SearchResult[]; camps: SearchResult[]; events: SearchResult[] };

const TYPE_COLOR: Record<string, string> = { coach: "#60a5fa", game: "#4ade80", camp: "#f59e0b", event: "#e63946" };
const TYPE_LABEL: Record<string, string> = { coach: "Coach", game: "Game", camp: "Camp", event: "Event" };

function Section({ items, title }: { items: SearchResult[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(r => (
          <Link key={r.id} href={r.href} style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: "#141414", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(230,57,70,0.35)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"}
            >
              <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                <Img src={r.image} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 100, background: `${TYPE_COLOR[r.type]}22`, color: TYPE_COLOR[r.type] }}>{TYPE_LABEL[r.type]}</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchResults() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery<SearchData>({
    queryKey: ["search", debouncedQ],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`).then(r => r.json()).then(d => d.data ?? d),
    enabled: debouncedQ.length >= 2,
  });

  const allResults = data ? [...(data.coaches ?? []), ...(data.games ?? []), ...(data.camps ?? []), ...(data.events ?? [])] : [];
  const hasResults = allResults.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 24 }}>Search Game Ground</h1>
        <div style={{ position: "relative", marginBottom: 36 }}>
          <Search size={18} color="#6b7280" style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)" }} />
          <Input
            style={{ paddingLeft: 46, height: 52, fontSize: 16, borderRadius: 12 }}
            placeholder="Search coaches, games, camps, events…"
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
          />
        </div>

        {debouncedQ.length < 2 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "#6b7280", fontSize: 15 }}>Type at least 2 characters to search</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
              {["Basketball", "Football", "Badminton", "Cricket", "Tennis"].map(s => (
                <button key={s} onClick={() => setQ(s)} style={{ padding: "7px 14px", borderRadius: 100, fontSize: 13, fontWeight: 500, background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "inherit" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && debouncedQ.length >= 2 && (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "40px 0" }}>Searching…</p>
        )}

        {!isLoading && debouncedQ.length >= 2 && !hasResults && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No results for "{debouncedQ}"</p>
            <p style={{ color: "#6b7280" }}>Try searching for a sport, location, or name</p>
          </div>
        )}

        {hasResults && data && (
          <>
            <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 24 }}>{allResults.length} result{allResults.length !== 1 ? "s" : ""} for &ldquo;{debouncedQ}&rdquo;</p>
            <Section items={data.coaches ?? []} title="Coaches & Academies" />
            <Section items={data.games   ?? []} title="Pickup Games" />
            <Section items={data.camps   ?? []} title="Summer Camps" />
            <Section items={data.events  ?? []} title="Events & Tournaments" />
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080808" }}><NavBar /></div>}><SearchResults /></Suspense>;
}
