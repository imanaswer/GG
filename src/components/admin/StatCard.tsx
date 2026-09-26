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

export function StatCard({ value, label, sub, icon: Icon, color = "#fff", accent, href }: StatCardProps) {
  const baseBorder = "rgba(255,255,255,0.05)";
  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${baseBorder}`,
    borderRadius: 16,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    ...(href ? { textDecoration: "none", cursor: "pointer", transition: "all 0.2s ease" } : {}),
  };

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {Icon && <Icon size={16} color="rgba(255,255,255,0.4)" />}
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{label}</div>
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 400, color: accent ? color : "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>{sub}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={cardStyle}
        onMouseEnter={e => { 
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "#fff";
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.02)";
        }}
        onMouseLeave={e => { 
          (e.currentTarget as HTMLAnchorElement).style.borderColor = baseBorder;
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        }}
      >
        {inner}
      </Link>
    );
  }

  return <div style={cardStyle}>{inner}</div>;
}
