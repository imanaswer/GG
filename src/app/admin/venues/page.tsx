"use client";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Building2, CalendarClock, Percent, Ban, Plus, X, Navigation, ChevronDown, ChevronRight, Trash2, Clock, Pencil, Archive, CheckCircle2 } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/admin/Badge";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";
import { VenueLocationPicker } from "@/components/admin/VenueLocationPicker";
import { mapsHref, hasMapTarget } from "@/lib/maps";
import { generateSlots } from "@/lib/venues";

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff" }}>Venues</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a href="/api/admin/export?type=venues" download style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", transition: "all 0.2s ease" }}
                 onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                 onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                Export CSV
              </a>
              <button onClick={() => setCreating(true)} style={primaryBtn}>
                <Plus size={15} /> Add Venue
              </button>
            </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {venues.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 14, background: "rgba(255,255,255,0.02)", borderRadius: 16 }}>No venues yet. Add your first one.</div>}
            {venues.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
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
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setSlotsFor(v)} style={iconBtn} title="Manage Slots"><CalendarClock size={16} color="#e5e7eb" /></button>
                  <button onClick={() => setEditing(v)} style={iconBtn} title="Edit Venue"><Pencil size={16} color="#60a5fa" /></button>
                  {v.status !== "ACTIVE" && <button onClick={() => setStatus(v, "ACTIVE")} style={iconBtn} title="Enable Venue"><CheckCircle2 size={16} color="#4ade80" /></button>}
                  {v.status === "ACTIVE" && <button onClick={() => setStatus(v, "INACTIVE")} style={iconBtn} title="Disable Venue"><Ban size={16} color="#eab308" /></button>}
                  {v.status !== "ARCHIVED" && <button onClick={() => setStatus(v, "ARCHIVED")} style={iconBtn} title="Archive Venue"><Archive size={16} color="#9ca3af" /></button>}
                  <button onClick={() => del(v)} style={iconBtn} title="Delete Venue"><Trash2 size={16} color="#ef4444" /></button>
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

// ─── Slot manager (simplified) ───────────────────────────────────────────────
type SlotRow = { id: string; startTime: string; endTime: string; isBlocked: boolean; blockReason: string | null; game: { id: string; title: string; status: string } | null };

const TIME_PRESETS = [
  { label: "Morning", start: "06:00", end: "12:00" },
  { label: "Afternoon", start: "12:00", end: "18:00" },
  { label: "Evening", start: "18:00", end: "22:00" },
  { label: "Full Day", start: "06:00", end: "22:00" },
] as const;

const DURATION_OPTIONS = [30, 60, 90] as const;

function fmtLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slotStatus(s: SlotRow): "booked" | "blocked" | "available" {
  if (s.game) return "booked";
  if (s.isBlocked) return "blocked";
  return "available";
}

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  available: { color: "#22c55e", label: "Available" },
  booked: { color: "#eab308", label: "Booked" },
  blocked: { color: "#fff", label: "Blocked" },
};

