"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { AdminModal, FormInput, FormTextarea, FormSelect, FormMultiSelect, FormCombobox, FormRow, FormActions, DeleteConfirm } from "@/components/admin/AdminModal";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { COACH_TYPES, SKILL_LEVELS, formatPrice } from "@/lib/taxonomy";

type BatchRow = { id?: string; day: string; time: string; level: string; seats: number };

type Coach = {
  id: string; name: string; sport: string; type: string; skillLevel: string;
  location: string; address: string; price: string; priceMin: number; priceMax: number;
  timing: string; phone: string; email: string; description: string;
  features: string[]; certifications: string[]; imageUrl: string; coverImageUrl: string; photos: string[];
  seatsLeft: number; totalSeats: number; rating: number; reviewCount: number;
  status: string; totalBookings: number; confirmedBookings: number; revenue: number;
  agreement?: { id: string; acceptedAt: string; version: string } | null;
  batches?: BatchRow[];
};

const EMPTY: Partial<Coach> = {
  name: "", sport: "Football", type: "Personal Trainer", skillLevel: "All Levels",
  location: "", address: "", price: "", priceMin: 0, priceMax: 0,
  timing: "", phone: "", email: "", description: "",
  features: [], certifications: [], imageUrl: "", coverImageUrl: "", photos: [],
  totalSeats: 20, seatsLeft: 20, status: "active", batches: [],
};

const SPORTS = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Swimming", "Table Tennis", "Volleyball", "Athletics", "Martial Arts", "Yoga", "Gym & Fitness"];

