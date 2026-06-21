"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";

export function MultiImageUpload({
  label = "Photos",
  value,
  onChange,
  max = 12,
}: {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError("");
      const list = Array.from(files).filter(f => f.type.startsWith("image/"));
      if (!list.length) { setError("Please select image files"); return; }
      const room = max - value.length;
      if (room <= 0) { setError(`Limit reached (${max})`); return; }
      const toUpload = list.slice(0, room);
      setUploading(true);
      try {
        const uploaded: string[] = [];
        for (const file of toUpload) {
          uploaded.push(await uploadToCloudinary(file));
        }
        onChange([...value, ...uploaded]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, max],
  );

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </label>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{value.length}/{max}</span>
      </div>

      {value.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8, marginBottom: 10 }}>
          {value.map((src, i) => (
            <div key={`${src}-${i}`} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#0d0d0d" }}>
              <img src={src} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button
                type="button"
                onClick={() => remove(i)}
                style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 6, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                title="Remove"
              >
                <X size={12} />
              </button>
              <div style={{ position: "absolute", bottom: 4, left: 4, display: "flex", gap: 2 }}>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)", color: i === 0 ? "#4b5563" : "#d1d5db", cursor: i === 0 ? "default" : "pointer", fontSize: 11, fontFamily: "inherit", padding: 0, lineHeight: 1 }}
                  title="Move left"
                >‹</button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)", color: i === value.length - 1 ? "#4b5563" : "#d1d5db", cursor: i === value.length - 1 ? "default" : "pointer", fontSize: 11, fontFamily: "inherit", padding: 0, lineHeight: 1 }}
                  title="Move right"
                >›</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
        style={{ display: "none" }}
      />
      <div
        onClick={() => !uploading && value.length < max && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragOver ? "#e63946" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 10,
          padding: "18px 16px",
          textAlign: "center",
          cursor: uploading || value.length >= max ? "not-allowed" : "pointer",
          background: dragOver ? "rgba(230,57,70,0.05)" : "#0d0d0d",
          opacity: value.length >= max ? 0.5 : 1,
          transition: "all 0.15s",
        }}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, border: "3px solid rgba(230,57,70,0.2)", borderTopColor: "#e63946", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Uploading…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(230,57,70,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {value.length >= max ? <ImageIcon size={17} color="#6b7280" /> : <Upload size={17} color="#e63946" />}
            </div>
            <p style={{ fontSize: 12.5, color: "#d1d5db", margin: 0 }}>
              {value.length >= max ? "Limit reached" : <><span style={{ color: "#e63946", fontWeight: 700 }}>Click to add</span> or drag images</>}
            </p>
            <p style={{ fontSize: 10.5, color: "#6b7280", margin: 0 }}>JPEG, PNG, WebP, AVIF, GIF — multiple files OK</p>
          </div>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 6, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}
