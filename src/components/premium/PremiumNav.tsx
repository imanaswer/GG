"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { href: "/learn",      label: "Coaches"   },
  { href: "/play",       label: "Games"     },
  { href: "/camps",      label: "Camps"     },
  { href: "/workshops",  label: "Workshops" },
  { href: "/events",     label: "Events"    },
  { href: "/about",      label: "About"     },
];

type Props = {
  /** When `transparent`, nav sits on top of the hero and fades in a glass
   *  surface after 12px scroll. Use `solid` on inner pages. */
  variant?: "transparent" | "solid";
};

export function PremiumNav({ variant = "solid" }: Props) {
  const path = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [path]);

  const solidBg   = "rgba(5,5,5,0.72)";
  const transBg   = scrolled ? "rgba(5,5,5,0.7)" : "transparent";
  const bg        = variant === "solid" ? solidBg : transBg;
  const showBorder = variant === "solid" || scrolled;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        background: bg,
        backdropFilter: scrolled || variant === "solid" ? "blur(18px) saturate(1.3)" : "none",
        WebkitBackdropFilter: scrolled || variant === "solid" ? "blur(18px) saturate(1.3)" : "none",
        borderBottom: `1px solid ${showBorder ? "rgba(255,255,255,0.06)" : "transparent"}`,
        transition: "background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      <div
        className="container-lg"
        style={{
          height: 72,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 22px rgba(230,57,70,0.45)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: 15,
            color: "#fff",
            letterSpacing: "-0.03em",
          }}>
            Game Ground
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {LINKS.map(link => {
            const active = path === link.href || path.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? "#fff" : "rgba(255,255,255,0.6)",
                  borderRadius: 8,
                  transition: "color 200ms",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <Link
              href="/profile"
              style={{
                fontSize: 13, fontWeight: 600, color: "#fff",
                padding: "9px 16px", borderRadius: 100,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                textDecoration: "none",
                transition: "background 200ms",
              }}
            >
              {user.name.split(" ")[0]}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)",
                  padding: "9px 14px",
                  textDecoration: "none",
                }}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  padding: "9px 16px", borderRadius: 100,
                  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                  boxShadow: "0 0 28px rgba(230,57,70,0.35)",
                  textDecoration: "none",
                }}
              >
                Get started
                <ArrowUpRight size={14} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
          className="mobile-menu-btn"
          style={{
            display: "none",
            width: 42, height: 42, borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            alignItems: "center", justifyContent: "center",
          }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: inline-flex !important; }
        }
      `}</style>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            style={{
              background: "rgba(5,5,5,0.96)",
              backdropFilter: "blur(18px)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: 4 }}>
              {LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "14px 8px",
                    fontSize: 16, fontWeight: 500, color: "#fff",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                {user ? (
                  <Link href="/profile" style={{
                    flex: 1, textAlign: "center", padding: "12px", borderRadius: 100,
                    background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 600, fontSize: 14,
                    textDecoration: "none",
                  }}>{user.name.split(" ")[0]}</Link>
                ) : (
                  <>
                    <Link href="/login" style={{
                      flex: 1, textAlign: "center", padding: "12px", borderRadius: 100,
                      background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 600, fontSize: 14,
                      textDecoration: "none",
                    }}>Sign in</Link>
                    <Link href="/register" style={{
                      flex: 1, textAlign: "center", padding: "12px", borderRadius: 100,
                      background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                      color: "#fff", fontWeight: 700, fontSize: 14,
                      textDecoration: "none",
                    }}>Get started</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </nav>
  );
}
