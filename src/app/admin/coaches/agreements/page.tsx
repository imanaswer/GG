"use client";
import { useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AgreementStatusBadge } from "@/components/coachAgreement/AgreementStatusBadge";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, ArrowRight, Calendar, Tag } from "lucide-react";

type Row = { id: string; agreementNumber: string; fullName: string; email: string; agreementVersion: string; acceptedAt: string; status: string };

const inputStyle: React.CSSProperties = { padding: "12px 20px", borderRadius: 100, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" };
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 40, cursor: "pointer", backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>')`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center" };
const optionStyle: React.CSSProperties = { background: "#111", color: "#fff" };

type Option = { value: string; label: string };

function CustomSelect({ value, onChange, options, style }: { value: string; onChange: (value: string) => void; options: Option[]; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];
  
  return (
    <div style={{ position: "relative" }} onBlur={() => setTimeout(() => setOpen(false), 150)} tabIndex={0}>
      <div 
        onClick={() => setOpen(!open)} 
        style={{ ...style, display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
      >
        <span>{selectedOption.label}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: "100%", background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden", zIndex: 20, padding: 4 }}>
          {options.map((o) => (
            <div 
              key={o.value} 
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
              style={{ padding: "10px 16px", fontSize: 13, color: "#fff", cursor: "pointer", borderRadius: 12, transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "SIGNED", label: "Signed" },
    { value: "PENDING_SIGNATURE", label: "Pending Signature" },
    { value: "EXPIRED", label: "Expired" },
    { value: "SUPERSEDED", label: "Superseded" },
  ];

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff", letterSpacing: "-0.01em" }}>Coach Agreements</h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: "0.02em" }}>Signed Coach Partnership Agreements</p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            <input placeholder="Search name, email, agreement #" value={q} onChange={e => setQ(e.target.value)} style={{ ...inputStyle, minWidth: 280, flex: 1 }} />
            <CustomSelect value={status} onChange={setStatus} options={statusOptions} style={{ ...selectStyle, width: 200 }} />
            <input placeholder="Version (e.g. v1.0)" value={version} onChange={e => setVersion(e.target.value)} style={{ ...inputStyle, width: 160 }} />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} title="From date" />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} title="To date" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Header Row */}
            <div className="admin-agreements-header" style={{ display: "flex", alignItems: "center", padding: "0 32px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
              <div style={{ width: 160, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Agreement #</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Coach Info</div>
              <div style={{ width: 160, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Details</div>
              <div style={{ width: 140, fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
              <div style={{ width: 140, textAlign: "right", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</div>
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 24 }}>No agreements found.</div>
            ) : rows.map(r => (
              <div key={r.id} className="admin-agreement-row" style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 100, padding: "16px 32px", gap: 16, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                
                {/* Agreement # */}
                <div className="admin-agreement-number" style={{ width: 160, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={16} color="#9ca3af" />
                  </div>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "#fff", fontWeight: 500 }}>{r.agreementNumber}</span>
                </div>

                {/* Coach Info */}
                <div className="admin-agreement-coach" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{r.fullName}</span>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{r.email}</span>
                </div>

                {/* Details (Version & Date) */}
                <div className="admin-agreement-details" style={{ width: 160, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>
                    <Tag size={12} color="#6b7280" /> {r.agreementVersion}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>
                    <Calendar size={12} color="#6b7280" /> {new Date(r.acceptedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Status */}
                <div className="admin-agreement-status" style={{ width: 140 }}>
                  <AgreementStatusBadge status={r.status} />
                </div>

                {/* Actions */}
                <div className="admin-agreement-actions" style={{ width: 140, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                  <a href={`/api/coach/agreements/${r.id}/pdf`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.05)", color: "#fff", textDecoration: "none", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} title="Download PDF">
                    <Download size={14} />
                  </a>
                  <Link href={`/admin/coaches/agreements/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "#fff", color: "#000", fontSize: 12, fontWeight: 700, textDecoration: "none", transition: "transform 0.1s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    View <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 768px) {
            .admin-agreements-header { display: none !important; }
            .admin-agreement-row[style] {
              display: grid !important;
              grid-template-columns: 1fr auto !important;
              grid-template-areas:
                "coach number"
                "details details"
                "status actions" !important;
              border-radius: 24px !important;
              padding: 20px !important;
              gap: 20px !important;
            }
            .admin-agreement-number[style] {
              grid-area: number;
              width: auto !important;
            }
            .admin-agreement-coach[style] {
              grid-area: coach;
              width: 100% !important;
              flex: none !important;
            }
            .admin-agreement-details[style] {
              grid-area: details;
              width: 100% !important;
              background: rgba(0,0,0,0.2) !important;
              padding: 16px !important;
              border-radius: 16px !important;
              flex-direction: row !important;
              justify-content: space-between !important;
            }
            .admin-agreement-status[style] {
              grid-area: status;
              width: auto !important;
              display: flex !important;
              align-items: center !important;
            }
            .admin-agreement-actions[style] {
              grid-area: actions;
              width: auto !important;
              justify-content: flex-end !important;
            }
          }
        `}</style>
      </AdminShell>
    </AdminGuard>
  );
}
