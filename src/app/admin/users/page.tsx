"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { AdminModal, FormInput, FormActions } from "@/components/admin/AdminModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Pencil } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";

type User = {
  id:string; name:string; username:string; role:string; location?:string;
  gamesPlayed:number; bookings:number; reliabilityScore:number; attendanceRate:number;
  createdAt:string; activity:number; phone?:string;
  tier:string; reputationScore:number; reputationOverride:number|null;
};

const SEGMENTS = [{ val: "all", label: "All Users" }, { val: "active", label: "Most Active" }, { val: "new", label: "New This Week" }, { val: "inactive", label: "Inactive" }];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [segment, setSegment] = useState("all");
  const [q, setQ] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<User | null>(null);
  const [overrideValue, setOverrideValue] = useState("");
  const { data } = useQuery<{ users: User[]; total: number }>({ queryKey: ["admin-users", segment], queryFn: () => fetch(`/api/admin/users?segment=${segment}`).then(r => r.json()) });

  const setOverride = useMutation({
    mutationFn: (payload: { id: string; reputationOverride: number | null }) =>
      fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setOverrideTarget(null); },
  });

  const openOverride = (u: User) => {
    setOverrideTarget(u);
    setOverrideValue(u.reputationOverride !== null ? String(u.reputationOverride) : "");
  };

  const filtered = (data?.users ?? []).filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()));

  const rateColor = (r: number) => r >= 90 ? "#4ade80" : r >= 70 ? "#eab308" : "#ef4444";
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Users & Players</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{data?.total ?? 0} users</p>
            </div>
          </div>

          {/* Segment tabs */}
          <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20 }}>
            {SEGMENTS.map(s => (
              <button key={s.val} onClick={() => setSegment(s.val)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: segment === s.val ? 700 : 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: segment === s.val ? "#1c1c1c" : "transparent", color: segment === s.val ? "#fff" : "#6b7280" }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
            <Search size={14} color="#6b7280" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or username…" style={{ width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Name","Username","Role","Tier","Rep","Games","Reliability","Attendance","Joined","Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!filtered.length ? (
                    <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No users found</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#980808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{u.name[0]}</div>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ ...td, color: "#6b7280" }}>@{u.username}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa", textTransform: "capitalize" }}>{u.role}</span></td>
                      <td style={td}><TierBadge tier={u.tier} size="xs" /></td>
                      <td style={{ ...td, fontWeight: 700, color: "#fff" }}>
                        {u.reputationScore}
                        {u.reputationOverride !== null && (
                          <span title="Manually overridden" style={{ fontSize: 9, color: "#eab308", marginLeft: 5, fontWeight: 800 }}>OVR</span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>{u.gamesPlayed}</td>
                      <td style={{ ...td, color: "#eab308", fontWeight: 700 }}>★ {u.reliabilityScore.toFixed(1)}</td>
                      <td style={{ ...td, color: rateColor(u.attendanceRate), fontWeight: 600 }}>{u.attendanceRate.toFixed(0)}%</td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={td}>
                        <button onClick={() => openOverride(u)} title="Override reputation" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" }}>
                          <Pencil size={13} color="#60a5fa" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <AdminModal open={!!overrideTarget} onClose={() => setOverrideTarget(null)} title="Override reputation" width={420}>
          {overrideTarget && (
            <form onSubmit={e => {
              e.preventDefault();
              const trimmed = overrideValue.trim();
              setOverride.mutate({
                id: overrideTarget.id,
                reputationOverride: trimmed === "" ? null : Number(trimmed),
              });
            }}>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
                Manually set <span style={{ color: "#fff", fontWeight: 700 }}>{overrideTarget.name}</span>&apos;s reputation score.
                Set value sticks until cleared — recompute won&apos;t overwrite it.
                Computed score: <span style={{ color: "#d1d5db" }}>{overrideTarget.reputationScore}</span>.
              </p>
              <FormInput
                label="Override score (blank = clear, use computed)"
                value={overrideValue}
                onChange={v => setOverrideValue(String(v))}
                type="number"
                placeholder="e.g. 1500"
              />
              <FormActions
                onCancel={() => setOverrideTarget(null)}
                submitLabel={overrideValue.trim() === "" ? "Clear override" : "Save override"}
                loading={setOverride.isPending}
              />
            </form>
          )}
        </AdminModal>
      </AdminShell>
    </AdminGuard>
  );
}
