"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Building2, CalendarClock, Percent, Ban, Plus, X, Navigation } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/admin/Badge";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";
import { VenueLocationPicker } from "@/components/admin/VenueLocationPicker";
import { mapsHref, hasMapTarget } from "@/lib/maps";

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball", "Other"];

type VenueRow = {
  id: string; name: string; description: string; address: string;
  lat: number | null; lng: number | null; images: string[]; supportedSports: string[];
  status: string; slotCount: number; blockedSlots: number; upcomingGames: number; occupancyRate: number;
};
type Analytics = {
  totalVenues: number; activeVenues: number; inactiveVenues: number; archivedVenues: number;
  upcomingGames: number; blockedSlots: number; occupancyRate: number;
};

async function jsonOrThrow(r: Response) {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Request failed");
  return j.data;
}

export default function AdminVenues() {
  const qc = useQueryClient();
  const { data } = useQuery<{ venues: VenueRow[]; analytics: Analytics }>({
    queryKey: ["admin-venues"],
    queryFn: () => fetch("/api/admin/venues").then((r) => r.json()).then((j) => j.data),
  });
  const venues = data?.venues ?? [];
  const a = data?.analytics;

  const [editing, setEditing] = useState<VenueRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [slotsFor, setSlotsFor] = useState<VenueRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-venues"] });

  const setStatus = async (v: VenueRow, status: string) => {
    setErr(null);
    try {
      await fetch(`/api/admin/venues/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(jsonOrThrow);
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  const del = async (v: VenueRow) => {
    if (!confirm(`Delete "${v.name}"? This removes all its slots. Historical games keep their saved location.`)) return;
    setErr(null);
    try {
      await fetch(`/api/admin/venues/${v.id}`, { method: "DELETE" }).then(jsonOrThrow);
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  const statusBadge = (s: string) => <Badge status={s.toLowerCase()} />;

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Venues</h1>
            <button onClick={() => setCreating(true)} style={primaryBtn}>
              <Plus size={15} /> Add Venue
            </button>
          </div>

          {err && <div style={errBox}>{err}</div>}

          {/* Analytics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard value={a?.totalVenues ?? 0} label="Total venues" icon={Building2} />
            <StatCard value={a?.activeVenues ?? 0} label="Active venues" icon={MapPin} accent color="#22c55e" />
            <StatCard value={a?.upcomingGames ?? 0} label="Upcoming games" icon={CalendarClock} />
            <StatCard value={`${a?.occupancyRate ?? 0}%`} label="Avg occupancy" icon={Percent} />
            <StatCard value={a?.blockedSlots ?? 0} label="Blocked slots" icon={Ban} />
          </div>

          {/* Venue list */}
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            {venues.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 14 }}>No venues yet. Add your first one.</div>}
            {venues.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{v.name}</span>
                    {statusBadge(v.status)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7280" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.address}</span>
                    {hasMapTarget(v) && (
                      <a href={mapsHref(v)} target="_blank" rel="noopener noreferrer" title="Open in Google Maps" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#60a5fa", textDecoration: "none", flexShrink: 0, fontWeight: 600 }}>
                        <Navigation size={11} /> Map
                      </a>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {v.supportedSports.map((s) => (
                      <span key={s} style={sportTag}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                  <div>{v.slotCount} slots · {v.blockedSlots} blocked</div>
                  <div>{v.upcomingGames} upcoming · {v.occupancyRate}% full</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 320 }}>
                  <button onClick={() => setSlotsFor(v)} style={ghostBtn}>Slots</button>
                  <button onClick={() => setEditing(v)} style={ghostBtn}>Edit</button>
                  {v.status !== "ACTIVE" && <button onClick={() => setStatus(v, "ACTIVE")} style={ghostBtn}>Enable</button>}
                  {v.status === "ACTIVE" && <button onClick={() => setStatus(v, "INACTIVE")} style={ghostBtn}>Disable</button>}
                  {v.status !== "ARCHIVED" && <button onClick={() => setStatus(v, "ARCHIVED")} style={ghostBtn}>Archive</button>}
                  <button onClick={() => del(v)} style={dangerBtn}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(creating || editing) && (
          <VenueFormModal
            venue={editing}
            onClose={() => { setCreating(false); setEditing(null); }}
            onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
          />
        )}
        {slotsFor && <SlotManager venue={slotsFor} onClose={() => setSlotsFor(null)} />}
      </AdminShell>
    </AdminGuard>
  );
}

// ─── Venue create/edit modal ─────────────────────────────────────────────────
function VenueFormModal({ venue, onClose, onSaved }: { venue: VenueRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: venue?.name ?? "", description: venue?.description ?? "", address: venue?.address ?? "",
    lat: venue?.lat != null ? String(venue.lat) : "", lng: venue?.lng != null ? String(venue.lng) : "",
  });
  const [sports, setSports] = useState<string[]>(venue?.supportedSports ?? []);
  const [images, setImages] = useState<string[]>(venue?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSport = (s: string) => setSports((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const save = async () => {
    setErr(null);
    if (!form.name.trim() || !form.address.trim() || sports.length === 0) {
      setErr("Name, address and at least one sport are required."); return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(), description: form.description.trim(), address: form.address.trim(),
      lat: form.lat ? Number(form.lat) : undefined, lng: form.lng ? Number(form.lng) : undefined,
      images, supportedSports: sports,
    };
    try {
      const url = venue ? `/api/admin/venues/${venue.id}` : "/api/admin/venues";
      await fetch(url, { method: venue ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(jsonOrThrow);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); setBusy(false); }
  };

  return (
    <Modal title={venue ? "Edit venue" : "Add venue"} onClose={onClose}>
      {err && <div style={errBox}>{err}</div>}
      <Field label="Name"><input style={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="EMS Turf A" /></Field>
      <Field label="Address & map">
        <VenueLocationPicker
          address={form.address}
          lat={form.lat ? Number(form.lat) : null}
          lng={form.lng ? Number(form.lng) : null}
          onChange={(n) => setForm((p) => ({
            ...p,
            ...(n.address !== undefined ? { address: n.address } : {}),
            ...(n.lat !== undefined ? { lat: n.lat == null ? "" : String(n.lat) } : {}),
            ...(n.lng !== undefined ? { lng: n.lng == null ? "" : String(n.lng) } : {}),
          }))}
        />
      </Field>
      <Field label="Description"><textarea style={{ ...input, minHeight: 70, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Latitude (auto · editable)"><input style={input} value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="11.2588" /></Field>
        <Field label="Longitude (auto · editable)"><input style={input} value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="75.7804" /></Field>
      </div>
      <Field label="Supported sports">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {SPORTS.map((s) => (
            <button key={s} type="button" onClick={() => toggleSport(s)} style={sports.includes(s) ? pillOn : pillOff}>{s}</button>
          ))}
        </div>
      </Field>
      <Field label="Images">
        <MultiImageUpload value={images} onChange={setImages} max={6} />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...ghostBtn, flex: 1, padding: "11px" }}>Cancel</button>
        <button onClick={save} disabled={busy} style={{ ...primaryBtn, flex: 1, justifyContent: "center", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save venue"}</button>
      </div>
    </Modal>
  );
}

// ─── Slot manager ────────────────────────────────────────────────────────────
type SlotRow = { id: string; startTime: string; endTime: string; isBlocked: boolean; blockReason: string | null; game: { id: string; title: string; status: string } | null };

function SlotManager({ venue, onClose }: { venue: VenueRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: detail } = useQuery<{ slots: SlotRow[] }>({
    queryKey: ["admin-venue", venue.id],
    queryFn: () => fetch(`/api/admin/venues/${venue.id}`).then((r) => r.json()).then((j) => j.data),
  });
  const slots = detail?.slots ?? [];
  const [err, setErr] = useState<string | null>(null);
  const [bulk, setBulk] = useState({ fromDate: "", toDate: "", dayStart: "18:00", dayEnd: "22:00", slotMinutes: "60" });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-venue", venue.id] }); qc.invalidateQueries({ queryKey: ["admin-venues"] }); };

  const act = async (fn: () => Promise<Response>) => {
    setErr(null);
    try { await fn().then(jsonOrThrow); refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  const generate = () => {
    if (!bulk.fromDate || !bulk.toDate) { setErr("Pick a date range."); return; }
    act(() => fetch(`/api/admin/venues/${venue.id}/slots`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...bulk, slotMinutes: Number(bulk.slotMinutes) }) }));
  };
  const block = (s: SlotRow) => {
    if (s.isBlocked) { act(() => fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: false }) })); return; }
    const reason = prompt("Block reason (e.g. Maintenance, Tournament, Private event, Holiday):", "Maintenance");
    if (reason === null) return;
    act(() => fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: true, blockReason: reason }) }));
  };
  const del = (s: SlotRow) => act(() => fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "DELETE" }));

  const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Modal title={`Slots — ${venue.name}`} onClose={onClose} wide>
      {err && <div style={errBox}>{err}</div>}

      {/* Bulk generate */}
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Bulk generate slots</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 92px auto", gap: 8, alignItems: "end" }}>
          <Field label="From"><input type="date" style={input} value={bulk.fromDate} onChange={(e) => setBulk((p) => ({ ...p, fromDate: e.target.value }))} /></Field>
          <Field label="To"><input type="date" style={input} value={bulk.toDate} onChange={(e) => setBulk((p) => ({ ...p, toDate: e.target.value }))} /></Field>
          <Field label="Day start"><input type="time" style={input} value={bulk.dayStart} onChange={(e) => setBulk((p) => ({ ...p, dayStart: e.target.value }))} /></Field>
          <Field label="Day end"><input type="time" style={input} value={bulk.dayEnd} onChange={(e) => setBulk((p) => ({ ...p, dayEnd: e.target.value }))} /></Field>
          <Field label="Slot mins"><input type="number" style={input} value={bulk.slotMinutes} onChange={(e) => setBulk((p) => ({ ...p, slotMinutes: e.target.value }))} /></Field>
          <button onClick={generate} style={{ ...primaryBtn, justifyContent: "center", height: 38 }}>Generate</button>
        </div>
      </div>

      {/* Slot list */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {slots.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: 13 }}>No slots yet. Generate some above.</div>}
        {slots.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ flex: 1, fontSize: 12.5, color: s.isBlocked ? "#6b7280" : "#e5e7eb" }}>
              {fmt(s.startTime)} – {new Date(s.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              {s.isBlocked && <span style={{ marginLeft: 8, color: "#f87171", fontSize: 11 }}>blocked{s.blockReason ? `: ${s.blockReason}` : ""}</span>}
              {s.game && <span style={{ marginLeft: 8, color: "#eab308", fontSize: 11 }}>booked: {s.game.title} ({s.game.status})</span>}
            </div>
            <button onClick={() => block(s)} style={ghostBtn}>{s.isBlocked ? "Unblock" : "Block"}</button>
            <button onClick={() => del(s)} style={dangerBtn}>Delete</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Small shared UI bits ────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: wide ? 760 : 520, background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

const input: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, fontFamily: "inherit" };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "none", background: "#980808", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "6px 11px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "6px 11px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const sportTag: React.CSSProperties = { padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "#9ca3af", fontSize: 11, fontWeight: 600 };
const pillOn: React.CSSProperties = { padding: "6px 13px", borderRadius: 100, border: "1px solid #980808", background: "rgba(152,8,8,0.15)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const pillOff: React.CSSProperties = { padding: "6px 13px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#9ca3af", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const errBox: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13, marginBottom: 14 };
