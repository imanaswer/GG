"use client";
// "Near me" sort switch for the /play and /learn listings. Owns the browser
// geolocation permission dance and hands the caller plain coordinates (or null
// when switched off) — sorting itself lives in src/lib/maps.ts.
//
// Coordinates start null and the switch starts off, so the first client render
// matches the server HTML both listings go out of their way to keep crawlable.
import { useState } from "react";
import { Navigation, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import type { Coords } from "@/lib/maps";

export function NearMeToggle({ onChange }: { onChange: (c: Coords | null) => void }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = () => {
    if (on) { setOn(false); onChange(null); return; }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("This device can't share a location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBusy(false); setOn(true);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        toast.error("Allow location access to sort by what's closest to you.");
      },
      // ponytail: a 5-minute-old fix is plenty for ranking a list; raise the
      // accuracy only if the ordering ever looks wrong at street level.
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "6px 14px", borderRadius: 100,
        fontSize: 12, fontWeight: 600, fontFamily: "inherit",
        cursor: busy ? "wait" : "pointer",
        border: "1px solid",
        background: on ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.02)",
        color: on ? "#ff6b74" : "rgba(255,255,255,0.6)",
        borderColor: on ? "rgba(230,57,70,0.35)" : "rgba(255,255,255,0.07)",
        opacity: busy ? 0.65 : 1,
        transition: "all 180ms",
      }}
    >
      {busy
        ? <LoaderCircle size={12} className="near-me-spin" />
        : <Navigation size={12} fill={on ? "#ff6b74" : "none"} />}
      {busy ? "Locating…" : on ? "Nearest first" : "Near me"}
      <style>{`@keyframes near-me-spin { to { transform: rotate(360deg) } } .near-me-spin { animation: near-me-spin 800ms linear infinite }`}</style>
    </button>
  );
}
