"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, Star, Clock, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/Shared";

export default function CoachDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "coach")) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user || user.role !== "coach") return;
    fetch("/api/coach/agreements")
      .then(r => r.json())
      .then(d => { if (d?.data && d.data.signed === false) router.push("/onboarding-terms"); })
      .catch(() => {});
  }, [user, loading, router]);

  const { data: bookings } = useQuery<{ pending: number; approved: number; list: { id: string; status: string; coachName: string; batchId: string; note: string; createdAt: string; playerName: string }[] }>({
    queryKey: ["coach-bookings"],
    queryFn: () => fetch("/api/bookings?role=coach").then(r => r.json()).then(d => d.data ?? d),
    enabled: !!user,
  });

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#080808" }}><PremiumNav /></div>;

  const stats = [
    { icon: Calendar, label: "Pending Requests",  value: bookings?.pending ?? "—",   color: "#eab308" },
    { icon: Users,    label: "Approved Students", value: bookings?.approved ?? "—", color: "#4ade80" },
    { icon: Star,     label: "Your Rating",        value: "4.8",  color: "#e63946" },
    { icon: Clock,    label: "Active Batches",     value: "3",    color: "#60a5fa" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 60px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>Coach Dashboard</h1>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Welcome back, {user.name.split(" ")[0]} 👋</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/coach/dashboard/bookings" style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "#e63946", color: "#fff", textDecoration: "none" }}>
              Manage Bookings
            </Link>
            <Link href="/coach/profile/edit" style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}>
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
              <Icon size={18} color={color} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Recent Bookings</h2>
              <Link href="/coach/dashboard/bookings" style={{ fontSize: 12, color: "#e63946", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {!bookings?.list?.length ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>No bookings yet. Share your profile to get started!</p>
            ) : bookings.list.slice(0, 5).map(b => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{b.playerName ?? "Player"}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{new Date(b.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Quick Actions</h2>
            {[
              { href: "/coach/dashboard/bookings", label: "Review Pending Requests", desc: "Track booking requests & their status" },
              { href: "/coach/profile/edit",       label: "Update Your Profile",      desc: "Edit bio, pricing, timings" },
              { href: `/coach/${user.id}`,          label: "View Public Profile",      desc: "See how players see you" },
            ].map(({ href, label, desc }) => (
              <Link key={href} href={href} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{label}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{desc}</p>
                </div>
                <ChevronRight size={14} color="#6b7280" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
