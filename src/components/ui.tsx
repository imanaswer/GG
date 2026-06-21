"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as SelectP   from "@radix-ui/react-select";
import * as TabsP     from "@radix-ui/react-tabs";
import * as LabelP    from "@radix-ui/react-label";
import * as ProgressP from "@radix-ui/react-progress";
import { Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

/* ─── Button ────────────────────────────────────────────── */
type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "success";
type BtnSize    = "sm" | "md" | "lg" | "icon";

const variantBase: Record<BtnVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
    color: "#fff", border: "none",
    boxShadow: "0 2px 14px rgba(230,57,70,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  outline: {
    background: "rgba(255,255,255,0.03)",
    color: "#d4d4d8",
    border: "1px solid rgba(255,255,255,0.09)",
  },
  ghost: {
    background: "transparent",
    color: "#a1a1aa",
    border: "none",
  },
  danger: {
    background: "linear-gradient(135deg, #ef4444 0%, #b91c2d 100%)",
    color: "#fff", border: "none",
    boxShadow: "0 2px 12px rgba(239,68,68,0.25)",
  },
  success: {
    background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
    color: "#fff", border: "none",
    boxShadow: "0 2px 12px rgba(34,197,94,0.25)",
  },
};

const sizeBase: Record<BtnSize, React.CSSProperties> = {
  sm:   { height: 32, padding: "0 12px", fontSize: 12, borderRadius: 8  },
  md:   { height: 38, padding: "0 16px", fontSize: 13, borderRadius: 10 },
  lg:   { height: 46, padding: "0 24px", fontSize: 15, borderRadius: 12 },
  icon: { height: 36, width: 36, padding: 0, borderRadius: 9 },
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", asChild, loading, style, children, disabled, ...p }, ref) => {
    const C = asChild ? Slot : "button";
    return (
      <C
        ref={ref}
        disabled={disabled || loading}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          gap: 6, fontWeight: 600, cursor: disabled || loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "opacity 0.15s, transform 0.12s, box-shadow 0.2s",
          position: "relative", overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
          ...variantBase[variant], ...sizeBase[size], ...style,
        }}
        onMouseEnter={e => {
          if (!disabled && !loading) {
            (e.currentTarget as HTMLElement).style.opacity = "0.88";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.opacity = "1";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
        onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(0.98)"; }}
        onMouseUp={e =>   { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
        {...(p as Record<string, unknown>)}
      >
        {/* Shimmer on primary */}
        {variant === "primary" && !disabled && !loading && (
          <span
            aria-hidden
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              transform: "skewX(-12deg)",
              animation: "shimmer 3.5s ease infinite",
            }}
          />
        )}
        {loading ? (
          <span style={{ display: "flex", gap: 4 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 4, height: 4, borderRadius: "50%", background: "currentColor",
                animation: `pulse 1s ${i * 0.16}s infinite`,
              }} />
            ))}
          </span>
        ) : children}
      </C>
    );
  }
);
Button.displayName = "Button";

/* ─── Card ──────────────────────────────────────────────── */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, style, ...p }, ref) => (
    <div
      ref={ref}
      style={{
        background: "#0d0d0d",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        transition: hover ? "transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s" : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform     = "translateY(-4px)";
        el.style.borderColor   = "rgba(230,57,70,0.25)";
        el.style.boxShadow     = "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(230,57,70,0.1)";
      } : undefined}
      onMouseLeave={hover ? e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform     = "translateY(0)";
        el.style.borderColor   = "rgba(255,255,255,0.06)";
        el.style.boxShadow     = "none";
      } : undefined}
      {...p}
    />
  )
);
Card.displayName = "Card";

