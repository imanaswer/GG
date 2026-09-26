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

  const rateColor = (r: number) => r >= 90 ? "#4ade80" : r >= 70 ? "#eab308" : "#fff";

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Users & Players</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{data?.total ?? 0} users</p>
            </div>
            <a href="/api/admin/export?type=users" download style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 100, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", textDecoration: "none", transition: "all 0.2s ease" }}
               onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
               onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}>
              Export CSV
            </a>
          </div>

          {/* Filters & Search */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 100, padding: 4 }}>
              {SEGMENTS.map(s => (
                <button key={s.val} onClick={() => setSegment(s.val)} style={{ padding: "8px 20px", borderRadius: 100, fontSize: 13, fontWeight: segment === s.val ? 700 : 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: segment === s.val ? "#fff" : "transparent", color: segment === s.val ? "#000" : "#9ca3af", transition: "all 0.2s" }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <Search size={16} color="#6b7280" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or username…" style={{ width: "100%", height: 44, paddingLeft: 42, paddingRight: 20, borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Users List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Header Row */}
            <div style={{ display: "flex", alignItems: "center", padding: "0 32px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
              <div style={{ flex: 1.5, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>User Info</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Engagement</div>
              <div style={{ width: 140, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reputation</div>
              <div style={{ width: 60, textAlign: "right", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</div>
            </div>

            {!filtered.length ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 24 }}>No users found</div>
            ) : filtered.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 100, padding: "16px 32px", gap: 16, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                
                {/* User Info */}
                <div style={{ flex: 1.5, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {u.name[0]}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{u.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>@{u.username}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa", textTransform: "capitalize" }}>{u.role}</span>
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>

                {/* Engagement */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Games</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{u.gamesPlayed}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Attendance</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: rateColor(u.attendanceRate) }}>{u.attendanceRate.toFixed(0)}%</div>
                  </div>
                </div>

                {/* Reputation */}
                <div style={{ width: 140, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <TierBadge tier={u.tier} size="xs" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                      {u.reputationScore}
                    </span>
                    {u.reputationOverride !== null && (
                      <span title="Manually overridden" style={{ fontSize: 9, color: "#eab308", fontWeight: 800, padding: "2px 6px", borderRadius: 100, background: "rgba(234,179,8,0.15)" }}>OVR</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ width: 60, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => openOverride(u)} title="Override reputation" style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                    <Pencil size={14} color="#60a5fa" />
                  </button>
                </div>
              </div>
            ))}
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
