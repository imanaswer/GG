"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModal, FormInput, FormTextarea, FormSelect, FormRow, FormActions, DeleteConfirm } from "@/components/admin/AdminModal";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SPORTS, SKILL_LEVELS, WORKSHOP_SESSION_TYPES, WORKSHOP_AUDIENCE_TYPES, WORKSHOP_STATUSES } from "@/lib/taxonomy";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Pencil, Trash2 } from "lucide-react";
import { bookingRef } from "@/lib/bookingRef";

type Reg = {
  id: string; participantName: string; participantAge?: number;
  registrationType: string; workshopTitle?: string; workshopSport?: string;
  userName?: string; userEmail?: string; userPhone?: string;
  registeredAt: string; paymentStatus: string;
};

type Workshop = {
  id: string; title: string; sport: string; description: string;
  sessionType: string; sessionCount: number; sessionDuration: string;
  startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string;
  price: number; priceDisplay: string;
  ageGroup: string; audienceType: string; skillLevel: string;
  maxParticipants: number; participants: number;
  imageUrl: string; featured: boolean; status: string;
  highlights: string[]; requirements: string[];
  organizer: string; organizerContact: string;
  instructor?: { name?: string; bio?: string; imageUrl?: string; credentials?: string };
};

type FormData = Partial<Workshop> & {
  instructorName?: string;
  instructorBio?: string;
  instructorCredentials?: string;
};

const EMPTY: FormData = {
  title: "", sport: "Football", description: "",
  sessionType: "single", sessionCount: 1, sessionDuration: "",
  startDate: "", endDate: "", registrationDeadline: "",
  location: "", address: "", price: 0, priceDisplay: "",
  ageGroup: "", audienceType: "all", skillLevel: "All Levels",
  maxParticipants: 30,
  imageUrl: "", featured: false, status: "open",
  highlights: [], requirements: [],
  organizer: "", organizerContact: "",
  instructorName: "", instructorBio: "", instructorCredentials: "",
};

function toDateInput(d: string | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function exportCSV(data: Reg[], filter = "all") {
  const rows = data.map(r => [
    `"${bookingRef(r.id)}"`, `"${r.participantName}"`, r.participantAge ?? "", `"${r.registrationType}"`,
    `"${r.userName}"`, `"${r.userEmail}"`, `"${r.workshopTitle}"`,
    `"${new Date(r.registeredAt).toLocaleDateString("en-IN")}"`, `"${r.id}"`
  ].join(","));
  const csv = [`"ID","Participant","Age","Type","User","Email","Workshop","Date","Internal ID"`, ...rows].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv])); a.download = `workshop-registrations-${filter}.csv`; a.click();
}