export default function AdminCoaches() {
  const qc = useQueryClient();
  const { data } = useQuery<{ coaches: Coach[] }>({ queryKey: ["admin-coaches"], queryFn: () => fetch("/api/admin/coaches").then(r => r.json()) });

  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<Partial<Coach>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Coach | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback(() => setError("Something went wrong. Please try again."), []);

  const approve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      fetch(`/api/coaches/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coaches"] }),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Coach>) => {
      const isEdit = !!data.id;
      return fetch("/api/admin/coaches", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          price: formatPrice(data.priceMin ?? 0, data.priceMax ?? 0),
        }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); });
    },
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["admin-coaches"] }); setModal(null); },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/admin/coaches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["admin-coaches"] }); setModal(null); setDeleteTarget(null); },
    onError,
  });

  const openAdd = () => { setForm({ ...EMPTY }); setModal("add"); };
  const openEdit = (c: Coach) => { setForm({ ...c }); setModal("edit"); };

  const copySignLink = async (c: Coach) => {
    try {
      const r = await fetch(`/api/admin/coaches/${c.id}/agreement-link`);
      const d = await r.json();
      if (!r.ok || !d.signLink) { toast.error(d.error ?? "Could not create signing link"); return; }
      await navigator.clipboard.writeText(d.signLink);
      toast.success("Agreement signing link copied to clipboard");
    } catch { toast.error("Could not copy signing link"); }
  };
  const openDelete = (c: Coach) => { setDeleteTarget(c); setModal("delete"); };
  const closeModal = () => { setModal(null); setDeleteTarget(null); };

  const update = <K extends keyof Coach>(key: K, val: Coach[K]) => setForm(f => ({ ...f, [key]: val }));

  const batches = form.batches ?? [];
  const addBatch = () => update("batches", [...batches, { day: "", time: "", level: "All Levels", seats: 10 }] as never);
  const rmBatch = (i: number) => update("batches", batches.filter((_, j) => j !== i) as never);
  const setBatch = (i: number, key: keyof BatchRow, val: string | number) =>
    update("batches", batches.map((b, j) => (j === i ? { ...b, [key]: val } : b)) as never);

  const coaches = data?.coaches ?? [];
  const pending = coaches.filter(c => c.status === "pending_approval");
  const active  = coaches.filter(c => c.status === "active");

  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };
  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Coaches Manager</h1>
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, background: "#e63946", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={15} />Add Coach
            </button>
          </div>

          {pending.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#eab308" }}>Pending Approval</h2>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308" }}>{pending.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {pending.map(c => (
                  <div key={c.id} style={{ background: "#141414", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.name}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{c.sport} · {c.type} · {c.location}</p>
                      </div>
                      <Badge status="pending_approval" />
                    </div>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>{formatPrice(c.priceMin, c.priceMax)}/session</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => approve.mutate({ id: c.id, action: "approve" })} style={{ flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Approve</button>
                      <button onClick={() => approve.mutate({ id: c.id, action: "reject" })}  style={{ flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>All Coaches ({active.length} active)</h2>
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Coach / Academy","Type","Location","Price","Seats","Bookings","Rating","Status","Agreement","Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!coaches.length ? (
                    <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No coaches</td></tr>
                  ) : coaches.map(c => {
                    const pct = c.totalSeats ? Math.round(((c.totalSeats - c.seatsLeft) / c.totalSeats) * 100) : 0;
                    return (
                      <tr key={c.id}>
                        <td style={td}>
                          <div style={{ fontWeight: 700, color: "#fff" }}>{c.name}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{c.sport}</span>
                        </td>
                        <td style={{ ...td, color: "#9ca3af" }}>{c.type}</td>
                        <td style={{ ...td, color: "#9ca3af", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.location}</td>
                        <td style={{ ...td, color: "#9ca3af" }}>{c.price}</td>
                        <td style={td}>
                          <div style={{ fontSize: 12, marginBottom: 3 }}>{c.seatsLeft}/{c.totalSeats}</div>
                          <div style={{ height: 3, background: "#1c1c1c", borderRadius: 99, width: 60, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                          </div>
                          {!!c.batches?.length && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{c.batches.length} batch{c.batches.length === 1 ? "" : "es"}</div>}
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>{c.confirmedBookings}/{c.totalBookings}</td>
                        <td style={{ ...td, color: "#eab308" }}>★ {c.rating.toFixed(1)} ({c.reviewCount})</td>
                        <td style={td}><Badge status={c.status} /></td>
                        <td style={td}>
                          {c.agreement ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span style={{ display: "inline-flex", width: "fit-content", alignItems: "center", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>Signed</span>
                              <span style={{ fontSize: 10, color: "#6b7280" }}>{new Date(c.agreement.acceptedAt).toLocaleDateString()}</span>
                              <a href={`/api/coach/agreements/${c.agreement.id}/pdf`} style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>View PDF</a>
                            </div>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: "rgba(234,179,8,0.15)", color: "#eab308" }}>Pending Signature</span>
                          )}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => openEdit(c)} style={iconBtn} title="Edit"><Pencil size={14} color="#60a5fa" /></button>
                            <button onClick={() => copySignLink(c)} style={iconBtn} title="Copy agreement signing link"><Link2 size={14} color="#4ade80" /></button>
                            <button onClick={() => openDelete(c)} style={iconBtn} title="Delete"><Trash2 size={14} color="#f87171" /></button>
                            <Link href={`/coach/${c.id}`} target="_blank" style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none", fontWeight: 600, marginLeft: 4 }}>View →</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add / Edit Modal */}
        <AdminModal open={modal === "add" || modal === "edit"} onClose={closeModal} title={modal === "add" ? "Add New Coach" : "Edit Coach"} width={620}>
          <form onSubmit={e => { e.preventDefault(); save.mutate(form); }}>
            <FormInput label="Name" value={form.name ?? ""} onChange={v => update("name", v)} required />
            <FormRow>
              <FormCombobox label="Sport" value={form.sport ?? ""} onChange={v => update("sport", v)} options={SPORTS} placeholder="Type or pick a sport" />
              <FormSelect label="Skill Level" value={form.skillLevel ?? "All Levels"} onChange={v => update("skillLevel", v)} options={SKILL_LEVELS.map(l => ({ value: l, label: l }))} />
            </FormRow>
            {/* Type is multi-select: a coach can be e.g. both an Academy and a Personal Trainer.
                Stored as a comma-joined string in the single `type` column (no schema change). */}
            <FormMultiSelect
              label="Type (pick one or more)"
              values={(form.type ?? "").split(",").map(s => s.trim()).filter(Boolean)}
              onChange={v => update("type", v.join(", "))}
              options={COACH_TYPES}
            />
            <FormRow>
              <FormSelect label="Status" value={form.status ?? "active"} onChange={v => update("status", v)} options={[{ value: "active", label: "Active" }, { value: "pending_approval", label: "Pending" }, { value: "inactive", label: "Inactive" }]} />
            </FormRow>
            <FormRow>
              <FormInput label="Min Price (₹)" value={form.priceMin ?? 0} onChange={v => update("priceMin", Number(v) as never)} type="number" />
              <FormInput label="Max Price (₹) — leave 0 for single price" value={form.priceMax ?? 0} onChange={v => update("priceMax", Number(v) as never)} type="number" />
            </FormRow>
            <FormInput label="Location" value={form.location ?? ""} onChange={v => update("location", v)} />
            <FormInput label="Address" value={form.address ?? ""} onChange={v => update("address", v)} />
            <FormRow>
              <FormInput label="Phone" value={form.phone ?? ""} onChange={v => update("phone", v)} />
              <FormInput label="Email" value={form.email ?? ""} onChange={v => update("email", v)} type="email" />
            </FormRow>
            <FormInput label="Timing" value={form.timing ?? ""} onChange={v => update("timing", v)} placeholder="e.g. Mon-Fri 6AM-8AM, 4PM-7PM" />
            {batches.length > 0 ? (
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                Seat counts are managed automatically from the batches below.
              </p>
            ) : (
              <FormRow>
                <FormInput label="Total Seats" value={form.totalSeats ?? 20} onChange={v => update("totalSeats", Number(v) as never)} type="number" />
                <FormInput label="Seats Left" value={form.seatsLeft ?? 20} onChange={v => update("seatsLeft", Number(v) as never)} type="number" />
              </FormRow>
            )}
            <FormTextarea label="Description" value={form.description ?? ""} onChange={v => update("description", v)} rows={3} />
            <ImageUpload label="Profile Photo (portrait & listing card)" value={form.imageUrl ?? ""} onChange={v => update("imageUrl", v)} />
            <ImageUpload label="Cover Photo (detail page background)" value={form.coverImageUrl ?? ""} onChange={v => update("coverImageUrl", v)} />
            <MultiImageUpload label="Facility Photos" value={form.photos ?? []} onChange={v => update("photos", v as never)} />
            <FormTextarea label="Features (one per line)" value={(form.features ?? []).join("\n")} onChange={v => update("features", v.split("\n").filter(Boolean) as never)} rows={3} placeholder="Professional training equipment&#10;Personalized coaching&#10;Video analysis" />
            <FormTextarea label="Certifications (one per line)" value={(form.certifications ?? []).join("\n")} onChange={v => update("certifications", v.split("\n").filter(Boolean) as never)} rows={2} placeholder="AFC C License&#10;SAI Certified" />
            <div style={{ margin: "14px 0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>Batches</label>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{batches.length} batch{batches.length === 1 ? "" : "es"}</span>
              </div>
              {batches.length === 0 && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>No batches yet. Add the schedule slots students can see and join.</p>
              )}
              {batches.map((b, i) => (
                <div key={b.id ?? i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Batch {i + 1}</span>
                    <button type="button" onClick={() => rmBatch(i)} style={iconBtn} title="Remove batch"><Trash2 size={14} color="#f87171" /></button>
                  </div>
                  <FormRow>
                    <FormInput label="Day(s)" value={b.day} onChange={v => setBatch(i, "day", v)} placeholder="Mon–Wed–Fri" />
                    <FormInput label="Time" value={b.time} onChange={v => setBatch(i, "time", v)} placeholder="6:00–8:00 AM" />
                  </FormRow>
                  <FormRow>
                    <FormSelect label="Level" value={b.level} onChange={v => setBatch(i, "level", v)} options={SKILL_LEVELS.map(l => ({ value: l, label: l }))} />
                    <FormInput label="Seats" value={b.seats} onChange={v => setBatch(i, "seats", Number(v))} type="number" />
                  </FormRow>
                </div>
              ))}
              <button type="button" onClick={addBatch} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", color: "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={14} /> Add batch
              </button>
            </div>
            {error && <p style={{ fontSize: 13, color: "#f87171", marginBottom: 8 }}>{error}</p>}
            <FormActions onCancel={closeModal} submitLabel={modal === "add" ? "Add Coach" : "Save Changes"} loading={save.isPending} />
          </form>
        </AdminModal>

        {/* Delete Confirmation */}
        <AdminModal open={modal === "delete"} onClose={closeModal} title="Delete Coach" width={420}>
          <DeleteConfirm name={deleteTarget?.name ?? ""} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} onCancel={closeModal} loading={remove.isPending} />
        </AdminModal>
      </AdminShell>
    </AdminGuard>
  );
}
