import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  value: string | number;
  label: string;
  sub?: string;
  icon?: LucideIcon;
  color?: string;
  accent?: boolean;
  /** When set, the card renders as a navigational link with a hover affordance. */
  href?: string;
}

export function StatCard({ value, label, sub, icon: Icon, color = "#e63946", accent, href }: StatCardProps) {
  const rgb = color === "#e63946" ? "230,57,70" : "34,197,94";
  const baseBorder = accent ? `rgba(${rgb},0.25)` : "rgba(255,255,255,0.07)";
  const cardStyle: React.CSSProperties = {
    background: accent ? `rgba(${rgb},0.08)` : "#141414",
    border: `1px solid ${baseBorder}`,
    borderRadius: 12,
    padding: "18px 20px",
    display: "block",
    ...(href ? { textDecoration: "none", cursor: "pointer", transition: "border-color 0.15s" } : {}),
  };

  const inner = (
    <>
      {Icon && <Icon size={18} color={color} style={{ marginBottom: 10 }} />}
      <div style={{ fontSize: 28, fontWeight: 900, color: accent ? color : "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{sub}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={cardStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(230,57,70,0.4)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = baseBorder; }}
      >
        {inner}
      </Link>
    );
  }

  return <div style={cardStyle}>{inner}</div>;
}
