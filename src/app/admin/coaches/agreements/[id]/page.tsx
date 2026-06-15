"use client";
import { useParams } from "next/navigation";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AgreementStatusBadge } from "@/components/coachAgreement/AgreementStatusBadge";
import { useQuery } from "@tanstack/react-query";

type Section = { heading: string; body: string };
type Agreement = {
  id: string; agreementNumber: string; fullName: string; email: string; signatureName: string;
  agreementVersion: string; acceptedAt: string; ipAddress: string; userAgent: string;
  agreementHash: string; status: string; personalSnapshot: Record<string, string> | null;
};
type AuditLog = { id: string; action: string; actorRole: string; createdAt: string };
type Resp = { agreement: Agreement; content: { sections: Section[]; effectiveDate: string; jurisdiction: string } | null; auditLogs: AuditLog[]; error?: string };

const panel: React.CSSProperties = { background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 16 };
const label: React.CSSProperties = { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 };
const value: React.CSSProperties = { fontSize: 14, color: "#fff", marginTop: 2 };
const btn: React.CSSProperties = { padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block" };

function Field({ k, v }: { k: string; v?: string | null }) {
  return (<div style={{ marginBottom: 12 }}><div style={label}>{k}</div><div style={value}>{v || "—"}</div></div>);
}

export default function AdminAgreementDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["admin-agreement", id],
    queryFn: () => fetch(`/api/admin/coaches/agreements/${id}`).then(r => r.json()),
    enabled: !!id,
    // Each fetch writes a VIEW row to the legal access log — don't refetch on
    // window focus or background staleness, so one visit ≈ one logged view.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const a = data?.agreement;
  const ps = a?.personalSnapshot ?? {};

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {isLoading ? (
            <p style={{ color: "#9ca3af" }}>Loading…</p>
          ) : !a ? (
            <p style={{ color: "#9ca3af" }}>{data?.error ?? "Agreement not found."}</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>{a.agreementNumber}</h1>
                  <div style={{ marginTop: 6 }}><AgreementStatusBadge status={a.status} /></div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={`/api/coach/agreements/${a.id}/pdf`} style={{ ...btn, background: "#e63946", color: "#fff" }}>Download PDF</a>
                  <a href={`/api/coach/agreements/${a.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>View PDF</a>
                </div>
              </div>

              <div style={panel}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Coach Information</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  <Field k="Full Legal Name" v={a.fullName} />
                  <Field k="Email" v={a.email} />
                  <Field k="Phone" v={ps.phone} />
                  <Field k="Date of Birth" v={ps.dateOfBirth} />
                  <Field k="Address" v={ps.address} />
                  <Field k="Emergency Contact" v={ps.emergencyContactName ? `${ps.emergencyContactName} (${ps.emergencyContactNumber ?? ""})` : null} />
                  <Field k="Signature Name" v={a.signatureName} />
                  <Field k="Signed Date" v={ps.signedDate} />
                </div>
              </div>

              <div style={panel}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Agreement Record</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  <Field k="Version" v={a.agreementVersion} />
                  <Field k="Accepted At" v={new Date(a.acceptedAt).toLocaleString()} />
                  <Field k="IP Address" v={a.ipAddress} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={label}>User Agent</div>
                  <div style={{ ...value, fontSize: 12, color: "#9ca3af", wordBreak: "break-all" }}>{a.userAgent}</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={label}>Integrity Hash (SHA-256)</div>
                  <div style={{ ...value, fontSize: 12, fontFamily: "monospace", color: "#9ca3af", wordBreak: "break-all" }}>{a.agreementHash}</div>
                </div>
              </div>

              <div style={panel}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Agreement Content ({a.agreementVersion})</h2>
                {data?.content ? (
                  <>
                    <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Effective {data.content.effectiveDate} · {data.content.jurisdiction}</p>
                    {data.content.sections.map(s => (
                      <div key={s.heading} style={{ marginBottom: 14 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{s.heading}</h3>
                        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{s.body}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>The exact signed version ({a.agreementVersion}) is archived and not in the active registry. The full accepted text is preserved in the downloadable PDF.</p>
                )}
              </div>

              <div style={panel}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Access Log</h2>
                {!data?.auditLogs?.length ? (
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>No access recorded yet.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280", fontWeight: 700 }}>Action</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280", fontWeight: 700 }}>Actor</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280", fontWeight: 700 }}>When</th>
                    </tr></thead>
                    <tbody>
                      {data.auditLogs.map(l => (
                        <tr key={l.id}>
                          <td style={{ padding: "8px 10px", fontSize: 13, color: "#e5e7eb" }}>{l.action}</td>
                          <td style={{ padding: "8px 10px", fontSize: 13, color: "#e5e7eb", textTransform: "capitalize" }}>{l.actorRole}</td>
                          <td style={{ padding: "8px 10px", fontSize: 13, color: "#9ca3af" }}>{new Date(l.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
