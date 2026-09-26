"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard }   from "@/components/admin/StatCard";
import { useQuery }   from "@tanstack/react-query";
import { Users, Star, CalendarCheck, Gamepad2, Tent, IndianRupee, AlertTriangle, Clock, Lightbulb, Trophy, CheckCircle2, ArrowUpRight, TrendingUp } from "lucide-react";
import { TIERS, TIER_META, type Tier } from "@/lib/reputation";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

type Overview = {
  metrics: { totalUsers:number; totalCoaches:number; activeBookings:number; gamesThisWeek:number; campRegistrations:number; workshopRegistrations:number; revenueMonth:number };
  health:  { slotFillRate:number; confirmRate:number; avgReliability:string; cancelRate:number };
  tierDistribution: Record<string, number>;
  alerts:  { type:string; message:string; severity:string }[];
  trends:  { name:string; bookings:number; revenue:number }[];
};
type Feed = { icon:string; actor:string; action:string; when:string }[];

export default function AdminOverview() {
  const { data } = useQuery<Overview>({ queryKey: ["admin-overview"], queryFn: () => fetch("/api/admin/overview").then(r => r.json()), refetchInterval: 30_000 });
  const { data: feedData } = useQuery<{ feed: Feed }>({ queryKey: ["admin-feed"], queryFn: () => fetch("/api/admin/activity-feed").then(r => r.json()), refetchInterval: 15_000 });

  const m = data?.metrics;
  const h = data?.health;
  
  const pieData = TIERS.map(t => ({
    name: TIER_META[t as Tier].label,
    value: data?.tierDistribution?.[t] ?? 0,
    color: TIER_META[t as Tier].color
  })).filter(d => d.value > 0);

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 400, color: "#fff", letterSpacing: "-0.02em" }}>Platform Overview</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: "0.02em" }}>Real-time metrics for Game Ground · Kozhikode</p>
          </div>

          {/* Top 6 metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 40 }}>
            <StatCard value={m?.totalUsers ?? "—"} label="Total Users" sub="Registered players" icon={Users} href="/admin/users" />
            <StatCard value={m?.totalCoaches ?? "—"} label="Active Coaches" sub="On the platform" icon={Star} href="/admin/coaches" />
            <StatCard value={m?.activeBookings ?? "—"} label="Active Bookings" sub="Pending + approved" icon={CalendarCheck} href="/admin/bookings/coaches?status=active" />
            <StatCard value={m?.gamesThisWeek ?? "—"} label="Games This Week" sub="Open + full" icon={Gamepad2} href="/admin/games?range=week" />
            <StatCard value={m?.campRegistrations ?? "—"} label="Camp Registrations" sub="All camps" icon={Tent} href="/admin/bookings/camps?date=all" />
            <StatCard value={m?.workshopRegistrations ?? "—"} label="Workshop Sign-ups" sub="All workshops" icon={Lightbulb} href="/admin/bookings/workshops?date=all" />
            <div style={{ gridColumn: "1 / -1" }}>
              <StatCard value={`₹\u2009${(m?.revenueMonth ?? 0).toLocaleString("en-IN")}`} label="Revenue (Month)" sub="Paid transactions" icon={IndianRupee} accent color="#fff" href="/admin/revenue" />
            </div>
          </div>

          {/* Health row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
            {[
              { v: `${h?.slotFillRate ?? 0}%`, l: "Slots Filled", sub: "Across all games" },
              { v: `${h?.confirmRate ?? 0}%`,  l: "Booking Confirm Rate", sub: "Pending → Confirmed" },
              { v: h?.avgReliability ?? "—",   l: "Avg Reliability", sub: "All players" },
              { v: `${h?.cancelRate ?? 0}%`,   l: "Cancellation Rate", sub: "Of all bookings" },
            ].map(({ v, l, sub }) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff", letterSpacing: "-0.02em" }}>{v}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 8 }}>{l}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Tier distribution */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "0 8px" }}>
              <Trophy size={16} color="#fff" />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>Reputation Distribution</h2>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginLeft: "auto", background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 100 }}>
                {Object.values(data?.tierDistribution ?? {}).reduce((a, b) => a + b, 0)} TOTAL USERS
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "center" }}>
              {/* Donut Chart */}
              <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, height: 280, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={4} stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#fff" }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>No data</div>
                )}
                {/* Center text for donut */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Users</div>
                  <div style={{ fontSize: 24, fontFamily: "var(--font-serif)", color: "#fff" }}>{Object.values(data?.tierDistribution ?? {}).reduce((a, b) => a + b, 0)}</div>
                </div>
              </div>

              {/* Stat Cards */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${TIERS.length}, 1fr)`, gap: 16 }}>
                {TIERS.map(t => {
                  const count = data?.tierDistribution?.[t] ?? 0;
                  const total = Object.values(data?.tierDistribution ?? {}).reduce((a, b) => a + b, 0) || 1;
                  const pct = (count / total) * 100;
                  const meta = TIER_META[t as Tier];
                  return (
                    <div key={t} style={{ 
                      background: "rgba(255,255,255,0.015)", 
                      border: "1px solid rgba(255,255,255,0.05)", 
                      borderRadius: 20, 
                      padding: "32px 20px", 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: meta.color, opacity: 0.9 }} />
                      <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 120, height: 120, background: meta.color, filter: "blur(40px)", opacity: 0.15, borderRadius: "50%", pointerEvents: "none" }} />
                      
                      <div style={{ fontSize: 24, marginBottom: 16 }}>{meta.icon}</div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 400, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 12 }}>
                        {count}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
                        {pct.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "0 8px" }}>
              <TrendingUp size={16} color="#fff" />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>7-Day Revenue Trend</h2>
            </div>
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, padding: "32px 24px", height: 320 }}>
              {data?.trends && data.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={11} tickMargin={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickMargin={12} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                    <RechartsTooltip 
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#fff" }}
                      itemStyle={{ color: "#4ade80" }}
                      formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#4ade80" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No trend data available</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40 }}>
            {/* Alerts */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <AlertTriangle size={16} color="rgba(255,255,255,0.4)" />
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>Alerts</h2>
                {data?.alerts?.length ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", border: "1px solid #fff", color: "#fff" }}>{data.alerts.length}</span> : null}
              </div>
              {!data?.alerts?.length ? (
                <div style={{ 
                  background: "rgba(34, 197, 94, 0.03)", 
                  border: "1px solid rgba(34, 197, 94, 0.1)", 
                  borderRadius: 24, 
                  padding: "40px", 
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle2 size={24} color="#4ade80" />
                  </div>
                  <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", margin: 0 }}>System is healthy. No active alerts.</p>
                </div>
              ) : data.alerts.map((a, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "20px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <AlertTriangle size={18} color="#fff" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 14, color: "#fff", fontWeight: 600, margin: 0 }}>{a.message}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.05em", margin: "8px 0 0 0" }}>{a.type} · {a.severity}</p>
                  </div>
                </div>
              ))}

              {/* Quick links grid */}
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 40, marginBottom: 16 }}>Quick Actions</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {[
                  { href: "/admin/bookings",  label: "Manage Bookings" },
                  { href: "/admin/coaches",   label: "Approve Coaches"  },
                  { href: "/admin/camps",     label: "View Camps"        },
                  { href: "/admin/workshops", label: "Manage Workshops" },
                  { href: "/admin/revenue",   label: "Revenue Report"   },
                ].map(({ href, label }) => (
                  <a key={href} href={href} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 100, textDecoration: "none", fontSize: 11, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.color = "#000";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.color = "#fff";
                    }}
                  >
                    {label}
                    <ArrowUpRight size={14} style={{ opacity: 0.8 }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <Clock size={16} color="rgba(255,255,255,0.4)" />
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Activity</h2>
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>LIVE</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, maxHeight: 520, overflowY: "auto", padding: "8px 24px" }}>
                {!feedData?.feed?.length ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No activity yet.</div>
                ) : feedData.feed.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 0", borderBottom: i < feedData.feed.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.8 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, letterSpacing: "0.02em" }}>{item.actor}</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.action}</p>
                    </div>
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
