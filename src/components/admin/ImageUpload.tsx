"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

export function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError("");
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        onChange(json.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) upload(file);
      else setError("Please drop an image file");
    },
    [upload],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
    },
    [upload],
  );

  const hasImage = !!value;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Cover Photo
        </label>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() => setMode("upload")}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              background: mode === "upload" ? "rgba(230,57,70,0.15)" : "transparent",
              color: mode === "upload" ? "#e63946" : "#6b7280",
            }}
          >
            <Upload size={11} style={{ marginRight: 4, verticalAlign: "-1px" }} />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              background: mode === "url" ? "rgba(230,57,70,0.15)" : "transparent",
              color: mode === "url" ? "#e63946" : "#6b7280",
            }}
          >
            <LinkIcon size={11} style={{ marginRight: 4, verticalAlign: "-1px" }} />
            URL
          </button>
        </div>
      </div>

      {hasImage && (
        <div
          style={{
            position: "relative",
            marginBottom: 10,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#0d0d0d",
          }}
        >
          <img
            src={value}
            alt="Cover preview"
            style={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              display: "block",
            }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f87171",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {mode === "upload" ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "#e63946" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10,
              padding: "24px 16px",
              textAlign: "center",
              cursor: uploading ? "wait" : "pointer",
              background: dragOver ? "rgba(230,57,70,0.05)" : "#0d0d0d",
              transition: "all 0.15s",
            }}
          >
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: "3px solid rgba(230,57,70,0.2)",
                    borderTopColor: "#e63946",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Uploading...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(230,57,70,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ImageIcon size={20} color="#e63946" />
                </div>
                <p style={{ fontSize: 13, color: "#d1d5db", margin: 0 }}>
                  <span style={{ color: "#e63946", fontWeight: 700 }}>Click to upload</span> or drag
                  and drop
                </p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                  JPEG, PNG, WebP, AVIF or GIF (max 5 MB)
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            color: "#fff",
            background: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#f87171", marginTop: 6, marginBottom: 0 }}>{error}</p>
      )}
    </div>
  );
}
