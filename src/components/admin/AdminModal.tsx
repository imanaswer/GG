"use client";
import { useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";

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
          background: "#050505",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
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
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
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
  marginBottom: 10,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 14,
  lineHeight: "1.5",
  color: "#fff",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 12,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
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
    <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", ...style }}>
      <label style={labelStyle}>{label}</label>
      <div>
        {children}
      </div>
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
        style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
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
      <div style={{ position: "relative" }}>
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 40 }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#111", color: "#fff" }}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown 
          size={16} 
          color="#9ca3af" 
          style={{ 
            position: "absolute", 
            right: 14, 
            top: "50%", 
            transform: "translateY(-50%)", 
            pointerEvents: "none" 
          }} 
        />
      </div>
    </FormField>
  );
}

// Toggleable pill group for picking one OR several options (e.g. a coach that is
// both an Academy and a Personal Trainer). Values are stored as a string[].
export function FormMultiSelect({
  label,
  values,
  onChange,
  options,
  style,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: readonly string[];
  style?: React.CSSProperties;
}) {
  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  return (
    <FormField label={label} style={style}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 100,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: active ? "#fff" : "transparent",
                color: active ? "#000" : "rgba(255,255,255,0.5)",
                border: `1px solid ${active ? "#fff" : "rgba(255,255,255,0.2)"}`,
                transition: "all 0.15s",
              }}
            >
              {active ? "✓ " : ""}
              {opt}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}

export function FormCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const listId = `combo-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <FormField label={label} style={style}>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </FormField>
  );
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

const btnBase: React.CSSProperties = {
  height: 48,
  borderRadius: 100,
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  cursor: "pointer",
  fontFamily: "inherit",
  border: "none",
  padding: "0 24px",
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
          color: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        style={{
          ...btnBase,
          background: "#fff",
          color: "#000",
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
      <p style={{ fontSize: 12, color: "#fff", marginBottom: 24 }}>
        This action cannot be undone. All related data will also be removed.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <button
          onClick={onCancel}
          style={{
            ...btnBase,
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            ...btnBase,
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
