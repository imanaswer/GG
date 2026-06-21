"use client";
import { useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AgreementStatusBadge } from "@/components/coachAgreement/AgreementStatusBadge";
import { useQuery } from "@tanstack/react-query";

type Row = { id: string; agreementNumber: string; fullName: string; email: string; agreementVersion: string; acceptedAt: string; status: string };

const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, background: "#141414", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.07)" };
const td: React.CSSProperties = { padding: "12px", fontSize: 13, color: "#e5e7eb", borderBottom: "1px solid rgba(255,255,255,0.05)" };

export default function AdminAgreementsPage() {
  const [q, setQ] = useState("");
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (version) params.set("version", version);
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();

  const { data, isLoading } = useQuery<{ agreements: Row[] }>({
    queryKey: ["admin-agreements", qs],
    queryFn: () => fetch(`/api/admin/coaches/agreements${qs ? `?${qs}` : ""}`).then(r => r.json()),
  });
  const rows = data?.agreements ?? [];

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Coach Agreements</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Signed Coach Partnership Agreements</p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
            <input placeholder="Search name, email, agreement #" value={q} onChange={e => setQ(e.target.value)} style={{ ...inputStyle, minWidth: 240, flex: 1 }} />
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="">All statuses</option>
              <option value="SIGNED">Signed</option>
              <option value="PENDING_SIGNATURE">Pending Signature</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUPERSEDED">Superseded</option>
            </select>
            <input placeholder="Version (e.g. v1.0)" value={version} onChange={e => setVersion(e.target.value)} style={{ ...inputStyle, width: 130 }} />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} title="From date" />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} title="To date" />
          </div>

          <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Agreement #</th><th style={th}>Coach</th><th style={th}>Email</th>
                  <th style={th}>Version</th><th style={th}>Signed</th><th style={th}>Status</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td style={td} colSpan={7}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td style={td} colSpan={7}>No agreements found.</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...td, fontFamily: "monospace", color: "#fff" }}>{r.agreementNumber}</td>
                    <td style={td}>{r.fullName}</td>
                    <td style={td}>{r.email}</td>
                    <td style={td}>{r.agreementVersion}</td>
                    <td style={td}>{new Date(r.acceptedAt).toLocaleDateString()}</td>
                    <td style={td}><AgreementStatusBadge status={r.status} /></td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Link href={`/admin/coaches/agreements/${r.id}`} style={{ color: "#980808", textDecoration: "none", fontWeight: 600 }}>View</Link>
                        <a href={`/api/coach/agreements/${r.id}/pdf`} style={{ color: "#9ca3af", textDecoration: "none", fontWeight: 600 }}>PDF</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
