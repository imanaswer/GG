"use client";
import { Search, Download } from "lucide-react";
import type { SortKey, DatePreset, DateAxis } from "@/lib/adminBookings/types";

export interface ToolbarState {
  q: string; date: DatePreset; from: string; to: string; sort: SortKey; by: DateAxis; group: "day" | "off";
}

const inputStyle = {
  height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
  background: "#1c1c1c", color: "#fff", fontSize: 13, fontFamily: "inherit",
  padding: "0 10px", outline: "none",
} as const;

export function BookingsToolbar({
  state, onChange, onExport,
}: { state: ToolbarState; onChange: (s: ToolbarState) => void; onExport: () => void }) {
  const set = (patch: Partial<ToolbarState>) => onChange({ ...state, ...patch });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: "#6b7280" }} />
        <input value={state.q} onChange={e => set({ q: e.target.value })} placeholder="Search name, email, ID, entity…"
          style={{ ...inputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
      </div>
      <select value={state.date} onChange={e => set({ date: e.target.value as DatePreset })} style={inputStyle}>
        <option value="upcoming">Upcoming</option>
        <option value="today">Today</option>
        <option value="tomorrow">Tomorrow</option>
        <option value="past">Past</option>
        <option value="all">All dates</option>
        <option value="custom">Custom…</option>
      </select>
      <select value={state.by} onChange={e => set({ by: e.target.value as DateAxis })} style={inputStyle} title="Which date the filter uses">
        <option value="session">By: Session date</option>
        <option value="booking">By: Booking date</option>
      </select>
      <button
        onClick={() => set({ group: state.group === "day" ? "off" : "day" })}
        style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: state.group === "day" ? "#e63946" : "#9ca3af" }}
      >
        {state.group === "day" ? "▼ Grouped" : "Group by date"}
      </button>
      {state.date === "custom" && (
        <>
          <input type="date" value={state.from} onChange={e => set({ from: e.target.value })} style={inputStyle} />
          <input type="date" value={state.to} onChange={e => set({ to: e.target.value })} style={inputStyle} />
        </>
      )}
      <select value={state.sort} onChange={e => set({ sort: e.target.value as SortKey })} style={inputStyle}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="upcoming">Upcoming first</option>
        <option value="updated">Recently updated</option>
      </select>
      <button onClick={onExport} style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "#e5e7eb" }}>
        <Download size={14} /> Export CSV
      </button>
    </div>
  );
}