export default function AdminWorkshops() {
  const qc = useQueryClient();
  const { data } = useQuery<{ registrations: Reg[]; workshops: Workshop[] }>({ queryKey: ["admin-workshops"], queryFn: () => fetch("/api/admin/workshops").then(r => r.json()) });
  const [workshopFilter, setWorkshopFilter] = useState("all");

  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Workshop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const onError = useCallback(() => setError("Something went wrong. Please try again."), []);

  const save = useMutation({
    mutationFn: (d: FormData) => {
      const isEdit = !!d.id;
      const payload: Record<string, unknown> = {
        ...d,
        priceDisplay: `\u20B9${d.price}`,
        instructor: {
          name: d.instructorName || "",
          bio: d.instructorBio || "",
          imageUrl: "",
          credentials: d.instructorCredentials || "",
        },
      };
      delete payload.instructorName;
      delete payload.instructorBio;
      delete payload.instructorCredentials;

      return fetch("/api/admin/workshops", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); });
    },
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["admin-workshops"] }); setModal(null); },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/admin/workshops", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["admin-workshops"] }); setModal(null); setDeleteTarget(null); },
    onError,
  });

  const openAdd = () => { setForm({ ...EMPTY }); setModal("add"); };
  const openEdit = (w: Workshop) => {
    const inst = (w.instructor as Record<string, string>) || {};
    setForm({
      ...w,
      startDate: toDateInput(w.startDate),
      endDate: toDateInput(w.endDate),
      registrationDeadline: toDateInput(w.registrationDeadline),
      instructorName: inst.name || "",
      instructorBio: inst.bio || "",
      instructorCredentials: inst.credentials || "",
    });
    setModal("edit");
  };
  const openDelete = (w: Workshop) => { setDeleteTarget(w); setModal("delete"); };
  const closeModal = () => { setModal(null); setDeleteTarget(null); };

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) => setForm(f => ({ ...f, [key]: val }));

  const workshops = data?.workshops ?? [];
  const now = new Date();
  now.setHours(0,0,0,0);
  const activeWorkshops = workshops.filter(w => !w.endDate || new Date(w.endDate) >= now);
  const pastWorkshops = workshops.filter(w => w.endDate && new Date(w.endDate) < now);

  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} workshops?`)) return;
    
    setBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch("/api/admin/workshops", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-workshops"] });
      setSelectedIds(new Set());
    } catch (e) {
      alert("Error deleting some workshops");
    } finally {
      setBulkDeleting(false);
    }
  };
  const regs = (data?.registrations ?? []).filter(r => workshopFilter === "all" || r.workshopTitle === workshopFilter);

  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };
  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff" }}>Workshops Manager</h1>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => exportCSV(regs, workshopFilter)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#d1d5db", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <Download size={14} />Export CSV
              </button>
              <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 100, background: "#fff", border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={15} />Add Workshop
              </button>
            </div>
          </div>

          {/* Workshop overview cards */}
          {activeWorkshops.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Active Workshops ({activeWorkshops.length})</h2>
                {selectedIds.size > 0 && (
                  <button onClick={bulkDeleteSelected} disabled={bulkDeleting} style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", padding: "6px 14px", borderRadius: 100, cursor: bulkDeleting ? "wait" : "pointer", fontWeight: 700 }}>
                    {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20, marginBottom: 24 }}>
                {activeWorkshops.map(w => {
                  const pct = w.maxParticipants ? Math.round((w.participants / w.maxParticipants) * 100) : 0;
                  return (
                    <div key={w.id} style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", border: `1px solid ${selectedIds.has(w.id) ? "rgba(96,165,250,0.5)" : workshopFilter === w.title ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: 24, padding: 24, gap: 20, cursor: "pointer", position: "relative" }} onClick={() => setWorkshopFilter(f => f === w.title ? "all" : w.title)}>
                      <div style={{ position: "absolute", top: 24, right: 24 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(w.id)} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) next.add(w.id); else next.delete(w.id); setSelectedIds(next); }} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#60a5fa" }} />
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingRight: 32 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{w.title}</h3>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.1)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{w.sport}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{w.sessionType === "single" ? "Single" : "Series"}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, marginTop: "auto" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            <span>Participants</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#eab308" : "#fff", borderRadius: 100 }} />
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)", marginTop: 8 }}>{w.participants} <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--font-sans)" }}>/ {w.maxParticipants}</span></div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Deadline</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#d1d5db" }}>{new Date(w.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(w)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Edit"><Pencil size={14} /> Edit</button>
                        <button onClick={() => openDelete(w)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Delete"><Trash2 size={14} /> Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {pastWorkshops.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#9ca3af" }}>Past Workshops ({pastWorkshops.length})</h2>
                {selectedIds.size > 0 && (
                  <button onClick={bulkDeleteSelected} disabled={bulkDeleting} style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", padding: "6px 14px", borderRadius: 100, cursor: bulkDeleting ? "wait" : "pointer", fontWeight: 700 }}>
                    {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20, marginBottom: 32, opacity: 0.6 }}>
                {pastWorkshops.map(w => {
                  const pct = w.maxParticipants ? Math.round((w.participants / w.maxParticipants) * 100) : 0;
                  return (
                    <div key={w.id} style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", border: `1px solid ${selectedIds.has(w.id) ? "rgba(96,165,250,0.5)" : workshopFilter === w.title ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: 24, padding: 24, gap: 20, cursor: "pointer", position: "relative" }} onClick={() => setWorkshopFilter(f => f === w.title ? "all" : w.title)}>
                      <div style={{ position: "absolute", top: 24, right: 24 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(w.id)} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) next.add(w.id); else next.delete(w.id); setSelectedIds(next); }} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#60a5fa" }} />
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingRight: 32 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{w.title}</h3>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.1)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{w.sport}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{w.sessionType === "single" ? "Single" : "Series"}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, marginTop: "auto" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            <span>Participants</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#eab308" : "#fff", borderRadius: 100 }} />
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)", marginTop: 8 }}>{w.participants} <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--font-sans)" }}>/ {w.maxParticipants}</span></div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(w)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Edit"><Pencil size={14} /> Edit</button>
                        <button onClick={() => openDelete(w)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Delete"><Trash2 size={14} /> Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{regs.length} registration{regs.length !== 1 ? "s" : ""}</span>
            {workshopFilter !== "all" && <button onClick={() => setWorkshopFilter("all")} style={{ fontSize: 12, color: "#fff", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{"\u2715"} Clear filter</button>}
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                  <tr>{["ID", "Participant", "Age", "Type", "Workshop", "Registered On", "Payment"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!regs.length ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No registrations found</td></tr>
                  ) : regs.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "#6b7280" }} title={r.id}>{bookingRef(r.id)}</td>
                      <td style={td}><div style={{ fontWeight: 600, color: "#fff" }}>{r.participantName}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{r.userEmail}</div></td>
                      <td style={{ ...td, color: "#9ca3af" }}>{r.participantAge ? `${r.participantAge} yrs` : "-"}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: r.registrationType === "youth" ? "rgba(96,165,250,0.12)" : "rgba(168,85,247,0.12)", color: r.registrationType === "youth" ? "#60a5fa" : "#a855f7" }}>{r.registrationType === "youth" ? "Youth" : "Adult"}</span></td>
                      <td style={td}>{r.workshopTitle}</td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(r.registeredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: r.paymentStatus === "paid" ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)", color: r.paymentStatus === "paid" ? "#22c55e" : "#eab308" }}>{r.paymentStatus === "paid" ? "Paid" : "Pending"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add / Edit Modal */}
        <AdminModal open={modal === "add" || modal === "edit"} onClose={closeModal} title={modal === "add" ? "Add New Workshop" : "Edit Workshop"} width={620}>
          <form onSubmit={e => { e.preventDefault(); save.mutate(form); }}>
            <FormInput label="Title" value={form.title ?? ""} onChange={v => update("title", v)} required />
            <FormRow>
              <FormSelect label="Sport" value={form.sport ?? "Football"} onChange={v => update("sport", v)} options={SPORTS.map(s => ({ value: s, label: s }))} />
              <FormSelect label="Skill Level" value={form.skillLevel ?? "All Levels"} onChange={v => update("skillLevel", v)} options={SKILL_LEVELS.map(l => ({ value: l, label: l }))} />
            </FormRow>
            <FormRow>
              <FormSelect label="Session Type" value={form.sessionType ?? "single"} onChange={v => update("sessionType", v)} options={WORKSHOP_SESSION_TYPES.map(t => ({ value: t, label: t === "single" ? "Single Session" : "Multi-Session Series" }))} />
              <FormInput label="Session Count" value={form.sessionCount ?? 1} onChange={v => update("sessionCount", Number(v) as never)} type="number" />
            </FormRow>
            <FormRow>
              <FormInput label="Session Duration" value={form.sessionDuration ?? ""} onChange={v => update("sessionDuration", v)} placeholder="e.g. 2 hours" />
              <FormSelect label="Audience" value={form.audienceType ?? "all"} onChange={v => update("audienceType", v)} options={WORKSHOP_AUDIENCE_TYPES.map(t => ({ value: t, label: t === "youth" ? "Youth" : t === "adult" ? "Adults" : "All Ages" }))} />
            </FormRow>
            <FormInput label="Age Group" value={form.ageGroup ?? ""} onChange={v => update("ageGroup", v)} placeholder="e.g. 10-16 years" />
            <FormRow>
              <FormSelect label="Status" value={form.status ?? "open"} onChange={v => update("status", v)} options={WORKSHOP_STATUSES.filter(s => s !== "completed" && s !== "archived").map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            </FormRow>
            <FormRow>
              <FormInput label="Start Date" value={form.startDate ?? ""} onChange={v => update("startDate", v)} type="date" required />
              <FormInput label="End Date" value={form.endDate ?? ""} onChange={v => update("endDate", v)} type="date" required />
            </FormRow>
            <FormInput label="Registration Deadline" value={form.registrationDeadline ?? ""} onChange={v => update("registrationDeadline", v)} type="date" required />
            <FormRow>
              <FormInput label="Price (₹)" value={form.price ?? 0} onChange={v => update("price", Number(v) as never)} type="number" />
              <FormInput label="Max Participants" value={form.maxParticipants ?? 30} onChange={v => update("maxParticipants", Number(v) as never)} type="number" />
            </FormRow>
            <FormInput label="Location" value={form.location ?? ""} onChange={v => update("location", v)} />
            <FormInput label="Address" value={form.address ?? ""} onChange={v => update("address", v)} />
            <FormRow>
              <FormInput label="Organizer" value={form.organizer ?? ""} onChange={v => update("organizer", v)} />
              <FormInput label="Organizer Contact" value={form.organizerContact ?? ""} onChange={v => update("organizerContact", v)} />
            </FormRow>
            <FormTextarea label="Description" value={form.description ?? ""} onChange={v => update("description", v)} rows={3} />
            <ImageUpload value={form.imageUrl ?? ""} onChange={v => update("imageUrl", v)} />
            <FormTextarea label="Highlights (one per line)" value={(form.highlights ?? []).join("\n")} onChange={v => update("highlights", v.split("\n").filter(Boolean) as never)} rows={3} />
            <FormTextarea label="Requirements (one per line)" value={(form.requirements ?? []).join("\n")} onChange={v => update("requirements", v.split("\n").filter(Boolean) as never)} rows={2} />
            <FormInput label="Instructor Name" value={form.instructorName ?? ""} onChange={v => update("instructorName", v)} />
            <FormTextarea label="Instructor Bio" value={form.instructorBio ?? ""} onChange={v => update("instructorBio", v)} rows={2} />
            <FormInput label="Instructor Credentials" value={form.instructorCredentials ?? ""} onChange={v => update("instructorCredentials", v)} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#d1d5db", cursor: "pointer" }}>
                <input type="checkbox" checked={form.featured ?? false} onChange={e => update("featured", e.target.checked as never)} style={{ accentColor: "#fff" }} />
                Featured workshop (shown on homepage)
              </label>
            </div>
            {error && <p style={{ fontSize: 13, color: "#fff", marginBottom: 8 }}>{error}</p>}
            <FormActions onCancel={closeModal} submitLabel={modal === "add" ? "Add Workshop" : "Save Changes"} loading={save.isPending} />
          </form>
        </AdminModal>

        {/* Delete Confirmation */}
        <AdminModal open={modal === "delete"} onClose={closeModal} title="Delete Workshop" width={420}>
          <DeleteConfirm name={deleteTarget?.title ?? ""} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} onCancel={closeModal} loading={remove.isPending} />
        </AdminModal>
      </AdminShell>
    </AdminGuard>
  );
}
