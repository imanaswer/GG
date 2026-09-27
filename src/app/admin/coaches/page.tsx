"use client";
import { useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { AdminModal, FormField, FormInput, FormTextarea, FormSelect, FormMultiSelect, FormCombobox, FormRow, FormActions, DeleteConfirm } from "@/components/admin/AdminModal";
import { VenueLocationPicker } from "@/components/admin/VenueLocationPicker";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Pencil, Trash2, Link2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { COACH_TYPES, SKILL_LEVELS, formatPrice } from "@/lib/taxonomy";

type BatchRow = { id?: string; day: string; time: string; level: string; seats: number };

type Coach = {
  id: string; name: string; sport: string; type: string; skillLevel: string;
  location: string; address: string; lat: number | null; lng: number | null;
  price: string; priceMin: number; priceMax: number;
  timing: string; phone: string; email: string; description: string;
  features: string[]; certifications: string[]; imageUrl: string; coverImageUrl: string; photos: string[];
  seatsLeft: number; totalSeats: number; rating: number; reviewCount: number;
  status: string; totalBookings: number; confirmedBookings: number; revenue: number;
  agreement?: { id: string; acceptedAt: string; version: string } | null;
  batches?: BatchRow[];
};

const EMPTY: Partial<Coach> = {
  name: "", sport: "Football", type: "Personal Trainer", skillLevel: "All Levels",
  location: "", address: "", lat: null, lng: null, price: "", priceMin: 0, priceMax: 0,
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} coaches?`)) return;
    
    setBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch("/api/admin/coaches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-coaches"] });
      setSelectedIds(new Set());
    } catch (err) {
      alert("Error deleting some coaches");
    } finally {
      setBulkDeleting(false);
    }
  };

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
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff" }}>Coaches Manager</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a href="/api/admin/export?type=coaches" download style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", transition: "all 0.2s ease" }}
                 onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                 onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                Export CSV
              </a>
              <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 100, background: "#fff", border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={15} />Add Coach
              </button>
            </div>
          </div>

          {pending.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#eab308" }}>Pending Approval</h2>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308" }}>{pending.length}</span>
              </div>
              <div className="admin-coaches-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {pending.map(c => (
                  <div key={c.id} className="admin-coach-card" style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", border: `1px solid ${selectedIds.has(c.id) ? "rgba(96,165,250,0.5)" : "rgba(234,179,8,0.25)"}`, borderRadius: 24, padding: 24, gap: 20, position: "relative" }}>
                    <div style={{ position: "absolute", top: 24, right: 24 }}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) next.add(c.id); else next.delete(c.id); setSelectedIds(next); }} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#60a5fa" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingRight: 32 }}>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{c.name}</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.1)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.sport}</span>
                          {c.type.split(",").map(t => (
                            <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{t.trim()}</span>
                          ))}
                        </div>
                      </div>
                      <Badge status="pending_approval" />
                    </div>
                    
                    <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 600 }}>{formatPrice(c.priceMin, c.priceMax)}/session</div>

                    <div className="admin-coach-actions" style={{ display: "grid", gap: 12, marginTop: "auto" }}>
                      <button onClick={() => approve.mutate({ id: c.id, action: "approve" })} style={{ padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Approve</button>
                      <button onClick={() => approve.mutate({ id: c.id, action: "reject" })}  style={{ padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>All Coaches ({active.length} active)</h2>
            {selectedIds.size > 0 && (
              <button onClick={bulkDeleteSelected} disabled={bulkDeleting} style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", padding: "6px 14px", borderRadius: 100, cursor: bulkDeleting ? "wait" : "pointer", fontWeight: 700 }}>
                {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
              </button>
            )}
          </div>
          <div className="admin-coaches-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20, marginBottom: 40 }}>
            {!coaches.length ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", gridColumn: "1 / -1", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 24 }}>No coaches found</div>
            ) : coaches.map(c => {
              const pct = c.totalSeats ? Math.round(((c.totalSeats - c.seatsLeft) / c.totalSeats) * 100) : 0;
              return (
                <div key={c.id} className="admin-coach-card" style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", border: `1px solid ${selectedIds.has(c.id) ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.05)"}`, borderRadius: 24, padding: 24, gap: 20, position: "relative" }}>
                  <div style={{ position: "absolute", top: 24, right: 24 }}>
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) next.add(c.id); else next.delete(c.id); setSelectedIds(next); }} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#60a5fa" }} />
                  </div>
                  
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingRight: 32 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{c.name}</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.1)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.sport}</span>
                        {c.type.split(",").map(t => (
                          <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{t.trim()}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <Badge status={c.status} />
                      {c.agreement ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: 100 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.05em" }}>Signed</span>
                          <a href={`/api/coach/agreements/${c.agreement.id}/pdf`} style={{ fontSize: 10, color: "#60a5fa", textDecoration: "none", fontWeight: 700 }}>PDF</a>
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(234,179,8,0.1)", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Pending Sig.</span>
                      )}
                    </div>
                  </div>

                  {/* Middle Stats Grid */}
                  <div className="admin-coach-stats" style={{ display: "grid", gap: 16, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, marginTop: "auto" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Seats</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)" }}>{c.seatsLeft} <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--font-sans)" }}>/ {c.totalSeats}</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Bookings</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)" }}>{c.confirmedBookings} <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--font-sans)" }}>/ {c.totalBookings}</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Rating</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "var(--font-serif)" }}>
                        <span style={{ color: "#eab308", fontSize: 14 }}>★</span> {c.rating.toFixed(1)} <span style={{ color: "#6b7280", fontWeight: 600, fontSize: 12, fontFamily: "var(--font-sans)" }}>({c.reviewCount})</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Price</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)" }}>{c.price}</div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => openEdit(c)} style={{ ...iconBtn, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }} title="Edit"><Pencil size={14} color="#fff" /></button>
                      <button onClick={() => copySignLink(c)} style={{ ...iconBtn, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }} title="Copy link"><Link2 size={14} color="#fff" /></button>
                      <button onClick={() => openDelete(c)} style={{ ...iconBtn, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)" }} title="Delete"><Trash2 size={14} color="#ef4444" /></button>
                    </div>
                    <Link href={`/coach/${c.id}`} target="_blank" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#60a5fa", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.05em" }} title="View Profile">
                      Profile <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
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
            {/* Pin the coach on the map — the lat/lng it captures is what powers
                "Near me" on /learn. Same picker the venue form uses. */}
            <FormField label="Address & map">
              <VenueLocationPicker
                address={form.address ?? ""}
                lat={form.lat ?? null}
                lng={form.lng ?? null}
                onChange={n => setForm(p => ({
                  ...p,
                  ...(n.address !== undefined ? { address: n.address } : {}),
                  ...(n.lat !== undefined ? { lat: n.lat } : {}),
                  ...(n.lng !== undefined ? { lng: n.lng } : {}),
                }))}
              />
            </FormField>
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
            <ImageUpload label="Profile Photo (portrait & listing card)" value={form.imageUrl ?? ""} onChange={v => update("imageUrl", v)} aspect={5 / 4} />
            <ImageUpload label="Cover Photo (detail page background)" value={form.coverImageUrl ?? ""} onChange={v => update("coverImageUrl", v)} aspect={16 / 9} />
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
                    <button type="button" onClick={() => rmBatch(i)} style={iconBtn} title="Remove batch"><Trash2 size={14} color="#ef4444" /></button>
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
            {error && <p style={{ fontSize: 13, color: "#fff", marginBottom: 8 }}>{error}</p>}
            <FormActions onCancel={closeModal} submitLabel={modal === "add" ? "Add Coach" : "Save Changes"} loading={save.isPending} />
          </form>
        </AdminModal>

        {/* Delete Confirmation */}
        <AdminModal open={modal === "delete"} onClose={closeModal} title="Delete Coach" width={420}>
          <DeleteConfirm name={deleteTarget?.name ?? ""} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} onCancel={closeModal} loading={remove.isPending} />
        </AdminModal>

        <style>{`
            .admin-coach-stats {
              grid-template-columns: 1fr 1fr;
            }
            .admin-coach-actions {
              grid-template-columns: 1fr 1fr;
            }
          @media (max-width: 768px) {
            .admin-coach-card {
              padding: 20px !important;
            }
            .admin-coach-card h3 {
              font-size: 16px !important;
            }
          }
        `}</style>
      </AdminShell>
    </AdminGuard>
  );
}
