"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { StatCard }    from "@/components/admin/StatCard";
import { useQuery }    from "@tanstack/react-query";
import { IndianRupee, Download } from "lucide-react";

type Summary   = { total:number; thisMonth:number; thisWeek:number; avgPerTransaction:number };
type Breakdown = { category:string; transactions:number; total:number; avg:number };
type Tx        = { id:string; type:string; description:string; player?:string; amount:number; date:string; status:string };

function exportCSV(txs: Tx[]) {
  const rows = txs.map(t => [`"${t.id}"`,`"${t.type}"`,`"${t.description}"`,`"${t.player ?? ""}"`,t.amount,`"${t.status}"`,`"${new Date(t.date).toLocaleDateString("en-IN")}"`].join(","));
  const csv  = [`"ID","Type","Description","Player","Amount","Status","Date"`, ...rows].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv])); a.download = "transactions.csv"; a.click();
}

export default function AdminRevenue() {
  const { data } = useQuery<{ summary: Summary; breakdown: Breakdown[]; transactions: Tx[] }>({ queryKey: ["admin-revenue"], queryFn: () => fetch("/api/admin/revenue").then(r => r.json()) });
  const [filter, setFilter] = useState("all");
  const s  = data?.summary;
  const txs = (data?.transactions ?? []).filter(t => filter === "all" || t.type === filter);

  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Revenue Dashboard</h1>
            <button onClick={() => exportCSV(txs)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Download size={14} />Export CSV
            </button>
          </div>

          {/* Top summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
            <StatCard value={`₹${(s?.total ?? 0).toLocaleString("en-IN")}`}          label="Total Revenue"   sub="All time"    icon={IndianRupee} accent />
            <StatCard value={`₹${(s?.thisMonth ?? 0).toLocaleString("en-IN")}`}       label="This Month"      sub="April 2026"  />
            <StatCard value={`₹${(s?.thisWeek ?? 0).toLocaleString("en-IN")}`}        label="This Week"                         />
            <StatCard value={`₹${(s?.avgPerTransaction ?? 0).toLocaleString("en-IN")}`} label="Avg per Booking" sub="Paid only"  />
          </div>

          {/* Breakdown table */}
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Revenue by Category</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#111" }}>
                <tr>{["Category","Transactions","Total Revenue","Avg per Transaction"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {(data?.breakdown ?? []).map(b => (
                  <tr key={b.category}>
                    <td style={{ ...td, fontWeight: 600, color: "#fff" }}>{b.category}</td>
                    <td style={{ ...td, color: "#9ca3af" }}>{b.transactions}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#e63946", fontSize: 15 }}>₹{b.total.toLocaleString("en-IN")}</td>
                    <td style={{ ...td, color: "#9ca3af" }}>₹{b.avg.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transaction log */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Transaction Log</h2>
            <div style={{ display: "flex", gap: 6 }}>
              {["all","Camp","Event","Game"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: filter === f ? 700 : 500, border: "1px solid", cursor: "pointer", fontFamily: "inherit", background: filter === f ? "#e63946" : "transparent", color: filter === f ? "#fff" : "#9ca3af", borderColor: filter === f ? "#e63946" : "rgba(255,255,255,0.1)" }}>
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Type","Description","Player","Amount","Status","Date"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!txs.length ? (
                    <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No transactions yet</td></tr>
                  ) : txs.map(t => (
                    <tr key={t.id}>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>{t.type}</span></td>
                      <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                      <td style={{ ...td, color: "#9ca3af" }}>{t.player ?? "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#e63946" }}>₹{t.amount.toLocaleString("en-IN")}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>{t.status}</span></td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
