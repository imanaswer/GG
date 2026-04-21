"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { AdminModal, FormInput, FormTextarea, FormSelect, FormRow, FormActions, DeleteConfirm } from "@/components/admin/AdminModal";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { EVENT_TYPES, EVENT_DIFFICULTIES, EVENT_STATUSES } from "@/lib/taxonomy";

type Reg = { id: string; playerName?: string; playerEmail?: string; teamName?: string; eventTitle?: string; eventType?: string; entryFee: number; registeredAt: string };
type Ev = {
  id: string; title: string; sport: string; type: string; date: string;
  startDate: string; endDate: string; registrationDeadline: string;
  location: string; address: string;
  participants: number; maxParticipants: number;
  prizePool: string; entryFee: string; entryFeeAmount: number;
  difficulty: string; imageUrl: string; featured: boolean;
  status: string; description: string;
  format: string[]; prizes: string[]; requirements: string[];
  organizer: string; organizerContact: string; tags: string[];
};

const EMPTY: Partial<Ev> = {
  title: "", sport: "Football", type: "Tournament", date: "",
  startDate: "", endDate: "", registrationDeadline: "",
  location: "", address: "",
  maxParticipants: 100, prizePool: "", entryFee: "Free", entryFeeAmount: 0,
  difficulty: "All Levels", imageUrl: "", featured: false,
  status: "Registration Open", description: "",
  format: [], prizes: [], requirements: [],
  organizer: "", organizerContact: "", tags: [],
};

const SPORTS = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Swimming", "Table Tennis", "Volleyball", "Athletics", "E-Sports"];