/* ─── Input ─────────────────────────────────────────────── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ style, ...p }, ref) => (
    <input
      ref={ref}
      style={{
        display: "flex", width: "100%", height: 42, padding: "0 14px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#fff", fontSize: 14, fontFamily: "inherit",
        outline: "none",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = "rgba(230,57,70,0.5)";
        e.target.style.background  = "rgba(230,57,70,0.03)";
        e.target.style.boxShadow   = "0 0 0 3px rgba(230,57,70,0.08)";
      }}
      onBlur={e => {
        e.target.style.borderColor = "rgba(255,255,255,0.08)";
        e.target.style.background  = "rgba(255,255,255,0.03)";
        e.target.style.boxShadow   = "none";
      }}
      {...p}
    />
  )
);
Input.displayName = "Input";

/* ─── Textarea ───────────────────────────────────────────── */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ style, ...p }, ref) => (
    <textarea
      ref={ref}
      style={{
        display: "flex", width: "100%", minHeight: 96, padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#fff", fontSize: 14, fontFamily: "inherit",
        outline: "none", resize: "none",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = "rgba(230,57,70,0.5)";
        e.target.style.background  = "rgba(230,57,70,0.03)";
        e.target.style.boxShadow   = "0 0 0 3px rgba(230,57,70,0.08)";
      }}
      onBlur={e => {
        e.target.style.borderColor = "rgba(255,255,255,0.08)";
        e.target.style.background  = "rgba(255,255,255,0.03)";
        e.target.style.boxShadow   = "none";
      }}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";

/* ─── Label ──────────────────────────────────────────────── */
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelP.Root>,
  React.ComponentPropsWithoutRef<typeof LabelP.Root>
>(({ style, ...p }, ref) => (
  <LabelP.Root
    ref={ref}
    style={{ fontSize: 13, fontWeight: 500, color: "#a1a1aa", display: "block", letterSpacing: "0.01em", ...style }}
    {...p}
  />
));
Label.displayName = "Label";

/* ─── Progress ───────────────────────────────────────────── */
export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressP.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressP.Root>
>(({ value, style, ...p }, ref) => (
  <ProgressP.Root
    ref={ref}
    style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", ...style }}
    {...p}
  >
    <ProgressP.Indicator
      style={{
        height: "100%",
        background: "linear-gradient(90deg, #e63946, #ff4d5a)",
        borderRadius: 99, width: `${value ?? 0}%`,
        transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: "0 0 8px rgba(230,57,70,0.4)",
      }}
    />
  </ProgressP.Root>
));
Progress.displayName = "Progress";

/* ─── Select ─────────────────────────────────────────────── */
export const Select      = SelectP.Root;
export const SelectValue = SelectP.Value;
export const SelectGroup = SelectP.Group;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectP.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectP.Trigger>
>(({ style, children, ...p }, ref) => (
  <SelectP.Trigger
    ref={ref}
    style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", height: 42, padding: "0 14px",
      borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 14,
      cursor: "pointer", fontFamily: "inherit", gap: 8,
      transition: "border-color 0.2s",
      outline: "none",
      ...style,
    }}
    {...p}
  >
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{children}</span>
    <SelectP.Icon asChild>
      <ChevronDown size={14} color="#52525b" style={{ flexShrink: 0, transition: "transform 0.2s" }} />
    </SelectP.Icon>
  </SelectP.Trigger>
));
SelectTrigger.displayName = SelectP.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectP.Content>,
  React.ComponentPropsWithoutRef<typeof SelectP.Content>
>(({ style, children, position = "popper", ...p }, ref) => (
  <SelectP.Portal>
    <SelectP.Content
      ref={ref}
      position={position}
      style={{
        background: "#111111", border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14, padding: 5, minWidth: 160,
        boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        zIndex: 100,
        animation: "scale-in 0.15s cubic-bezier(0.16,1,0.3,1)",
        ...style,
      }}
      {...p}
    >
      <SelectP.Viewport style={{ padding: 2 }}>{children}</SelectP.Viewport>
    </SelectP.Content>
  </SelectP.Portal>
));
SelectContent.displayName = SelectP.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectP.Item>,
  React.ComponentPropsWithoutRef<typeof SelectP.Item>
>(({ style, children, ...p }, ref) => (
  <SelectP.Item
    ref={ref}
    style={{
      display: "flex", alignItems: "center", padding: "8px 32px 8px 12px",
      borderRadius: 9, fontSize: 13, color: "#d4d4d8",
      cursor: "pointer", position: "relative", outline: "none", userSelect: "none",
      transition: "background 0.12s",
      ...style,
    }}
    {...p}
    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
  >
    <span style={{ position: "absolute", left: 12, display: "flex", alignItems: "center" }}>
      <SelectP.ItemIndicator><Check size={11} color="#e63946" /></SelectP.ItemIndicator>
    </span>
    <SelectP.ItemText>{children}</SelectP.ItemText>
  </SelectP.Item>
));
SelectItem.displayName = SelectP.Item.displayName;

/* ─── Tabs ───────────────────────────────────────────────── */
export const Tabs = TabsP.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsP.List>,
  React.ComponentPropsWithoutRef<typeof TabsP.List>
>(({ style, ...p }, ref) => (
  <TabsP.List
    ref={ref}
    style={{
      display: "inline-flex", gap: 2,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "4px",
      ...style,
    }}
    {...p}
  />
));
TabsList.displayName = TabsP.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsP.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsP.Trigger>
>(({ style, ...p }, ref) => (
  <TabsP.Trigger
    ref={ref}
    style={{
      padding: "7px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
      color: "#52525b", cursor: "pointer", border: "none", background: "none",
      transition: "all 0.18s", fontFamily: "inherit",
      ...style,
    }}
    {...p}
  />
));
TabsTrigger.displayName = TabsP.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsP.Content>,
  React.ComponentPropsWithoutRef<typeof TabsP.Content>
>(({ style, ...p }, ref) => (
  <TabsP.Content ref={ref} style={{ marginTop: 16, outline: "none", ...style }} {...p} />
));
TabsContent.displayName = TabsP.Content.displayName;

/* ─── Skeleton ───────────────────────────────────────────── */
export function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ borderRadius: 10, height: 16, ...style }} />;
}

/* ─── Badge ──────────────────────────────────────────────── */
interface BadgeProps { children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties; }
export function Badge({ children, color = "#a1a1aa", bg = "rgba(255,255,255,0.05)", style }: BadgeProps) {
  return (
    <span style={{
      display: "inline-flex", padding: "3px 9px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, color, background: bg,
      letterSpacing: "0.01em",
      ...style,
    }}>
      {children}
    </span>
  );
}
