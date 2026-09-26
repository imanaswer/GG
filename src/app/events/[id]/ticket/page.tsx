"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Ticket as TicketIcon } from "lucide-react";
import { useEvent } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";

export default function EventTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event, isLoading } = useEvent(id);
  const { user } = useAuth();
  const reg = event?.userRegistration ?? null;
  const hasTicket = !!reg && reg.status === "approved";

  if (isLoading) {
    return <main style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Loading ticket…</main>;
  }

  if (!event || !hasTicket) {
    return (
      <main style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No ticket available</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 18 }}>
            A ticket is issued only once your registration is approved.
          </p>
          <Link href={`/events/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 100, background: "#fff", color: "#000", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to event
          </Link>
        </div>
      </main>
    );
  }

  const isFree = event.entryFeeAmount === 0;

  return (
    <main style={{ background: "#050505", minHeight: "100vh", padding: "40px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div className="ticket-card" style={{ width: "100%", maxWidth: 460, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#fff,#fff)", padding: "18px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <TicketIcon size={20} color="#fff" />
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>Event ticket</span>
        </div>
        <div style={{ padding: "22px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 14 }}>{event.title}</h1>
          {[
            ["Attendee", user?.name ?? "—"],
            ["Team", reg!.teamName || "—"],
            ["Date", event.date || (event.startDate ? new Date(event.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—")],
            ["Venue", [event.location, event.address].filter(Boolean).join(" · ") || "—"],
            ["Organizer", event.organizer || "—"],
            ["Entry", isFree ? "Free" : `${event.entryFee} · ${reg!.paymentStatus}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Booking reference</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#ff6b74", fontFamily: "monospace", letterSpacing: "0.05em", wordBreak: "break-all" }}>{reg!.id}</p>
          </div>
        </div>
      </div>

      <div className="ticket-actions" style={{ display: "flex", gap: 10 }}>
        <button onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 44, padding: "0 20px", borderRadius: 100, background: "#fff", color: "#000", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Printer size={15} /> Print / Save as PDF
        </button>
        <Link href={`/events/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 44, padding: "0 20px", borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
          <ArrowLeft size={15} /> Back to event
        </Link>
      </div>

      <style>{`
        @media print {
          body { background: #fff !important; }
          .ticket-actions { display: none !important; }
          main { background: #fff !important; padding: 0 !important; }
          .ticket-card { border: 1px solid #000 !important; box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}
