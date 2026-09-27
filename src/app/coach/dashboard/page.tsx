"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, Star, Clock, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/Shared";
import { AgreementStatusBadge } from "@/components/coachAgreement/AgreementStatusBadge";

export default function CoachDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "coach")) router.push("/coach/login");
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

  type Me = {
    id: string; name: string; sport: string; type: string; skillLevel: string; price: string; timing: string;
    location: string; address: string; phone: string; email: string; status: string; rating: number; reviewCount: number;
    totalSeats: number; seatsLeft: number; imageUrl: string;
    batches: { id: string; day: string; time: string; level: string; seats: number }[];
    stats: { pending: number; approved: number; completed: number; reviews: number; totalBookings: number };
  };
  const { data: me, isError: noProfile } = useQuery<Me>({
    queryKey: ["coach-me"],
    queryFn: async () => {
      const r = await fetch("/api/coach/me");
      if (!r.ok) throw new Error("no profile");
      return (await r.json()).data;
    },
    enabled: !!user && user.role === "coach",
    retry: false,
  });

  const { data: agreement } = useQuery<{ signed: boolean; currentVersion: string; agreement: { id: string; agreementNumber: string; agreementVersion: string; acceptedAt: string; status: string } | null }>({
    queryKey: ["coach-agreement"],
    queryFn: () => fetch("/api/coach/agreements").then(r => r.json()).then(d => d.data ?? d),
    enabled: !!user,
  });

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#080808" }}><PremiumNav /></div>;

  const stats = [
    { icon: Calendar, label: "Pending Requests",  value: me?.stats.pending ?? bookings?.pending ?? "—",   color: "#eab308" },
    { icon: Users,    label: "Approved Students", value: me?.stats.approved ?? bookings?.approved ?? "—", color: "#4ade80" },
    { icon: Star,     label: "Your Rating",        value: me ? (me.reviewCount ? me.rating.toFixed(1) : "New") : "—",  color: "#fff" },
    { icon: Clock,    label: "Active Batches",     value: me?.batches.length ?? "—",    color: "#60a5fa" },
  ];

  const statusLabel: Record<string, string> = { active: "Live on Game Ground", pending_approval: "Awaiting approval", inactive: "Paused by admin" };

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
            <Link href="/coach/dashboard/bookings" style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "#fff", color: "#000", textDecoration: "none" }}>
              Manage Bookings
            </Link>
            <Link href="/coach/profile/edit" style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}>
              Edit Profile
            </Link>
          </div>
        </div>

        {noProfile && (
          <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, color: "#eab308", fontSize: 13 }}>
            No coach profile is linked to this account yet. If the Game Ground team created your profile, ask them to send your portal invite to <strong>{user.email}</strong>.
          </div>
        )}

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

        {me && (
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Your Profile</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: me.status === "active" ? "rgba(74,222,128,0.12)" : "rgba(234,179,8,0.12)", color: me.status === "active" ? "#4ade80" : "#eab308", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {statusLabel[me.status] ?? me.status}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {[
                ["Sport", me.sport], ["Type", me.type], ["Level", me.skillLevel], ["Price", me.price],
                ["Timing", me.timing || "—"], ["Location", me.location], ["Seats left", `${me.seatsLeft} / ${me.totalSeats}`],
                ["Phone", me.phone || "—"], ["Email", me.email], ["Completed sessions", String(me.stats.completed)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, wordBreak: "break-word" }}>{v}</div>
                </div>
              ))}
            </div>
            {me.batches.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Batches</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {me.batches.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#d1d5db", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                      <span>{b.day} · {b.time} · {b.level}</span>
                      <span style={{ color: b.seats > 0 ? "#4ade80" : "#ef4444", fontWeight: 700 }}>{b.seats} seats</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Recent Bookings</h2>
              <Link href="/coach/dashboard/bookings" style={{ fontSize: 12, color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
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
              { href: me ? `/coach/${me.id}` : "/learn", label: "View Public Profile",  desc: "See how players see you" },
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

        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px", marginTop: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Legal Documents</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Coach Partnership Agreement</p>
              {agreement?.signed && agreement.agreement ? (
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Version {agreement.agreement.agreementVersion} · Signed {new Date(agreement.agreement.acceptedAt).toLocaleDateString()} · {agreement.agreement.agreementNumber}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Not signed yet</p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {agreement?.signed && agreement.agreement ? (
                <>
                  <AgreementStatusBadge status={agreement.agreement.status} />
                  <a href={`/api/coach/agreements/${agreement.agreement.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none", fontWeight: 600 }}>View Agreement</a>
                  <a href={`/api/coach/agreements/${agreement.agreement.id}/pdf`} style={{ fontSize: 13, color: "#000", background: "#fff", padding: "8px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>Download PDF</a>
                </>
              ) : (
                <Link href="/onboarding-terms" style={{ fontSize: 13, color: "#000", background: "#fff", padding: "8px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>Sign now</Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