function SlotManager({ venue, onClose }: { venue: VenueRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: detail } = useQuery<{ slots: SlotRow[] }>({
    queryKey: ["admin-venue", venue.id],
    queryFn: () => fetch(`/api/admin/venues/${venue.id}`).then((r) => r.json()).then((j) => j.data),
  });
  const slots = detail?.slots ?? [];
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  // ─── Bulk generate state with smart defaults ───
  const today = fmtLocalDate(new Date());
  const weekOut = fmtLocalDate(new Date(Date.now() + 7 * 86400000));
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(weekOut);
  const [activePreset, setActivePreset] = useState<string>("Evening");
  const [customStart, setCustomStart] = useState("18:00");
  const [customEnd, setCustomEnd] = useState("22:00");
  const [slotMinutes, setSlotMinutes] = useState<number>(60);

  // Derive actual dayStart/dayEnd from preset or custom
  const dayTimes = useMemo(() => {
    if (activePreset === "Custom") return { dayStart: customStart, dayEnd: customEnd };
    const preset = TIME_PRESETS.find((p) => p.label === activePreset);
    return preset ? { dayStart: preset.start, dayEnd: preset.end } : { dayStart: customStart, dayEnd: customEnd };
  }, [activePreset, customStart, customEnd]);

  // Preview count using the same pure function as the backend
  const previewCount = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    try {
      return generateSlots({ fromDate, toDate, ...dayTimes, slotMinutes }).length;
    } catch { return 0; }
  }, [fromDate, toDate, dayTimes, slotMinutes]);

  // ─── Collapsed date groups ───
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const toggleDateCollapse = (dateKey: string) => setCollapsedDates((prev) => {
    const next = new Set(prev);
    next.has(dateKey) ? next.delete(dateKey) : next.add(dateKey);
    return next;
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-venue", venue.id] }); qc.invalidateQueries({ queryKey: ["admin-venues"] }); };

  const act = async (fn: () => Promise<Response>, action: string = "action") => {
    setErr(null);
    setBusyAction(action);
    setBusy(true);
    try { await fn().then(jsonOrThrow); refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusyAction(null); setBusy(false); }
  };

  const generate = () => {
    if (!fromDate || !toDate) { setErr("Pick a date range."); return; }
    if (previewCount === 0) { setErr("This range produces 0 slots. Check times and duration."); return; }
    act(() => fetch(`/api/admin/venues/${venue.id}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate, toDate, ...dayTimes, slotMinutes }),
    }), "generating");
  };

  const blockSlot = (s: SlotRow) => {
    if (s.isBlocked) {
      act(() => fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: false }) }));
      return;
    }
    const reason = prompt("Block reason (e.g. Maintenance, Tournament, Private event, Holiday):", "Maintenance");
    if (reason === null) return;
    act(() => fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: true, blockReason: reason }) }));
  };

  const deleteSlot = (s: SlotRow) => {
    const timeStr = `${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}`;
    if (!confirm(`Delete this slot?\n\n${timeStr}${s.game ? `\n\nWarning: this slot is booked (${s.game.title}).` : ""}`)) return;
    act(() => fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "DELETE" }));
  };

  // ─── Cleanup past slots with inline confirmation ───
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  const deletePastSlots = async () => {
    const pastSlots = slots.filter((s) => new Date(s.endTime) < new Date() && !s.game);
    if (pastSlots.length === 0) { setErr("No past unbooked slots to clean up."); return; }
    if (!confirmCleanup) { setConfirmCleanup(true); return; }
    setErr(null);
    setBusyAction("deleting");
    setBusy(true);
    try {
      for (const s of pastSlots) {
        await fetch(`/api/admin/venues/${venue.id}/slots/${s.id}`, { method: "DELETE" }).then(jsonOrThrow);
      }
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { 
      setConfirmCleanup(false);
      setBusyAction(null); 
      setBusy(false); 
    }
  };

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedSlots.size === 0) return;
    const hasBooked = Array.from(selectedSlots).some((id) => slots.find((s) => s.id === id)?.game);
    if (!confirm(`Delete ${selectedSlots.size} selected slots?${hasBooked ? '\n\nWarning: One or more selected slots are booked!' : ''}`)) return;

    setErr(null);
    setBusyAction("deleting_selected");
    setBusy(true);
    try {
      for (const id of selectedSlots) {
        await fetch(`/api/admin/venues/${venue.id}/slots/${id}`, { method: "DELETE" }).then(jsonOrThrow);
      }
      setSelectedSlots(new Set());
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally {
      setBusyAction(null);
      setBusy(false);
    }
  };

  // ─── Group slots by date ───
  const grouped = useMemo(() => {
    const map = new Map<string, SlotRow[]>();
    for (const s of slots) {
      const d = new Date(s.startTime);
      const key = fmtLocalDate(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([dateKey, daySlots]) => {
      const booked = daySlots.filter((s) => s.game).length;
      const blocked = daySlots.filter((s) => s.isBlocked && !s.game).length;
      const available = daySlots.length - booked - blocked;
      return { dateKey, daySlots, booked, blocked, available };
    });
  }, [slots]);

  const pastCount = useMemo(() => slots.filter((s) => new Date(s.endTime) < new Date() && !s.game).length, [slots]);

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const fmtDateHeader = (dateKey: string) => {
    const d = new Date(dateKey + "T00:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <Modal title={`Slots — ${venue.name}`} onClose={onClose} wide>
      {err && <div style={errBox}>{err}</div>}

      {/* ─── Simplified bulk generator ─── */}
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Plus size={14} color="#fff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Generate Slots</span>
        </div>

        {/* Date range */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <Field label="From">
            <input type="date" style={input} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" style={input} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
        </div>

        {/* Time presets */}
        <Field label="Time window">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setActivePreset(p.label)}
                style={activePreset === p.label ? pillOn : pillOff}
              >
                {p.label}
                <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                  {p.start.replace(/:00$/, "")}–{p.end.replace(/:00$/, "")}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActivePreset("Custom")}
              style={activePreset === "Custom" ? pillOn : pillOff}
            >
              Custom
            </button>
          </div>
        </Field>

        {/* Custom time inputs — only shown when "Custom" is selected */}
        {activePreset === "Custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Field label="Start time">
              <input type="time" style={input} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </Field>
            <Field label="End time">
              <input type="time" style={input} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </Field>
          </div>
        )}

        {/* Slot duration */}
        <Field label="Slot duration">
          <div style={{ display: "flex", gap: 6 }}>
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSlotMinutes(d)}
                style={slotMinutes === d ? pillOn : pillOff}
              >
                {d} min
              </button>
            ))}
          </div>
        </Field>

        {/* Preview + Generate */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 12, color: previewCount > 0 ? "#a3e635" : "#6b7280" }}>
            {previewCount > 0
              ? <>Will generate <strong style={{ color: "#fff" }}>{previewCount}</strong> slot{previewCount !== 1 ? "s" : ""}</>
              : "No slots for this range"}
          </span>
          <button
            onClick={generate}
            disabled={busy || previewCount === 0}
            style={{
              ...primaryBtn,
              justifyContent: "center",
              height: 38,
              padding: "9px 22px",
              opacity: busy || previewCount === 0 ? 0.5 : 1,
            }}
          >
            {busyAction === "generating" ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {/* ─── Quick actions ─── */}
      {slots.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "#6b7280" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT.available.color, display: "inline-block" }} />
              Available
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT.booked.color, display: "inline-block" }} />
              Booked
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT.blocked.color, display: "inline-block" }} />
              Blocked
            </span>
          </div>
          {selectedSlots.size > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: "#e5e7eb", fontWeight: 500 }}>{selectedSlots.size} selected</span>
              <button onClick={deleteSelected} disabled={busy} style={{
                ...dangerBtn, fontSize: 11, padding: "4px 10px",
                opacity: busy ? 0.5 : 1,
              }}>
                {busyAction === "deleting_selected" ? "Deleting..." : "Delete selected"}
              </button>
              {!busy && (
                <button onClick={() => setSelectedSlots(new Set())} style={{ ...ghostBtnSm }}>Cancel</button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {pastCount > 0 && !confirmCleanup && (
                <button onClick={deletePastSlots} disabled={busy} style={{
                  ...ghostBtn, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5,
                  color: "#fff", borderColor: "rgba(255,255,255,0.25)",
                  opacity: busy ? 0.5 : 1,
                }}>
                  <Trash2 size={12} /> Clean up {pastCount} past slot{pastCount !== 1 ? "s" : ""}
                </button>
              )}
              {confirmCleanup && (
                <>
                  <span style={{ fontSize: 11.5, color: "#fff", fontWeight: 600 }}>Delete {pastCount} past slots?</span>
                  <button onClick={deletePastSlots} disabled={busy} style={{
                    ...dangerBtn, fontSize: 11, padding: "4px 10px",
                    opacity: busy ? 0.5 : 1,
                  }}>
                    {busyAction === "deleting" ? "Deleting..." : "Yes, delete"}
                  </button>
                  {!busy && (
                    <button onClick={() => setConfirmCleanup(false)} style={{ ...ghostBtnSm }}>Cancel</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Date-grouped slot list ─── */}
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {slots.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
            <Clock size={28} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            No slots yet. Use the generator above to create slots.
          </div>
        )}
        {grouped.map(({ dateKey, daySlots, booked, blocked, available }) => {
          const collapsed = collapsedDates.has(dateKey);
          const isPast = new Date(dateKey + "T23:59:59") < new Date();
          return (
            <div key={dateKey} style={{ marginBottom: 2 }}>
              {/* Date header */}
              <button
                onClick={() => toggleDateCollapse(dateKey)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "10px 8px", background: "rgba(255,255,255,0.03)", border: "none",
                  borderRadius: 8, cursor: "pointer", textAlign: "left",
                  opacity: isPast ? 0.5 : 1,
                }}
              >
                {collapsed ? <ChevronRight size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e5e7eb", flex: 1 }}>
                  {fmtDateHeader(dateKey)}
                </span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                  {booked > 0 && <span style={{ color: STATUS_DOT.booked.color, marginLeft: 6 }}>{booked} booked</span>}
                  {blocked > 0 && <span style={{ color: STATUS_DOT.blocked.color, marginLeft: 6 }}>{blocked} blocked</span>}
                  {available > 0 && <span style={{ color: STATUS_DOT.available.color, marginLeft: 6 }}>{available} free</span>}
                </span>
              </button>

              {/* Slot rows */}
              {!collapsed && (
                <div style={{ paddingLeft: 22 }}>
                  {daySlots.map((s) => {
                    const st = slotStatus(s);
                    const dot = STATUS_DOT[st];
                    return (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "7px 6px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedSlots.has(s.id)}
                          onChange={() => toggleSlotSelection(s.id)}
                          style={{
                            marginRight: 2,
                            accentColor: "#fff",
                            cursor: "pointer",
                            width: 14, height: 14
                          }}
                        />
                        {/* Status dot */}
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%", background: dot.color,
                          flexShrink: 0, boxShadow: `0 0 6px ${dot.color}40`,
                        }} title={dot.label} />

                        {/* Time */}
                        <div style={{ flex: 1, fontSize: 12.5, color: st === "blocked" ? "#6b7280" : "#e5e7eb" }}>
                          {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                          {s.isBlocked && (
                            <span style={{ marginLeft: 8, color: "#fff", fontSize: 11, fontStyle: "italic" }}>
                              {s.blockReason || "blocked"}
                            </span>
                          )}
                          {s.game && (
                            <span style={{ marginLeft: 8, color: "#eab308", fontSize: 11 }}>
                              {s.game.title} ({s.game.status})
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <button onClick={() => blockSlot(s)} disabled={busy} style={{ ...ghostBtnSm }}>
                          {s.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button onClick={() => deleteSlot(s)} disabled={busy} style={{ ...dangerBtnSm }}>
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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

const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontFamily: "inherit", colorScheme: "dark", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 100, border: "none", background: "#fff", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#d1d5db", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const ghostBtnSm: React.CSSProperties = { padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#9ca3af", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const dangerBtnSm: React.CSSProperties = { padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const sportTag: React.CSSProperties = { padding: "4px 10px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "#d1d5db", fontSize: 11, fontWeight: 600 };
const pillOn: React.CSSProperties = { padding: "6px 16px", borderRadius: 100, border: "1px solid #fff", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const pillOff: React.CSSProperties = { padding: "6px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#9ca3af", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const errBox: React.CSSProperties = { padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13, marginBottom: 16 };
const iconBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.2s" };

