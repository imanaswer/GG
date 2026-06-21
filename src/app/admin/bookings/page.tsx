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
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{value == null ? "—" : value}</div>
      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
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
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Bookings</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Select a category to manage its bookings.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {CARDS.map(({ key, label, icon: Icon }) => {
              const m = data?.[key];
              return (
                <Link key={key} href={`/admin/bookings/${key}`} style={{
                  textDecoration: "none", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: 18, display: "block", transition: "border-color .15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(152,8,8,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color="#980808" />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{label}</div>
                    <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{m ? `${m.total} total` : "…"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Metric label="Pending" value={m?.pending ?? 0} />
                    <Metric label="Active" value={m?.active ?? 0} />
                    <Metric label="Completed" value={m?.completed ?? 0} />
                    <Metric label="Cancelled" value={m?.cancelled ?? 0} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
