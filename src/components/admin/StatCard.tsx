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
    background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
    border: `1px solid ${baseBorder}`,
    borderRadius: 20,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    ...(href ? { textDecoration: "none", cursor: "pointer", transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)" } : {}),
  };

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, position: "relative", zIndex: 1 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: accent ? `${color}1A` : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Icon && <Icon size={16} color={accent ? color : "rgba(255,255,255,0.7)"} className="admin-stat-icon" />}
        </div>
        <div className="admin-stat-label" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      </div>
      
      <div style={{ position: "relative", zIndex: 1, marginTop: "auto" }}>
        <div className="admin-stat-val" style={{ fontFamily: "var(--font-serif)", fontSize: 44, fontWeight: 400, color: accent ? color : "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </div>
        {sub && <div className="admin-stat-sub" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8, fontWeight: 500 }}>{sub}</div>}
      </div>

      {/* Watermark Icon */}
      {Icon && (
        <Icon 
          size={120} 
          style={{ 
            position: "absolute", 
            bottom: -30, 
            right: -20, 
            opacity: 0.02, 
            transform: "rotate(-10deg)",
            pointerEvents: "none",
          }} 
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="admin-stat-card"
        style={cardStyle}
        onMouseEnter={e => { 
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.2)";
          (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => { 
          (e.currentTarget as HTMLAnchorElement).style.borderColor = baseBorder;
          (e.currentTarget as HTMLAnchorElement).style.background = cardStyle.background as string;
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        }}
      >
        {inner}
      </Link>
    );
  }

  return <div className="admin-stat-card" style={cardStyle}>{inner}</div>;
}
