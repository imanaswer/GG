"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
// Address + map location picker for the venue form. Type an address (Google
// Places Autocomplete) OR click / drag the pin on the map — both keep the
// address text and lat/lng in sync. No npm dependency: the Maps JS API is
// injected once via a module-level singleton. Degrades to a plain address
// input (with manual coordinate entry in the form) when the key is missing or
// the script fails to load.
import { useEffect, useRef, useState } from "react";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const DEFAULT_CENTER = { lat: 11.2588, lng: 75.7804 }; // Kozhikode

let mapsPromise: Promise<any> | null = null;
function loadMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (!MAPS_KEY) return Promise.reject(new Error("no maps key"));
  if (!mapsPromise) {
    mapsPromise = new Promise<any>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,marker&loading=async&v=weekly`;
      s.async = true;
      s.onload = async () => {
        try {
          await w.google.maps.importLibrary("maps");
          await w.google.maps.importLibrary("places");
          try { await w.google.maps.importLibrary("marker"); } catch { /* marker optional */ }
          resolve(w.google.maps);
        } catch (e) { reject(e); }
      };
      s.onerror = () => reject(new Error("maps script failed"));
      document.head.appendChild(s);
    });
  }
  return mapsPromise;
}

const round = (n: number) => Number(n.toFixed(6));

export function VenueLocationPicker({
  address, lat, lng, onChange,
}: {
  address: string;
  lat: number | null;
  lng: number | null;
  onChange: (next: { address?: string; lat?: number | null; lng?: number | null }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const objs = useRef<{ map?: any; marker?: any; geocoder?: any }>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!MAPS_KEY);

  // Always call the latest onChange without re-initialising the map.
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let cancelled = false;
    if (!MAPS_KEY) { setFailed(true); return; }

    loadMaps().then((maps: any) => {
      if (cancelled || !mapRef.current) return;
      const hasPin = lat != null && lng != null;
      const center = hasPin ? { lat: lat!, lng: lng! } : DEFAULT_CENTER;
      const map = new maps.Map(mapRef.current, {
        center, zoom: hasPin ? 16 : 12,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      const geocoder = new maps.Geocoder();
      let marker: any = null;
      if (maps.Marker) marker = new maps.Marker({ map, position: center, draggable: true, visible: hasPin });
      objs.current = { map, marker, geocoder };

      const place = (la: number, ln: number, reverse: boolean) => {
        if (marker) { marker.setPosition({ lat: la, lng: ln }); marker.setVisible(true); }
        else { map.setCenter({ lat: la, lng: ln }); }
        cb.current({ lat: round(la), lng: round(ln) });
        if (reverse) {
          geocoder.geocode({ location: { lat: la, lng: ln } }, (res: any, status: string) => {
            if (status === "OK" && res?.[0]?.formatted_address) cb.current({ address: res[0].formatted_address });
          });
        }
      };

      map.addListener("click", (e: any) => place(e.latLng.lat(), e.latLng.lng(), true));
      if (marker) marker.addListener("dragend", (e: any) => place(e.latLng.lat(), e.latLng.lng(), true));

      // Places Autocomplete on the address input.
      if (inputRef.current && maps.places?.Autocomplete) {
        const ac = new maps.places.Autocomplete(inputRef.current, { fields: ["formatted_address", "geometry"] });
        ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          const loc = p?.geometry?.location;
          if (loc) {
            const la = loc.lat(), ln = loc.lng();
            map.setCenter({ lat: la, lng: ln }); map.setZoom(16);
            if (marker) { marker.setPosition({ lat: la, lng: ln }); marker.setVisible(true); }
            cb.current({ address: p.formatted_address ?? inputRef.current!.value, lat: round(la), lng: round(ln) });
          } else if (p?.formatted_address) {
            cb.current({ address: p.formatted_address });
          }
        });
      }
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
    // Init once; live position changes are pushed imperatively, not via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        value={address}
        onChange={(e) => cb.current({ address: e.target.value })}
        placeholder={failed ? "Type the venue address" : "Search an address, or click the map to drop a pin"}
        style={inputStyle}
        autoComplete="off"
      />
      {!failed && (
        <div
          ref={mapRef}
          style={{ width: "100%", height: 220, borderRadius: 10, marginTop: 10, overflow: "hidden", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      )}
      <div style={hintStyle}>
        {failed
          ? "Map unavailable — type the address above; you can add coordinates manually below."
          : !ready
            ? "Loading map…"
            : lat != null && lng != null
              ? `Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)} — drag the pin or click the map to adjust.`
              : "Search an address or click the map to drop a pin."}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, fontFamily: "inherit" };
const hintStyle: React.CSSProperties = { fontSize: 11, color: "#6b7280", marginTop: 6 };
