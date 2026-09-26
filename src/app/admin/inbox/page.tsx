"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard }   from "@/components/admin/StatCard";
import { Badge }      from "@/components/admin/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IndianRupee, AlertTriangle, Inbox as InboxIcon, ExternalLink, CheckCircle2 } from "lucide-react";

type RefundDue = { id:string; amount:number; currency:string; entityType:string; entityName:string; userName:string; userEmail:string; razorpayPaymentId:string|null; since:string; ageDays:number };
type Orphan    = { id:string; amount:number; entityType:string; entityName:string; razorpayPaymentId:string|null; capturedAt:string|null; ageDays:number };
type ActionItem= { id:string; type:string; title:string; body:string|null; link:string|null; createdAt:string; ageDays:number; claimedById:string|null; claimedByName:string|null; claimStale:boolean; undelivered:boolean };
type Inbox = {
  refundsDue: RefundDue[]; orphanedCharges: Orphan[]; needsAction: ActionItem[];
  totals: { refundsDue:number; refundsDuePaise:number; orphanedCharges:number; needsAction:number };
};

const rupees = (paise: number) => `₹\u2009${Math.round(paise / 100).toLocaleString("en-IN")}`;
const age = (d: number) => d === 0 ? "today" : d === 1 ? "1 day" : `${d} days`;

const primaryBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 100, border: "none", background: "#fff", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#d1d5db", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const actionBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(96, 165, 250, 0.4)", background: "rgba(96, 165, 250, 0.1)", color: "#60a5fa", fontSize: 12, fontWeight: 700, cursor: "pointer" };

function Section({ title, hint, count, children }: { title: string; hint: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "0 8px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{title}</h2>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: count > 0 ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.05)", color: count > 0 ? "#eab308" : "#9ca3af" }}>{count} ITEMS</span>
      </div>
      <p style={{ margin: "0 8px 20px", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{hint}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "40px 24px", textAlign: "center", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{children}</div>;
}

export default function AdminInbox() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Inbox>({
    queryKey: ["admin", "inbox"],
    queryFn: () => fetch("/api/admin/inbox").then(r => r.json()).then(j => j.data),
    refetchInterval: 60_000,
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "claim" | "unclaim" | "resolve" }) => {
      const r = await fetch("/api/admin/inbox", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "Failed");
      return j;
    },
    onSuccess: (_d, v) => {
      toast.success(v.action === "resolve" ? "Marked done" : v.action === "claim" ? "Claimed" : "Released");
      qc.invalidateQueries({ queryKey: ["admin", "inbox"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = data?.totals;

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ marginBottom: 40, padding: "0 8px" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, fontWeight: 400, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>Inbox</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "8px 0 0", letterSpacing: "0.02em" }}>
            Everything waiting on a human. Derived from live state, so it is right even if an alert never arrived.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 48 }}>
          <StatCard value={rupees(t?.refundsDuePaise ?? 0)} label="Money we owe" sub={`${t?.refundsDue ?? 0} refunds due`} icon={IndianRupee} color="#fb923c" />
          <StatCard value={String(t?.orphanedCharges ?? 0)} label="Orphaned charges" sub="Paid, nothing granted" icon={AlertTriangle} color={t?.orphanedCharges ? "#fff" : undefined} />
          <StatCard value={String(t?.needsAction ?? 0)} label="Needs action" sub="Unresolved items" icon={InboxIcon} />
        </div>

        {isLoading && <Empty>Loading…</Empty>}

        <Section
          title="Refunds due" count={t?.refundsDue ?? 0}
          hint="Cancelled and paid. The seat is back on sale; the money is not. Refund in Razorpay using the payment id, then close it out on the booking row."
        >
          {data && data.refundsDue.length === 0
            ? <Empty>Nothing owed. Everything is settled.</Empty>
            : (
              <>
                {data?.refundsDue.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                    <div style={{ minWidth: 100 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: r.ageDays >= 7 ? "#ef4444" : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>WAITING</div>
                      <div style={{ fontSize: 16, fontFamily: "var(--font-serif)", color: "#fff", marginTop: 4 }}>{age(r.ageDays)}</div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 400, fontFamily: "var(--font-serif)", color: "#fff" }}>{rupees(r.amount)}</span>
                        <Badge status={r.entityType} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{r.entityName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        <span>{r.userName} · {r.userEmail}</span>
                        <span>ID: {r.razorpayPaymentId ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
        </Section>

        <Section
          title="Orphaned charges" count={t?.orphanedCharges ?? 0}
          hint="Razorpay captured the money but no payment record exists — the player closed the tab before it landed. Either refund it or complete the registration by hand."
        >
          {data && data.orphanedCharges.length === 0
            ? <Empty>None. Every capture reached a booking.</Empty>
            : (
              <>
                {data?.orphanedCharges.map(o => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                    <div style={{ minWidth: 100 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>CAPTURED</div>
                      <div style={{ fontSize: 16, fontFamily: "var(--font-serif)", color: "#fff", marginTop: 4 }}>{age(o.ageDays)} ago</div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 400, fontFamily: "var(--font-serif)", color: "#fff" }}>{rupees(o.amount)}</span>
                        <Badge status={o.entityType} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{o.entityName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        <span>Order: {o.id}</span>
                        <span>Razorpay: {o.razorpayPaymentId ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
        </Section>

        <Section
          title="Needs action" count={t?.needsAction ?? 0}
          hint="Approvals and incidents waiting on someone. Claim one so two people don't work it at once."
        >
          {data && data.needsAction.length === 0
            ? <Empty>Clear. Nothing is waiting.</Empty>
            : (
              <>
                {data?.needsAction.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                    <div style={{ minWidth: 100 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: a.ageDays >= 2 ? "#eab308" : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>WAITING</div>
                      <div style={{ fontSize: 16, fontFamily: "var(--font-serif)", color: "#fff", marginTop: 4 }}>{age(a.ageDays)}</div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{a.title}</div>
                      {a.body && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{a.body}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                        {a.link && (
                          <a href={a.link} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#60a5fa", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            Open details <ExternalLink size={12} />
                          </a>
                        )}
                        {a.undelivered && (
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 100 }}>Alert undelivered</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ minWidth: 140, padding: "0 20px", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>HANDLED BY</div>
                      {a.claimedByName
                        ? <div style={{ fontSize: 13, color: a.claimStale ? "#eab308" : "#fff", fontWeight: 700 }}>
                            {a.claimedByName}
                            {a.claimStale && <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>Stale</div>}
                          </div>
                        : <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Unassigned</div>}
                    </div>

                    <div style={{ display: "flex", gap: 8, paddingLeft: 12 }}>
                      {a.claimedById
                        ? <button style={ghostBtn} onClick={() => act.mutate({ id: a.id, action: "unclaim" })}>Release</button>
                        : <button style={primaryBtn} onClick={() => act.mutate({ id: a.id, action: "claim" })}>Claim</button>}
                      <button style={actionBtn} onClick={() => act.mutate({ id: a.id, action: "resolve" })}><CheckCircle2 size={14}/> Done</button>
                    </div>
                  </div>
                ))}
              </>
            )}
        </Section>
      </AdminShell>
    </AdminGuard>
  );
}
