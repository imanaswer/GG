"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { AdminModal, DeleteConfirm } from "@/components/admin/AdminModal";
import { EventWizard, EMPTY_EVENT, type EventForm } from "@/components/admin/EventWizard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { SportEvent } from "@/hooks/useData";

type Reg = { id: string; playerName?: string; playerEmail?: string; teamName?: string; eventTitle?: string; eventType?: string; entryFee: number; registeredAt: string };
type Ev = SportEvent;

function toDateInput(d: string | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toForm(e: Ev): EventForm {
  return {
    ...EMPTY_EVENT, ...e,
    paid: (e.entryFeeAmount ?? 0) > 0,
    startDate: toDateInput(e.startDate), endDate: toDateInput(e.endDate), registrationDeadline: toDateInput(e.registrationDeadline),
    approvalMode: e.approvalMode === "manual" ? "manual" : "auto",
    schedule: Array.isArray(e.schedule)
      ? e.schedule.map((s) => ("title" in s
          ? { title: s.title ?? "", date: s.date ?? "", time: s.time ?? "", location: s.location ?? "" }
          : { title: (s as { event?: string }).event ?? "", date: (s as { day?: string }).day ?? "", time: s.time ?? "", location: "" }))
      : [],
    lat: e.lat ?? null, lng: e.lng ?? null,
  } as EventForm;
}

const EMPTY_EV: Ev = { ...EMPTY_EVENT, id: "", distance: "", participants: 0, status: "Registration Open" };

function toPayload(form: EventForm, published: boolean, id?: string) {
  return {
    ...form, id,
    entryFee: form.paid ? form.entryFee : "Free",
    entryFeeAmount: form.paid ? Number(form.entryFeeAmount) : 0,
    published,
  };
}

export default function AdminEvents() {
  const qc = useQueryClient();
  const { data } = useQuery<{ registrations: Reg[]; events: Ev[] }>({ queryKey: ["admin-events"], queryFn: () => fetch("/api/admin/events").then(r => r.json()), refetchInterval: 30_000 });

  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<Ev>(EMPTY_EV);
  const [deleteTarget, setDeleteTarget] = useState<Ev | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback(() => setError("Something went wrong. Please try again."), []);

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => {
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

  const openAdd = () => { setForm(EMPTY_EV); setModal("add"); };
  const openEdit = (e: Ev) => { setForm(e); setModal("edit"); };
  const openDelete = (e: Ev) => { setDeleteTarget(e); setModal("delete"); };
  const closeModal = () => { setModal(null); setDeleteTarget(null); };

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
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                  <Badge status={e.status} />
                  {e.published === false && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em" }}>Draft</span>
                  )}
                </div>
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
        <AdminModal open={modal === "add" || modal === "edit"} onClose={closeModal} title={modal === "add" ? "Add New Event" : "Edit Event"} width={720}>
          <EventWizard
            initial={modal === "edit" ? toForm(form as Ev) : EMPTY_EVENT}
            saving={save.isPending}
            error={error}
            onCancel={closeModal}
            onSubmit={(f, published) => save.mutate(toPayload(f, published, (form as Ev).id))}
          />
        </AdminModal>

        {/* Delete Confirmation */}
        <AdminModal open={modal === "delete"} onClose={closeModal} title="Delete Event" width={420}>
          <DeleteConfirm name={deleteTarget?.title ?? ""} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} onCancel={closeModal} loading={remove.isPending} />
        </AdminModal>
      </AdminShell>
    </AdminGuard>
  );
}
