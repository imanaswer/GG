import { LucideIcon } from "lucide-react";

interface StatCardProps {
  value: string | number;
  label: string;
  sub?: string;
  icon?: LucideIcon;
  color?: string;
  accent?: boolean;
}

export function StatCard({ value, label, sub, icon: Icon, color = "#e63946", accent }: StatCardProps) {
  return (
    <div style={{ background: accent ? `rgba(${color === "#e63946" ? "230,57,70" : "34,197,94"},0.08)` : "#141414", border: `1px solid ${accent ? `rgba(${color === "#e63946" ? "230,57,70" : "34,197,94"},0.25)` : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "18px 20px" }}>
      {Icon && <Icon size={18} color={color} style={{ marginBottom: 10 }} />}
      <div style={{ fontSize: 28, fontWeight: 900, color: accent ? color : "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
