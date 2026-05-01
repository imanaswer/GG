import { TIER_META, type Tier } from "@/lib/reputation";

type Size = "xs" | "sm" | "md";

const SIZES: Record<Size, { padY: number; padX: number; font: number; iconFont: number; gap: number }> = {
  xs: { padY: 2, padX: 7,  font: 10,  iconFont: 11, gap: 4 },
  sm: { padY: 3, padX: 9,  font: 11.5,iconFont: 13, gap: 5 },
  md: { padY: 4, padX: 12, font: 13,  iconFont: 15, gap: 6 },
};

export function TierBadge({
  tier,
  score,
  size = "sm",
  showLabel = true,
}: {
  tier: Tier | string;
  score?: number;
  size?: Size;
  showLabel?: boolean;
}) {
  const safeTier = (tier in TIER_META ? tier : "bronze") as Tier;
  const meta = TIER_META[safeTier];
  const s = SIZES[size];
  return (
    <span
      title={typeof score === "number" ? `${meta.label} · ${score} rep` : meta.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        padding: `${s.padY}px ${s.padX}px`,
        borderRadius: 100,
        background: `linear-gradient(135deg, ${meta.color}26 0%, ${meta.colorDim}1f 100%)`,
        border: `1px solid ${meta.color}55`,
        color: meta.color,
        fontSize: s.font,
        fontWeight: 700,
        letterSpacing: "0.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: s.iconFont, lineHeight: 1 }}>{meta.icon}</span>
      {showLabel && <span>{meta.label}</span>}
      {showLabel && typeof score === "number" && (
        <span style={{ opacity: 0.7, fontWeight: 600 }}>· {score}</span>
      )}
    </span>
  );
}

export function TierRing({
  tier,
  size = 56,
  stroke = 3,
  children,
}: {
  tier: Tier | string;
  size?: number;
  stroke?: number;
  children: React.ReactNode;
}) {
  const safeTier = (tier in TIER_META ? tier : "bronze") as Tier;
  const meta = TIER_META[safeTier];
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        padding: stroke,
        background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.colorDim} 100%)`,
        boxShadow: `0 0 18px ${meta.color}44`,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
