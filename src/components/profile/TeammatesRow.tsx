"use client";
import Link from "next/link";
import Image from "next/image";
import { Users, ArrowUpRight } from "lucide-react";
import { useUserTeammates } from "@/hooks/useData";
import { TIER_META, type Tier } from "@/lib/reputation";

export function TeammatesRow({ userId }: { userId: string }) {
  const { data, isLoading } = useUserTeammates(userId);
  const teammates = data?.teammates ?? [];

  return (
    <div style={{
      background: "#0b0b0b",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20,
      padding: "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Users size={14} color="#e63946" />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Recent teammates
        </span>
        {teammates.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Last 30 days
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", gap: 12 }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ width: 56, height: 56, borderRadius: "50%" }} />)}
        </div>
      ) : teammates.length === 0 ? (
        <Link href="/play" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "20px 16px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 12,
          fontSize: 13, color: "rgba(255,255,255,0.55)",
          textDecoration: "none",
        }}>
          No teammates yet — join a game to connect <ArrowUpRight size={12} />
        </Link>
      ) : (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {teammates.map(t => {
            const tierMeta = TIER_META[t.tier as Tier] ?? TIER_META.bronze;
            return (
              <Link
                key={t.id}
                href={`/profile/${t.id}`}
                title={`${t.name} — ${t.sharedGames} shared game${t.sharedGames === 1 ? "" : "s"}`}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  textDecoration: "none",
                  width: 64,
                }}
                className="tm-card"
              >
                <div style={{
                  position: "relative",
                  width: 48, height: 48, borderRadius: "50%",
                  padding: 2,
                  background: `linear-gradient(135deg, ${tierMeta.color} 0%, ${tierMeta.colorDim} 100%)`,
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: "100%", height: "100%", borderRadius: "50%",
                    overflow: "hidden", background: "#0a0a0a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.avatarUrl ? (
                      <Image src={t.avatarUrl} alt={t.name} width={48} height={48} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                        {t.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {t.sharedGames > 1 && (
                    <span style={{
                      position: "absolute", bottom: -2, right: -2,
                      minWidth: 18, height: 18, padding: "0 4px",
                      borderRadius: 100,
                      background: "#e63946",
                      border: "2px solid #0b0b0b",
                      color: "#fff", fontSize: 9, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{t.sharedGames}</span>
                  )}
                </div>
                <span style={{
                  fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500,
                  width: "100%",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center",
                }}>
                  {t.name.split(" ")[0]}
                </span>
              </Link>
            );
          })}
          <style>{`.tm-card:hover { transform: translateY(-2px); transition: transform 180ms; }`}</style>
        </div>
      )}
    </div>
  );
}
