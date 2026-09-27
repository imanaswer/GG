"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { AdminModal, DeleteConfirm } from "@/components/admin/AdminModal";
import { EventWizard, EMPTY_EVENT, type EventForm } from "@/components/admin/EventWizard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { EventUpdatesModal } from "@/components/admin/EventUpdatesModal";
import type { SportEvent } from "@/hooks/useData";

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
  const { data } = useQuery<{ events: Ev[] }>({ queryKey: ["admin-events"], queryFn: () => fetch("/api/admin/events").then(r => r.json()), refetchInterval: 30_000 });

  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<Ev>(EMPTY_EV);
  const [deleteTarget, setDeleteTarget] = useState<Ev | null>(null);
  const [updatesTarget, setUpdatesTarget] = useState<Ev | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const events = data?.events ?? [];
  const now = new Date();
  now.setHours(0,0,0,0);
  const activeEvents = events.filter(e => !e.endDate || new Date(e.endDate) >= now);
  const pastEvents = events.filter(e => e.endDate && new Date(e.endDate) < now);

  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} events?`)) return;
    
    setBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch("/api/admin/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setSelectedIds(new Set());
    } catch (err) {
      alert("Error deleting some events");
    } finally {
      setBulkDeleting(false);
    }
  };

  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff" }}>Events Manager</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a href="/api/admin/export?type=events" download style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", transition: "all 0.2s ease" }}
                 onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                 onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                Export CSV
              </a>
              <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 100, background: "#fff", border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={15} />Add Event
              </button>
            </div>
          </div>

          {/* Event overview cards */}
          {activeEvents.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Active Events ({activeEvents.length})</h2>
                {selectedIds.size > 0 && (
                  <button onClick={bulkDeleteSelected} disabled={bulkDeleting} style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", padding: "6px 14px", borderRadius: 100, cursor: bulkDeleting ? "wait" : "pointer", fontWeight: 700 }}>
                    {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
                  </button>
                )}
              </div>
              <div className="admin-events-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20, marginBottom: 24 }}>
                {activeEvents.map(e => {
                  const pct = e.maxParticipants ? Math.round((e.participants / e.maxParticipants) * 100) : 0;
                  return (
                    <div key={e.id} className="admin-event-card" style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", border: `1px solid ${selectedIds.has(e.id) ? "rgba(96,165,250,0.5)" : e.status === "Live" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: 24, padding: 24, gap: 20, position: "relative" }}>
                      <div style={{ position: "absolute", top: 24, right: 24 }}>
                        <input type="checkbox" checked={selectedIds.has(e.id)} onChange={ev => { const next = new Set(selectedIds); if (ev.target.checked) next.add(e.id); else next.delete(e.id); setSelectedIds(next); }} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#60a5fa" }} />
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingRight: 32 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{e.title}</h3>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <Badge status={e.status} />
                            {e.published === false && (
                              <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em" }}>Draft</span>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.type}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, marginTop: "auto" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            <span>Participants</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#eab308" : "#fff", borderRadius: 100 }} />
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)", marginTop: 8 }}>{e.participants} <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--font-sans)" }}>/ {e.maxParticipants}</span></div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Prize Pool</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", fontFamily: "var(--font-serif)" }}>{e.prizePool}</div>
                          {e.status === "Live" && (
                            <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, fontWeight: 700, textTransform: "uppercase" }}>Auto-refreshing</div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                        <button onClick={() => setUpdatesTarget(e)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(251,191,36,0.1)", border: "none", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Updates"><Megaphone size={14} /> Updates</button>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(e)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Edit"><Pencil size={14} /> Edit</button>
                          <button onClick={() => openDelete(e)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Delete"><Trash2 size={14} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {pastEvents.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#9ca3af" }}>Past Events ({pastEvents.length})</h2>
                {selectedIds.size > 0 && (
                  <button onClick={bulkDeleteSelected} disabled={bulkDeleting} style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", padding: "6px 14px", borderRadius: 100, cursor: bulkDeleting ? "wait" : "pointer", fontWeight: 700 }}>
                    {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
                  </button>
                )}
              </div>
              <div className="admin-events-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20, marginBottom: 32, opacity: 0.6 }}>
                {pastEvents.map(e => {
                  const pct = e.maxParticipants ? Math.round((e.participants / e.maxParticipants) * 100) : 0;
                  return (
                    <div key={e.id} className="admin-event-card" style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", border: `1px solid ${selectedIds.has(e.id) ? "rgba(96,165,250,0.5)" : e.status === "Live" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: 24, padding: 24, gap: 20, position: "relative" }}>
                      <div style={{ position: "absolute", top: 24, right: 24 }}>
                        <input type="checkbox" checked={selectedIds.has(e.id)} onChange={ev => { const next = new Set(selectedIds); if (ev.target.checked) next.add(e.id); else next.delete(e.id); setSelectedIds(next); }} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#60a5fa" }} />
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingRight: 32 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{e.title}</h3>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <Badge status={e.status} />
                            {e.published === false && (
                              <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em" }}>Draft</span>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.type}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, marginTop: "auto" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            <span>Participants</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#eab308" : "#fff", borderRadius: 100 }} />
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)", marginTop: 8 }}>{e.participants} <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--font-sans)" }}>/ {e.maxParticipants}</span></div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Prize Pool</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", fontFamily: "var(--font-serif)" }}>{e.prizePool}</div>
                          {e.status === "Live" && (
                            <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, fontWeight: 700, textTransform: "uppercase" }}>Auto-refreshing</div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                        <button onClick={() => setUpdatesTarget(e)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(251,191,36,0.1)", border: "none", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Updates"><Megaphone size={14} /> Updates</button>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(e)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Edit"><Pencil size={14} /> Edit</button>
                          <button onClick={() => openDelete(e)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }} title="Delete"><Trash2 size={14} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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

        <EventUpdatesModal
          eventId={updatesTarget?.id ?? null}
          eventTitle={updatesTarget?.title ?? ""}
          open={!!updatesTarget}
          onClose={() => setUpdatesTarget(null)}
        />

        <style>{`
          @media (max-width: 768px) {
            .admin-events-grid[style] {
              display: flex !important;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              margin-right: -16px;
              padding-right: 16px;
              padding-bottom: 8px;
              -webkit-overflow-scrolling: touch;
            }
            .admin-events-grid::-webkit-scrollbar {
              display: none;
            }
            .admin-events-grid > .admin-event-card {
              flex: 0 0 280px !important;
              scroll-snap-align: start;
            }
            .admin-event-card {
              padding: 20px !important;
            }
            .admin-event-card h3 {
              font-size: 16px !important;
            }
          }
        `}</style>
      </AdminShell>
    </AdminGuard>
  );
}