function toDateInput(d: string | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminEvents() {
  const qc = useQueryClient();
  const { data } = useQuery<{ registrations: Reg[]; events: Ev[] }>({ queryKey: ["admin-events"], queryFn: () => fetch("/api/admin/events").then(r => r.json()), refetchInterval: 30_000 });

  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<Partial<Ev>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Ev | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback(() => setError("Something went wrong. Please try again."), []);

  const save = useMutation({
    mutationFn: (d: Partial<Ev>) => {
      const isEdit = !!d.id;
      return fetch("/api/admin/events", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); });
    },
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["admin-events"] }); setModal(null); },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["admin-events"] }); setModal(null); setDeleteTarget(null); },
    onError,
  });

  const openAdd = () => { setForm({ ...EMPTY }); setModal("add"); };
  const openEdit = (e: Ev) => {
    setForm({
      ...e,
      startDate: toDateInput(e.startDate),
      endDate: toDateInput(e.endDate),
      registrationDeadline: toDateInput(e.registrationDeadline),
    });
    setModal("edit");
  };
  const openDelete = (e: Ev) => { setDeleteTarget(e); setModal("delete"); };
  const closeModal = () => { setModal(null); setDeleteTarget(null); };

  const update = <K extends keyof Ev>(key: K, val: Ev[K]) => setForm(f => ({ ...f, [key]: val }));

  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };
  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Events Manager</h1>
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, background: "#e63946", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={15} />Add Event
            </button>
          </div>

          {/* Event overview cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            {(data?.events ?? []).map(e => (
              <div key={e.id} style={{ background: "#141414", border: `1px solid ${e.status === "Live" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px 18px", boxShadow: e.status === "Live" ? "0 0 16px rgba(239,68,68,0.1)" : "none", position: "relative" }}>
                <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                  <button onClick={() => openEdit(e)} style={iconBtn} title="Edit"><Pencil size={13} color="#60a5fa" /></button>
                  <button onClick={() => openDelete(e)} style={iconBtn} title="Delete"><Trash2 size={13} color="#f87171" /></button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingRight: 50 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", flex: 1, paddingRight: 8 }}>{e.title}</span>
                </div>
                <Badge status={e.status} />
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6, marginBottom: 8 }}>{e.type} · {e.prizePool}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: e.status === "Live" ? "#ef4444" : "#e63946" }}>{e.participants}/{e.maxParticipants}</div>
                {e.status === "Live" && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 700 }}>Auto-refreshing every 30s</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Event","Type","Player / Captain","Team Name","Entry Fee","Payment","Date"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!(data?.registrations.length) ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No registrations yet</td></tr>
                  ) : data!.registrations.map(r => (
                    <tr key={r.id}>
                      <td style={td}><div style={{ fontWeight: 600, color: "#fff" }}>{r.eventTitle}</div></td>
                      <td style={td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(230,57,70,0.12)", color: "#e63946", fontWeight: 700 }}>{r.eventType}</span></td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.playerName}</td>
                      <td style={{ ...td, color: "#9ca3af" }}>{r.teamName ?? "—"}</td>
                      <td style={{ ...td, color: r.entryFee === 0 ? "#4ade80" : "#fff", fontWeight: 700 }}>{r.entryFee === 0 ? "Free" : `₹${r.entryFee}`}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: "rgba(234,179,8,0.12)", color: "#eab308" }}>Pending</span></td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(r.registeredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add / Edit Modal */}
        <AdminModal open={modal === "add" || modal === "edit"} onClose={closeModal} title={modal === "add" ? "Add New Event" : "Edit Event"} width={620}>
          <form onSubmit={e => { e.preventDefault(); save.mutate(form); }}>
            <FormInput label="Title" value={form.title ?? ""} onChange={v => update("title", v)} required />
            <FormRow>
              <FormSelect label="Sport" value={form.sport ?? "Football"} onChange={v => update("sport", v)} options={SPORTS.map(s => ({ value: s, label: s }))} />
              <FormSelect label="Type" value={form.type ?? "Tournament"} onChange={v => update("type", v)} options={EVENT_TYPES.map(t => ({ value: t, label: t }))} />
            </FormRow>
            <FormRow>
              <FormSelect label="Difficulty" value={form.difficulty ?? "All Levels"} onChange={v => update("difficulty", v)} options={EVENT_DIFFICULTIES.map(d => ({ value: d, label: d }))} />
              <FormSelect label="Status" value={form.status ?? "Registration Open"} onChange={v => update("status", v)} options={EVENT_STATUSES.filter(s => s !== "Full" && s !== "Archived").map(s => ({ value: s, label: s }))} />
            </FormRow>
            <FormRow>
              <FormInput label="Start Date" value={form.startDate ?? ""} onChange={v => update("startDate", v)} type="date" required />
              <FormInput label="End Date" value={form.endDate ?? ""} onChange={v => update("endDate", v)} type="date" required />
            </FormRow>
            <FormRow>
              <FormInput label="Registration Deadline" value={form.registrationDeadline ?? ""} onChange={v => update("registrationDeadline", v)} type="date" required />
              <FormInput label="Date (display text)" value={form.date ?? ""} onChange={v => update("date", v)} placeholder="e.g. April 25-27, 2026" />
            </FormRow>
            <FormInput label="Location" value={form.location ?? ""} onChange={v => update("location", v)} />
            <FormInput label="Address" value={form.address ?? ""} onChange={v => update("address", v)} />
            <FormRow>
              <FormInput label="Max Participants" value={form.maxParticipants ?? 100} onChange={v => update("maxParticipants", Number(v) as never)} type="number" />
              <FormInput label="Prize Pool" value={form.prizePool ?? ""} onChange={v => update("prizePool", v)} placeholder="e.g. ₹50,000" />
            </FormRow>
            <FormRow>
              <FormInput label="Entry Fee (display)" value={form.entryFee ?? "Free"} onChange={v => update("entryFee", v)} placeholder="e.g. ₹500/team or Free" />
              <FormInput label="Entry Fee Amount (₹)" value={form.entryFeeAmount ?? 0} onChange={v => update("entryFeeAmount", Number(v) as never)} type="number" />
            </FormRow>
            <FormRow>
              <FormInput label="Organizer" value={form.organizer ?? ""} onChange={v => update("organizer", v)} />
              <FormInput label="Organizer Contact" value={form.organizerContact ?? ""} onChange={v => update("organizerContact", v)} />
            </FormRow>
            <FormTextarea label="Description" value={form.description ?? ""} onChange={v => update("description", v)} rows={3} />
            <ImageUpload value={form.imageUrl ?? ""} onChange={v => update("imageUrl", v)} />
            <FormTextarea label="Format (one per line)" value={(form.format ?? []).join("\n")} onChange={v => update("format", v.split("\n").filter(Boolean) as never)} rows={2} placeholder="Group stage + Knockouts&#10;Best of 3 sets" />
            <FormTextarea label="Prizes (one per line)" value={(form.prizes ?? []).join("\n")} onChange={v => update("prizes", v.split("\n").filter(Boolean) as never)} rows={2} placeholder="1st: ₹25,000&#10;2nd: ₹15,000&#10;3rd: ₹10,000" />
            <FormTextarea label="Requirements (one per line)" value={(form.requirements ?? []).join("\n")} onChange={v => update("requirements", v.split("\n").filter(Boolean) as never)} rows={2} placeholder="Valid ID&#10;Sports attire" />
            <FormTextarea label="Tags (one per line)" value={(form.tags ?? []).join("\n")} onChange={v => update("tags", v.split("\n").filter(Boolean) as never)} rows={2} placeholder="popular&#10;weekend&#10;team" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#d1d5db", cursor: "pointer" }}>
                <input type="checkbox" checked={form.featured ?? false} onChange={e => update("featured", e.target.checked as never)} style={{ accentColor: "#e63946" }} />
                Featured event (shown on homepage)
              </label>
            </div>
            {error && <p style={{ fontSize: 13, color: "#f87171", marginBottom: 8 }}>{error}</p>}
            <FormActions onCancel={closeModal} submitLabel={modal === "add" ? "Add Event" : "Save Changes"} loading={save.isPending} />
          </form>
        </AdminModal>

        {/* Delete Confirmation */}
        <AdminModal open={modal === "delete"} onClose={closeModal} title="Delete Event" width={420}>
          <DeleteConfirm name={deleteTarget?.title ?? ""} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} onCancel={closeModal} loading={remove.isPending} />
        </AdminModal>
      </AdminShell>
    </AdminGuard>
  );
}
