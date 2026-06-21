"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModal, FormInput, FormTextarea, FormSelect, FormRow, FormActions, DeleteConfirm } from "@/components/admin/AdminModal";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SPORTS, SKILL_LEVELS, WORKSHOP_SESSION_TYPES, WORKSHOP_AUDIENCE_TYPES, WORKSHOP_STATUSES } from "@/lib/taxonomy";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Pencil, Trash2 } from "lucide-react";

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
    `"${r.id}"`, `"${r.participantName}"`, r.participantAge ?? "", `"${r.registrationType}"`,
    `"${r.userName}"`, `"${r.userEmail}"`, `"${r.workshopTitle}"`,
    `"${new Date(r.registeredAt).toLocaleDateString("en-IN")}"`
  ].join(","));
  const csv = [`"ID","Participant","Age","Type","User","Email","Workshop","Date"`, ...rows].join("\n");
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
  const regs = (data?.registrations ?? []).filter(r => workshopFilter === "all" || r.workshopTitle === workshopFilter);

  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };
  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Workshops Manager</h1>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => exportCSV(regs, workshopFilter)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <Download size={14} />Export CSV
              </button>
              <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, background: "#e63946", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={15} />Add Workshop
              </button>
            </div>
          </div>

          {/* Workshop overview cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            {workshops.map(w => {
              const pct = w.maxParticipants ? Math.round((w.participants / w.maxParticipants) * 100) : 0;
              return (
                <div key={w.id} style={{ background: "#141414", border: `1px solid ${workshopFilter === w.title ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", position: "relative" }} onClick={() => setWorkshopFilter(f => f === w.title ? "all" : w.title)}>
                  <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(w); }} style={iconBtn} title="Edit"><Pencil size={13} color="#60a5fa" /></button>
                    <button onClick={e => { e.stopPropagation(); openDelete(w); }} style={iconBtn} title="Delete"><Trash2 size={13} color="#f87171" /></button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingRight: 50 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{w.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{w.sport}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>{w.sessionType === "single" ? "Single" : "Series"}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e63946", marginTop: 4 }}>{w.participants}/{w.maxParticipants}</div>
                  <div style={{ height: 4, background: "#1c1c1c", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>Deadline: {new Date(w.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{regs.length} registration{regs.length !== 1 ? "s" : ""}</span>
            {workshopFilter !== "all" && <button onClick={() => setWorkshopFilter("all")} style={{ fontSize: 12, color: "#e63946", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{"\u2715"} Clear filter</button>}
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["ID", "Participant", "Age", "Type", "Workshop", "Registered On", "Payment"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!regs.length ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No registrations found</td></tr>
                  ) : regs.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{r.id}</td>
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
                <input type="checkbox" checked={form.featured ?? false} onChange={e => update("featured", e.target.checked as never)} style={{ accentColor: "#e63946" }} />
                Featured workshop (shown on homepage)
              </label>
            </div>
            {error && <p style={{ fontSize: 13, color: "#f87171", marginBottom: 8 }}>{error}</p>}
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
