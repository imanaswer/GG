"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard }   from "@/components/admin/StatCard";
import { Badge }      from "@/components/admin/Badge";
import { useQuery }   from "@tanstack/react-query";
import { Users, Star, CalendarCheck, Gamepad2, Tent, IndianRupee, AlertTriangle, Clock } from "lucide-react";

type Overview = {
  metrics: { totalUsers:number; totalCoaches:number; activeBookings:number; gamesThisWeek:number; campRegistrations:number; revenueMonth:number };
  health:  { slotFillRate:number; confirmRate:number; avgReliability:string; cancelRate:number };
  alerts:  { type:string; message:string; severity:string }[];
};
type Feed = { icon:string; actor:string; action:string; when:string }[];

const alertColor = (s: string) => s === "urgent" ? "#ef4444" : s === "warning" ? "#eab308" : "#60a5fa";

export default function AdminOverview() {
  const { data } = useQuery<Overview>({ queryKey: ["admin-overview"], queryFn: () => fetch("/api/admin/overview").then(r => r.json()), refetchInterval: 30_000 });
  const { data: feedData } = useQuery<{ feed: Feed }>({ queryKey: ["admin-feed"], queryFn: () => fetch("/api/admin/activity-feed").then(r => r.json()), refetchInterval: 15_000 });

  const m = data?.metrics;
  const h = data?.health;

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Platform Overview</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Real-time metrics for Game Ground · Kozhikode</p>
          </div>

          {/* Top 6 metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
            <StatCard value={m?.totalUsers      ?? "—"} label="Total Users"        sub="Registered players"   icon={Users}          />
            <StatCard value={m?.totalCoaches    ?? "—"} label="Active Coaches"     sub="On the platform"      icon={Star}           />
            <StatCard value={m?.activeBookings  ?? "—"} label="Active Bookings"    sub="Pending + confirmed"  icon={CalendarCheck}  />
            <StatCard value={m?.gamesThisWeek   ?? "—"} label="Games This Week"    sub="Open + full"          icon={Gamepad2}       />
            <StatCard value={m?.campRegistrations?? "—"} label="Camp Registrations" sub="All camps"           icon={Tent}           />
            <StatCard value={`₹${(m?.revenueMonth ?? 0).toLocaleString("en-IN")}`} label="Revenue (Month)" sub="Paid transactions" icon={IndianRupee} accent color="#e63946" />
          </div>

          {/* Health row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { v: `${h?.slotFillRate ?? 0}%`, l: "Slots Filled", sub: "Across all games" },
              { v: `${h?.confirmRate ?? 0}%`,  l: "Booking Confirm Rate", sub: "Pending → Confirmed" },
              { v: h?.avgReliability ?? "—",   l: "Avg Reliability", sub: "All players" },
              { v: `${h?.cancelRate ?? 0}%`,   l: "Cancellation Rate", sub: "Of all bookings" },
            ].map(({ v, l, sub }) => (
              <div key={l} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{v}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginTop: 4 }}>{l}</div>
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            {/* Alerts */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <AlertTriangle size={16} color="#eab308" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Alerts</h2>
                {data?.alerts.length ? <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308" }}>{data.alerts.length}</span> : null}
              </div>
              {!data?.alerts.length ? (
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "32px", textAlign: "center" }}>
                  <p style={{ color: "#4ade80", fontWeight: 700 }}>✓ No alerts — everything looks healthy</p>
                </div>
              ) : data.alerts.map((a, i) => (
                <div key={i} style={{ background: "#141414", border: `1px solid ${alertColor(a.severity)}33`, borderRadius: 12, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <AlertTriangle size={14} color={alertColor(a.severity)} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 500 }}>{a.message}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 3, textTransform: "capitalize" }}>{a.type} · {a.severity}</p>
                  </div>
                </div>
              ))}

              {/* Quick links grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
                {[
                  { href: "/admin/bookings", label: "📋 Manage Bookings" },
                  { href: "/admin/coaches",  label: "🎓 Approve Coaches"  },
                  { href: "/admin/camps",    label: "☀️ View Camps"        },
                  { href: "/admin/revenue",  label: "💰 Revenue Report"   },
                ].map(({ href, label }) => (
                  <a key={href} href={href} style={{ display: "block", padding: "12px 14px", borderRadius: 10, background: "#141414", border: "1px solid rgba(255,255,255,0.07)", textDecoration: "none", fontSize: 13, color: "#e5e7eb", fontWeight: 600, transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(230,57,70,0.4)"}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)"}
                  >{label}</a>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Clock size={15} color="#e63946" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Live Activity</h2>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>LIVE</span>
              </div>
              <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, maxHeight: 520, overflowY: "auto" }}>
                {!feedData?.feed.length ? (
                  <div style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>No activity yet</div>
                ) : feedData.feed.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < feedData.feed.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0 }}>{item.actor}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.action}</p>
                    </div>
                    <span style={{ fontSize: 10, color: "#4b5563", flexShrink: 0, whiteSpace: "nowrap" }}>{item.when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
