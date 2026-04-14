"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { useBookings, useCancelBooking } from "@/hooks/useData";
import { StatusBadge } from "@/components/Shared";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CoachBookings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data: bookings, isLoading } = useBookings();
  const [confirming, setConfirming] = useState<string | null>(null);
  const cancel = useCancelBooking();

  useEffect(() => {
    if (!loading && (!user || user.role !== "coach")) router.push("/login");
  }, [user, loading, router]);

  const confirm = async (bookingId: string) => {
    setConfirming(bookingId);
    const r = await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bookingId, status: "confirmed" }) });
    setConfirming(null);
    if (r.ok) toast.success("Booking confirmed! Player notified.");
    else toast.error("Failed to confirm booking");
  };

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#080808" }}><NavBar /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Link href="/coach/dashboard" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Booking Requests</h1>
        </div>

        {isLoading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : !bookings?.length ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#9ca3af", fontSize: 16 }}>No bookings yet. Share your profile link to get started!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...bookings].sort((a, b) => a.status === "pending" ? -1 : 1).map(b => (
              <div key={b.id} style={{ background: "#141414", border: `1px solid ${b.status === "pending" ? "rgba(234,179,8,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 18, flexShrink: 0 }}>
                      {(b as { playerName?: string }).playerName?.[0] ?? "P"}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{(b as { playerName?: string }).playerName ?? "Player"}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>Requested {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {b.note && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>"{b.note}"</p>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge status={b.status} />
                    {b.status === "pending" && (
                      <>
                        <button onClick={() => confirm(b.id)} disabled={confirming === b.id} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                          {confirming === b.id ? "…" : "Confirm"}
                        </button>
                        <button onClick={() => cancel.mutate(b.id)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
