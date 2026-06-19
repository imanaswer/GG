"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight, ChevronDown, User as UserIcon, Pencil, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { href: "/learn",      label: "Coaches"   },
  { href: "/play",       label: "Games"     },
  { href: "/camps",      label: "Camps"     },
  { href: "/workshops",  label: "Workshops" },
  { href: "/events",     label: "Events"    },
  { href: "/leaderboard",label: "Leaders"   },
  { href: "/about",      label: "About"     },
];

type Props = {
  /** When `transparent`, nav sits on top of the hero and fades in a glass
   *  surface after 12px scroll. Use `solid` on inner pages. */
  variant?: "transparent" | "solid";
};

export function PremiumNav({ variant = "solid" }: Props) {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the user dropdown on outside click or Escape.
  useEffect(() => {
    if (!userMenu) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setUserMenu(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenu]);

  // Close menus on route change. Syncing to `path` (not an onClick) is deliberate:
  // it also covers browser back/forward navigation, where no link click fires.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setUserMenu(false); setOpen(false); }, [path]);

  const closeMenu = () => setOpen(false);

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
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img
            src="/logo2.png"
            alt="Game Ground"
            style={{ height: 44, width: "auto", display: "block", filter: "drop-shadow(0 0 12px rgba(255,255,255,0.25))" }}
          />
        </Link>

        {/* Desktop links */}
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {LINKS.map(link => {
            const active = path === link.href || path.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className="pn-link"
                data-active={active ? "true" : undefined}
              >
                <span className="pn-link-label">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <div ref={userMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setUserMenu(v => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenu}
                className="pn-userpill"
                data-open={userMenu ? "true" : undefined}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  fontFamily: "inherit", cursor: "pointer",
                  padding: "9px 14px 9px 16px", borderRadius: 100,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  transition: "background 200ms, border-color 200ms",
                }}
              >
                {user.name.split(" ")[0]}
                <ChevronDown
                  size={14}
                  style={{
                    opacity: 0.7,
                    transform: userMenu ? "rotate(180deg)" : "none",
                    transition: "transform 200ms cubic-bezier(.2,.6,.2,1)",
                  }}
                />
              </button>
              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: [0.2, 0.6, 0.2, 1] }}
                    style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 8,
                      minWidth: 184, padding: 6, borderRadius: 14,
                      background: "rgba(15,15,16,0.92)",
                      backdropFilter: "blur(18px) saturate(1.3)",
                      WebkitBackdropFilter: "blur(18px) saturate(1.3)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                      transformOrigin: "top right",
                    }}
                  >
                    <Link href="/profile" className="pn-menu-item" role="menuitem">
                      <UserIcon size={15} /> View profile
                    </Link>
                    <Link href="/profile/edit" className="pn-menu-item" role="menuitem">
                      <Pencil size={14} /> Edit profile
                    </Link>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "5px 8px" }} />
                    <button
                      type="button"
                      onClick={() => { setUserMenu(false); logout(); }}
                      className="pn-menu-item pn-menu-item-danger"
                      role="menuitem"
                    >
                      <LogOut size={15} /> Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
        @media (max-width: 900px) {
          .mobile-menu-btn { display: inline-flex !important; }
        }

        /* Desktop nav links — glass pill + red underline hover */
        .pn-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 8px 11px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          border-radius: 8px;
          text-decoration: none;
          background: transparent;
          box-shadow: 0 0 0 rgba(230,57,70,0);
          transition:
            color 200ms cubic-bezier(.2,.6,.2,1),
            background-color 200ms cubic-bezier(.2,.6,.2,1),
            transform 200ms cubic-bezier(.2,.6,.2,1),
            box-shadow 200ms cubic-bezier(.2,.6,.2,1);
        }
        /* Red gradient underline that wipes in from the left */
        .pn-link::after {
          content: "";
          position: absolute;
          left: 11px;
          right: 11px;
          bottom: 4px;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, #e63946 0%, #b91c2d 100%);
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 220ms cubic-bezier(.2,.6,.2,1);
          pointer-events: none;
        }
        .pn-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(230,57,70,0.18);
        }
        .pn-link:hover::after,
        .pn-link[data-active]::after {
          transform: scaleX(1);
        }
        .pn-link[data-active] {
          color: #fff;
          background: rgba(255,255,255,0.06);
        }
        .pn-link:focus-visible {
          outline: none;
          color: #fff;
          box-shadow: 0 0 0 2px rgba(230,57,70,0.6);
        }
        @media (prefers-reduced-motion: reduce) {
          .pn-link { transition: color 200ms ease, background-color 200ms ease; }
          .pn-link:hover { transform: none; box-shadow: none; }
          .pn-link::after { transition: none; }
        }

        /* User pill + dropdown menu */
        .pn-userpill:hover,
        .pn-userpill[data-open] {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.16) !important;
        }
        .pn-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          color: rgba(255,255,255,0.82);
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 150ms ease, color 150ms ease;
        }
        .pn-menu-item:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .pn-menu-item-danger { color: #ff6b78; }
        .pn-menu-item-danger:hover {
          background: rgba(230,57,70,0.14);
          color: #ff8a94;
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
                  onClick={closeMenu}
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
                  <>
                    <Link href="/profile" onClick={closeMenu} style={{
                      flex: 1, textAlign: "center", padding: "12px", borderRadius: 100,
                      background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 600, fontSize: 14,
                      textDecoration: "none",
                    }}>{user.name.split(" ")[0]}</Link>
                    <button
                      type="button"
                      onClick={() => { closeMenu(); logout(); }}
                      style={{
                        flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "12px", borderRadius: 100,
                        background: "rgba(230,57,70,0.12)", color: "#ff6b78",
                        border: "1px solid rgba(230,57,70,0.25)",
                        fontWeight: 600, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                      }}
                    >
                      <LogOut size={15} /> Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={closeMenu} style={{
                      flex: 1, textAlign: "center", padding: "12px", borderRadius: 100,
                      background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 600, fontSize: 14,
                      textDecoration: "none",
                    }}>Sign in</Link>
                    <Link href="/register" onClick={closeMenu} style={{
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
