"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useAuth } from "@/context/AuthContext";
import { useBookings, useCancelBooking } from "@/hooks/useData";
import { StatusBadge } from "@/components/Shared";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const GROUPS = [
  { key: "pending",   label: "Pending Approval", match: (s: string) => s === "pending" },
  { key: "approved",  label: "Approved",         match: (s: string) => s === "approved" },
  { key: "completed", label: "Completed",        match: (s: string) => s === "completed" },
  { key: "rejected",  label: "Rejected",         match: (s: string) => s === "rejected" },
  { key: "cancelled", label: "Cancelled",        match: (s: string) => s === "cancelled" },
] as const;

export default function PlayerBookings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data: bookings, isLoading } = useBookings();
  const cancel = useCancelBooking();
  const [tab, setTab] = useState<(typeof GROUPS)[number]["key"]>("pending");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/bookings");
  }, [user, loading, router]);

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#080808" }}><PremiumNav /></div>;

  const group = GROUPS.find(g => g.key === tab)!;
  const list = (bookings ?? []).filter(b => group.match(b.status));

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Link href="/profile" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>My Coaching Sessions</h1>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {GROUPS.map(g => (
            <button key={g.key} onClick={() => setTab(g.key)}
              style={{ padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: tab === g.key ? "#e63946" : "transparent",
                color: tab === g.key ? "#fff" : "#9ca3af",
                border: `1px solid ${tab === g.key ? "#e63946" : "rgba(255,255,255,0.12)"}` }}>
              {g.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : !list.length ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#9ca3af", fontSize: 16 }}>No {group.label.toLowerCase()} sessions.</p>
            <Link href="/coach" style={{ color: "#e63946", fontSize: 14, textDecoration: "none" }}>Find a coach →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map(b => (
              <div key={b.id} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <Link href={`/coach/${b.coachId}`} style={{ fontSize: 15, fontWeight: 700, color: "#fff", textDecoration: "none" }}>{b.coachName ?? "Coach"}</Link>
                    {b.sport && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{b.sport}{b.location ? ` · ${b.location}` : ""}</p>}
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Requested {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {b.status === "rejected" && (
                  <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>Your booking request was rejected.</p>
                    {b.rejectionReason && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Reason: {b.rejectionReason}</p>}
                  </div>
                )}

                {(b.status === "pending" || b.status === "approved") && (
                  <button onClick={() => cancel.mutate(b.id)} disabled={cancel.isPending}
                    style={{ marginTop: 12, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel booking
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
