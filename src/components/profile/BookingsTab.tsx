"use client";
import { bucketByStatus, coachBookingGroupStatus } from "@/lib/profileGrouping";
import type { Booking, ProfileRegItem, UserProfile } from "@/hooks/useData";

const STATUS_GROUPS = [
  { key: "upcoming" as const, label: "Upcoming" },
  { key: "completed" as const, label: "Completed" },
  { key: "cancelled" as const, label: "Cancelled" },
];

function Row({ title, sub, status }: { title: string; sub: string; status: string }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "capitalize", alignSelf: "center" }}>{status}</span>
    </div>
  );
}

function TypeSection<T>({ label, items, statusOf, render }: { label: string; items: T[]; statusOf: (t: T) => "upcoming" | "completed" | "cancelled"; render: (t: T) => React.ReactNode }) {
  if (!items.length) return null;
  const buckets = bucketByStatus(items, statusOf);
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {STATUS_GROUPS.map(g => buckets[g.key].length > 0 && (
          <div key={g.key}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{g.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{buckets[g.key].map(render)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingsTab({ bookings, registrations }: { bookings: Booking[]; registrations: UserProfile["registrations"] }) {
  const empty = !bookings.length && !registrations?.camps.length && !registrations?.events.length && !registrations?.workshops.length;
  if (empty) return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", padding: "20px 0" }}>No bookings yet.</div>;
  const regStatus = (r: ProfileRegItem) => r.groupStatus;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <TypeSection label="Coach Sessions" items={bookings} statusOf={b => coachBookingGroupStatus(b.status)}
        render={(b) => <Row key={b.id} title={b.coachName ?? "Coaching session"} sub={b.sport ?? "1:1"} status={b.status} />} />
      <TypeSection label="Workshops" items={registrations?.workshops ?? []} statusOf={regStatus}
        render={(r) => <Row key={r.id} title={r.title} sub={r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"} status={r.status} />} />
      <TypeSection label="Camps" items={registrations?.camps ?? []} statusOf={regStatus}
        render={(r) => <Row key={r.id} title={r.title} sub={r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"} status={r.status} />} />
      <TypeSection label="Events" items={registrations?.events ?? []} statusOf={regStatus}
        render={(r) => <Row key={r.id} title={r.title} sub={r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"} status={r.status} />} />
    </div>
  );
}
