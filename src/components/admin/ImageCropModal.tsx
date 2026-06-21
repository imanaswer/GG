"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

// Crop a selected file to a fixed aspect ratio before upload. The admin pans/zooms
// to frame the subject; on confirm we render exactly the selected region to a canvas
// and hand back a cropped JPEG File. Because the output already matches the display
// aspect, the listing card shows precisely what was framed (no surprise CSS crop).

// Render the chosen crop region (in source pixels) onto a canvas and export a File.
async function cropToFile(src: string, area: Area, name: string): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  // PNGs in this app use a solid black backdrop; fill black so any edge stays consistent
  // and JPEG (no alpha) doesn't turn transparent pixels white.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    Math.round(area.x), Math.round(area.y), Math.round(area.width), Math.round(area.height),
    0, 0, canvas.width, canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Could not crop the image");
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}-cropped.jpg`, { type: "image/jpeg" });
}

export function ImageCropModal({
  file,
  aspect,
  onCancel,
  onCropped,
}: {
  file: File;
  aspect: number;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Object URL for the cropper, derived from the file (no setState-in-effect);
  // a cleanup-only effect revokes it on unmount / file change.
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setAreaPixels(pixels), []);

  const confirm = useCallback(async () => {
    if (!areaPixels) return;
    setError("");
    setBusy(true);
    try {
      onCropped(await cropToFile(src, areaPixels, file.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop the image");
      setBusy(false);
    }
  }, [areaPixels, src, file.name, onCropped]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
          padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Crop image</h3>
        <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "0 0 14px" }}>
          Drag to reposition, use the slider to zoom. The framed area is exactly what gets shown.
        </p>

        <div style={{ position: "relative", width: "100%", aspectRatio: String(aspect), background: "#0d0d0d", borderRadius: 10, overflow: "hidden" }}>
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition
            />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 4px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>Zoom</span>
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#980808" }}
          />
        </div>

        {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 8, marginBottom: 0 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button
            type="button" onClick={onCancel}
            style={{ height: 38, padding: "0 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={confirm} disabled={busy || !areaPixels}
            style={{ height: 38, padding: "0 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: busy ? "wait" : "pointer", background: "#980808", color: "#fff", border: "none", opacity: busy || !areaPixels ? 0.6 : 1 }}
          >
            {busy ? "Cropping…" : "Crop & upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
