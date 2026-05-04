"use client";
import { useState } from "react";
import { Pencil, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const MAX = 120;

export function LookingForBanner({
  userId,
  initial,
  isOwn,
}: {
  userId: string;
  initial?: string | null;
  isOwn: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const value = initial ?? "";

  // Other person's profile + nothing set → render nothing.
  if (!isOwn && !value) return null;

  const save = async () => {
    setSaving(true);
    const next = draft.trim().slice(0, MAX);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookingFor: next }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Couldn't save"); return; }
    qc.invalidateQueries({ queryKey: ["user", userId] });
    setEditing(false);
    toast.success(next ? "Status updated" : "Cleared");
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "16px 20px",
        background: "rgba(13,13,13,0.7)",
        border: "1px solid rgba(230,57,70,0.3)",
        borderRadius: 16,
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={13} color="#ff6b74" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#ff6b74", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Looking for
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
            {draft.length}/{MAX}
          </span>
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0, MAX))}
          autoFocus
          rows={2}
          placeholder="e.g. Badminton partners weekday evenings, casual basketball pickup"
          style={{
            width: "100%", padding: "8px 10px",
            fontSize: 14, color: "#fff", fontFamily: "inherit",
            background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, outline: "none", resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={cancel}
            disabled={saving}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 100,
              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }}
          >
            <X size={11} /> Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 100,
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              color: "#fff", border: "none", cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Check size={11} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // Own profile, empty state — soft prompt
  if (isOwn && !value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 16, marginBottom: 16,
          fontSize: 13.5, color: "rgba(255,255,255,0.55)",
          fontFamily: "inherit", textAlign: "left",
          cursor: "pointer",
        }}
      >
        <Search size={14} color="rgba(255,255,255,0.4)" />
        <span>+ What are you looking for? <span style={{ opacity: 0.55 }}>(e.g., basketball partners, weekend games)</span></span>
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px",
        background: "linear-gradient(135deg, rgba(230,57,70,0.08) 0%, rgba(13,13,13,0.7) 60%)",
        border: "1px solid rgba(230,57,70,0.2)",
        borderRadius: 16,
        marginBottom: 16,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: "rgba(230,57,70,0.15)",
        border: "1px solid rgba(230,57,70,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Search size={14} color="#ff6b74" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#ff6b74", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>
          Looking for
        </div>
        <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.4, wordBreak: "break-word" }}>
          {value}
        </p>
      </div>
      {isOwn && (
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.65)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  );
}
