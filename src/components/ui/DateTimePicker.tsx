"use client";
import { useMemo, useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { timeSlots, isSlotPast } from "@/lib/gameTime";

type Props = {
  date: string;            // "YYYY-MM-DD" or ""
  time: string;            // "HH:MM" or ""
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
};

const RED = "#980808";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange }: Props) {
  const now = new Date();
  const today = ymd(now);

  // The visible month. Starts on the selected date's month, else the current month.
  // Independent of selection so navigating months never changes the chosen date.
  const [view, setView] = useState(() => {
    const base = date ? new Date(`${date}T00:00:00`) : now;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const atCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  const grid = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startDow = first.getDay();
    const days = new Date(view.year, view.month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(ymd(new Date(view.year, view.month, d)));
    return cells;
  }, [view]);

  const slots = useMemo(() => timeSlots(15), []);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the time list to the selected (or first enabled) slot.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>("[data-active='true'], [data-enabled='true']");
    el?.scrollIntoView({ block: "center" });
  }, [date]);

  const changeMonth = (delta: number) => {
    setView(v => {
      const m = new Date(v.year, v.month + delta, 1);
      // Never navigate to a month entirely before the current month.
      if (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() < now.getMonth())) return v;
      return { year: m.getFullYear(), month: m.getMonth() };
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 168px", gap: 14 }} className="dtp-grid">
      {/* Calendar */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button type="button" onClick={() => changeMonth(-1)} disabled={atCurrentMonth} aria-label="Previous month"
            style={{ ...navBtn, opacity: atCurrentMonth ? 0.35 : 1, cursor: atCurrentMonth ? "not-allowed" : "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{MONTHS[view.month]} {view.year}</div>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" style={navBtn}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {DOW.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontWeight: 600, padding: "2px 0" }}>{d}</div>)}
          {grid.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} />;
            const isPast = cell < today;
            const isToday = cell === today;
            const isSelected = cell === date;
            return (
              <button
                key={cell}
                type="button"
                disabled={isPast}
                onClick={() => { if (!isPast) onDateChange(cell); }}
                style={{
                  aspectRatio: "1", borderRadius: 9, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                  cursor: isPast ? "not-allowed" : "pointer",
                  border: isToday && !isSelected ? `1px solid ${RED}` : "1px solid transparent",
                  background: isSelected ? `linear-gradient(135deg, ${RED} 0%, #6b0505 100%)` : "transparent",
                  color: isPast ? "rgba(255,255,255,0.18)" : isSelected ? "#fff" : "rgba(255,255,255,0.8)",
                }}
              >
                {Number(cell.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time list */}
      <div ref={listRef} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 6, maxHeight: 260, overflowY: "auto" }}>
        {!date && <div style={{ padding: 12, fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>Pick a date first</div>}
        {date && slots.map(s => {
          const disabled = isSlotPast(s.value, date, now);
          const active = s.value === time;
          return (
            <button
              key={s.value}
              type="button"
              disabled={disabled}
              data-active={active}
              data-enabled={!disabled && !active}
              onClick={() => onTimeChange(s.value)}
              style={{
                width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                background: active ? `linear-gradient(135deg, ${RED} 0%, #6b0505 100%)` : "transparent",
                color: disabled ? "rgba(255,255,255,0.18)" : active ? "#fff" : "rgba(255,255,255,0.75)",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <style>{`@media (max-width:640px){ .dtp-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer",
};
