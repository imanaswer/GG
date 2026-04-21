"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function AdminModal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        style={{
          width: "90vw",
          maxWidth: width,
          maxHeight: "85vh",
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#9ca3af",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
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
};

export function FormField({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  style,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <FormField label={label} style={style}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
      />
    </FormField>
  );
}

export function FormTextarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <FormField label={label} style={style}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ ...inputStyle, resize: "vertical" }}
      />
    </FormField>
  );
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <FormField label={label} style={style}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

const btnBase: React.CSSProperties = {
  height: 40,
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  border: "none",
  padding: "0 20px",
};

export function FormActions({
  onCancel,
  submitLabel = "Save",
  loading,
}: {
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          ...btnBase,
          background: "transparent",
          color: "#9ca3af",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        style={{
          ...btnBase,
          background: "#e63946",
          color: "#fff",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

export function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div style={{ textAlign: "center", padding: "12px 0" }}>
      <p style={{ fontSize: 14, color: "#d1d5db", marginBottom: 6 }}>
        Are you sure you want to delete
      </p>
      <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 20 }}>{name}?</p>
      <p style={{ fontSize: 12, color: "#f87171", marginBottom: 24 }}>
        This action cannot be undone. All related data will also be removed.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            ...btnBase,
            background: "transparent",
            color: "#9ca3af",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            ...btnBase,
            background: "#ef4444",
            color: "#fff",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
