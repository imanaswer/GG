"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard }   from "@/components/admin/StatCard";
import { Badge }      from "@/components/admin/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IndianRupee, AlertTriangle, Inbox as InboxIcon, ExternalLink } from "lucide-react";

type RefundDue = { id:string; amount:number; currency:string; entityType:string; entityName:string; userName:string; userEmail:string; razorpayPaymentId:string|null; since:string; ageDays:number };
type Orphan    = { id:string; amount:number; entityType:string; entityName:string; razorpayPaymentId:string|null; capturedAt:string|null; ageDays:number };
type ActionItem= { id:string; type:string; title:string; body:string|null; link:string|null; createdAt:string; ageDays:number; claimedById:string|null; claimedByName:string|null; claimStale:boolean; undelivered:boolean };
type Inbox = {
  refundsDue: RefundDue[]; orphanedCharges: Orphan[]; needsAction: ActionItem[];
  totals: { refundsDue:number; refundsDuePaise:number; orphanedCharges:number; needsAction:number };
};

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const age = (d: number) => d === 0 ? "today" : d === 1 ? "1 day" : `${d} days`;

const card: React.CSSProperties = { background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 22 };
const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle" };
const btn = (danger = false): React.CSSProperties => ({
  padding: "5px 11px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  border: "1px solid", background: "transparent",
  color: danger ? "#f87171" : "#60a5fa", borderColor: danger ? "rgba(248,113,113,0.35)" : "rgba(96,165,250,0.35)",
});

function Section({ title, hint, count, children }: { title: string; hint: string; count: number; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{title}</span>
          <span style={{ fontSize: 12, color: count > 0 ? "#eab308" : "#4b5563", fontWeight: 700 }}>{count}</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{hint}</p>
      </div>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ padding: "18px 16px", margin: 0, fontSize: 13, color: "#4b5563" }}>{children}</p>;
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
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>Inbox</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Everything waiting on a human. Derived from live state, so it is right even if an alert never arrived.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 22 }}>
          <StatCard value={rupees(t?.refundsDuePaise ?? 0)} label="Money we owe" sub={`${t?.refundsDue ?? 0} refunds due`} icon={IndianRupee} color="#fb923c" />
          <StatCard value={String(t?.orphanedCharges ?? 0)} label="Orphaned charges" sub="Paid, nothing granted" icon={AlertTriangle} color={t?.orphanedCharges ? "#f87171" : undefined} />
          <StatCard value={String(t?.needsAction ?? 0)} label="Needs action" sub="Unresolved items" icon={InboxIcon} />
        </div>

        {isLoading && <Empty>Loading…</Empty>}

        <Section
          title="Refunds due" count={t?.refundsDue ?? 0}
          hint="Cancelled and paid. The seat is back on sale; the money is not. Refund in Razorpay using the payment id, then close it out on the booking row."
        >
          {data && data.refundsDue.length === 0
            ? <Empty>Nothing owed. </Empty>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#111" }}>
                  <th style={th}>Waiting</th><th style={th}>Amount</th><th style={th}>Who</th><th style={th}>What</th><th style={th}>Razorpay payment id</th>
                </tr></thead>
                <tbody>
                  {data?.refundsDue.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...td, color: r.ageDays >= 7 ? "#f87171" : "#d1d5db", fontWeight: r.ageDays >= 7 ? 700 : 400 }}>{age(r.ageDays)}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#fff" }}>{rupees(r.amount)}</td>
                      <td style={td}>{r.userName}<div style={{ fontSize: 11, color: "#6b7280" }}>{r.userEmail}</div></td>
                      <td style={td}><Badge status={r.entityType} /> <span style={{ marginLeft: 6 }}>{r.entityName}</span></td>
                      <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#9ca3af" }}>{r.razorpayPaymentId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Section>

        <Section
          title="Orphaned charges" count={t?.orphanedCharges ?? 0}
          hint="Razorpay captured the money but no payment record exists — the player closed the tab before it landed. Either refund it or complete the registration by hand."
        >
          {data && data.orphanedCharges.length === 0
            ? <Empty>None. Every capture reached a booking.</Empty>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#111" }}>
                  <th style={th}>Captured</th><th style={th}>Amount</th><th style={th}>What</th><th style={th}>Razorpay payment id</th><th style={th}>Order</th>
                </tr></thead>
                <tbody>
                  {data?.orphanedCharges.map(o => (
                    <tr key={o.id}>
                      <td style={{ ...td, color: "#f87171", fontWeight: 700 }}>{age(o.ageDays)} ago</td>
                      <td style={{ ...td, fontWeight: 700, color: "#fff" }}>{rupees(o.amount)}</td>
                      <td style={td}><Badge status={o.entityType} /> <span style={{ marginLeft: 6 }}>{o.entityName}</span></td>
                      <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#9ca3af" }}>{o.razorpayPaymentId ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "#6b7280" }}>{o.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Section>

        <Section
          title="Needs action" count={t?.needsAction ?? 0}
          hint="Approvals and incidents waiting on someone. Claim one so two people don't work it at once."
        >
          {data && data.needsAction.length === 0
            ? <Empty>Clear. Nothing is waiting.</Empty>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#111" }}>
                  <th style={th}>Waiting</th><th style={th}>Item</th><th style={th}>Handled by</th><th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr></thead>
                <tbody>
                  {data?.needsAction.map(a => (
                    <tr key={a.id}>
                      <td style={{ ...td, color: a.ageDays >= 2 ? "#eab308" : "#d1d5db" }}>{age(a.ageDays)}</td>
                      <td style={td}>
                        <div style={{ color: "#fff", fontWeight: 600 }}>{a.title}</div>
                        {a.body && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{a.body}</div>}
                        {a.undelivered && (
                          <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>
                            Alert never delivered — nobody was told about this one.
                          </div>
                        )}
                        {a.link && (
                          <a href={a.link} style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                            Open <ExternalLink size={11} />
                          </a>
                        )}
                      </td>
                      <td style={td}>
                        {a.claimedByName
                          ? <span style={{ color: a.claimStale ? "#eab308" : "#9ca3af" }}>
                              {a.claimedByName}{a.claimStale && <span style={{ fontSize: 11 }}> · stale, can be taken</span>}
                            </span>
                          : <span style={{ color: "#4b5563" }}>—</span>}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {a.claimedById
                          ? <button style={btn()} onClick={() => act.mutate({ id: a.id, action: "unclaim" })}>Release</button>
                          : <button style={btn()} onClick={() => act.mutate({ id: a.id, action: "claim" })}>Claim</button>}
                        <button style={{ ...btn(true), marginLeft: 8 }} onClick={() => act.mutate({ id: a.id, action: "resolve" })}>Done</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Section>
      </AdminShell>
    </AdminGuard>
  );
}
