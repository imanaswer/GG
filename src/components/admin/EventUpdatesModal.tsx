"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, Trash2 } from "lucide-react";
import { AdminModal, FormInput, FormTextarea } from "./AdminModal";
import type { EventUpdateItem } from "@/lib/eventUpdates";

export function EventUpdatesModal({ eventId, eventTitle, open, onClose }: {
  eventId: string | null;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const key = ["admin-event-updates", eventId];
  const { data } = useQuery<{ updates: EventUpdateItem[] }>({
    queryKey: key,
    queryFn: () => fetch(`/api/admin/events/${eventId}/updates`).then(r => r.json()),
    enabled: open && !!eventId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setTitle(""); setBody(""); setPinned(false); setError(null); };

  const post = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/events/${eventId}/updates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, pinned }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const fieldErrors = json?.details as Record<string, string[]> | undefined;
        const firstError = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
        throw new Error(firstError ?? "Could not post the update.");
      }
      return json;
    },
    onSuccess: (res) => { qc.setQueryData(key, res); reset(); },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (updateId: string) => fetch(`/api/admin/events/${eventId}/updates`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateId }),
    }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: (res) => qc.setQueryData(key, res),
  });

  const updates = data?.updates ?? [];

  return (
    <AdminModal open={open} onClose={() => { reset(); onClose(); }} title={`Updates · ${eventTitle}`} width={560}>
      <form onSubmit={e => { e.preventDefault(); if (body.trim()) post.mutate(); else setError("A body is required."); }}>
        <FormInput label="Title (optional)" value={title} onChange={setTitle} placeholder="e.g. Venue changed" />
        <FormTextarea label="Update" value={body} onChange={setBody} rows={3} placeholder="What do participants need to know?" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#d1d5db", cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ accentColor: "#980808" }} />
          Pin this update to the top
        </label>
        {error && <p style={{ fontSize: 13, color: "#f87171", marginBottom: 8 }}>{error}</p>}
        <button type="submit" disabled={post.isPending} style={{ height: 40, borderRadius: 9, background: "#980808", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, padding: "0 18px", cursor: "pointer", fontFamily: "inherit", opacity: post.isPending ? 0.6 : 1 }}>
          {post.isPending ? "Posting…" : "Post update"}
        </button>
      </form>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {updates.length === 0 && <p style={{ fontSize: 13, color: "#6b7280" }}>No updates posted yet.</p>}
        {updates.map(u => (
          <div key={u.id} style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {u.pinned && <Pin size={12} color="#eab308" />}
                <span style={{ fontSize: 11, color: "#6b7280" }}>{new Date(u.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              </div>
              <button type="button" onClick={() => remove.mutate(u.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} title="Delete"><Trash2 size={13} color="#f87171" /></button>
            </div>
            {u.title && <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{u.title}</div>}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-line" }}>{u.body}</div>
          </div>
        ))}
      </div>
    </AdminModal>
  );
}
