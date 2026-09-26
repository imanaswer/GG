const MAP: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING_SIGNATURE: { label: "Pending Signature", bg: "rgba(234,179,8,0.15)",  fg: "#eab308" },
  SIGNED:            { label: "Signed",            bg: "rgba(34,197,94,0.15)",  fg: "#4ade80" },
  EXPIRED:           { label: "Expired",           bg: "rgba(255,255,255,0.15)",  fg: "#fff" },
  SUPERSEDED:        { label: "Superseded",        bg: "rgba(107,114,128,0.15)", fg: "#9ca3af" },
};

export function AgreementStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.PENDING_SIGNATURE;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
