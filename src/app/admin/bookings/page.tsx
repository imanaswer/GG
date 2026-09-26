"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Gamepad2, Wrench, Tent, Trophy } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import type { LandingMetrics } from "@/lib/adminBookings/types";

const CARDS = [
  { key: "coaches",       label: "Coaches",       icon: GraduationCap },
  { key: "play-sessions", label: "Play Sessions", icon: Gamepad2 },
  { key: "workshops",     label: "Workshops",     icon: Wrench },
  { key: "camps",         label: "Camps",         icon: Tent },
  { key: "events",        label: "Events",        icon: Trophy },
] as const;

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 24, fontWeight: 400, fontFamily: "var(--font-serif)", color: "#fff", lineHeight: 1 }}>{value == null ? "—" : value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

export default function BookingsLanding() {
  const { data } = useQuery<Record<string, LandingMetrics>>({
    queryKey: ["admin", "bookings", "landing"],
    queryFn: () => fetch("/api/admin/bookings/landing").then(r => r.json()),
  });

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ marginBottom: 40, padding: "0 8px" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, fontWeight: 400, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>Bookings</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "8px 0 0", letterSpacing: "0.02em" }}>Select a category to manage its bookings.</p>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {CARDS.map(({ key, label, icon: Icon }) => {
            const m = data?.[key];
            return (
              <Link key={key} href={`/admin/bookings/${key}`} style={{
                textDecoration: "none", 
                background: "rgba(255,255,255,0.015)", 
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 24, 
                padding: 24, 
                display: "block", 
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 100, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{label}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                     {m ? <span style={{ color: "#fff" }}>{m.total}</span> : "—"} TOTAL
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, padding: "16px 20px", background: "rgba(0,0,0,0.4)", borderRadius: 16 }}>
                  <Metric label="Pending" value={m?.pending ?? 0} />
                  <Metric label="Active" value={m?.active ?? 0} />
                  <Metric label="Completed" value={m?.completed ?? 0} />
                  <Metric label="Cancelled" value={m?.cancelled ?? 0} />
                </div>
              </Link>
            );
          })}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
