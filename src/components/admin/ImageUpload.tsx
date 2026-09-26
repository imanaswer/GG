"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";
import { ImageCropModal } from "@/components/admin/ImageCropModal";

export function ImageUpload({
  value,
  onChange,
  label = "Cover Photo",
  aspect,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  // When set, a picked file opens the crop dialog (locked to this ratio) before upload.
  aspect?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError("");
      setUploading(true);
      try {
        onChange(await uploadToCloudinary(file));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  // With an aspect set, route the file through the crop dialog first; otherwise upload as-is.
  const accept = useCallback(
    (file: File) => {
      setError("");
      if (aspect) setCropFile(file);
      else upload(file);
    },
    [aspect, upload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) accept(file);
      else setError("Please drop an image file");
    },
    [accept],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) accept(file);
    },
    [accept],
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
          {label}
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
              background: mode === "upload" ? "rgba(255,255,255,0.15)" : "transparent",
              color: mode === "upload" ? "#fff" : "#6b7280",
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
              background: mode === "url" ? "rgba(255,255,255,0.15)" : "transparent",
              color: mode === "url" ? "#fff" : "#6b7280",
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
              color: "#fff",
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
            onChange={(e) => { handleFileChange(e); e.target.value = ""; }}
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
              border: `2px dashed ${dragOver ? "#fff" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10,
              padding: "24px 16px",
              textAlign: "center",
              cursor: uploading ? "wait" : "pointer",
              background: dragOver ? "rgba(255,255,255,0.05)" : "#0d0d0d",
              transition: "all 0.15s",
            }}
          >
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: "3px solid rgba(255,255,255,0.2)",
                    borderTopColor: "#fff",
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
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ImageIcon size={20} color="#fff" />
                </div>
                <p style={{ fontSize: 13, color: "#d1d5db", margin: 0 }}>
                  <span style={{ color: "#fff", fontWeight: 700 }}>Click to upload</span> or drag
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
            borderRadius: 12,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#fff", marginTop: 6, marginBottom: 0 }}>{error}</p>
      )}

      {cropFile && aspect && (
        <ImageCropModal
          file={cropFile}
          aspect={aspect}
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => { setCropFile(null); upload(cropped); }}
        />
      )}
    </div>
  );
}
