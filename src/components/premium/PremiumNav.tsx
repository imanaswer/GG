"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight, LogOut, User as UserIcon, Pencil } from "lucide-react";
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
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); setHoveredLink(null); }, [path]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 200,
          pointerEvents: "none",
          background: scrolled && !open ? (variant === "solid" ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.85)") : "transparent",
          backdropFilter: scrolled && !open ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled && !open ? "blur(12px)" : "none",
          borderBottom: `1px solid ${scrolled && !open ? "rgba(255,255,255,0.06)" : "transparent"}`,
          transition: "background 400ms ease, border-color 400ms ease, backdrop-filter 400ms ease",
        }}
      >
        <div
          className="container-lg"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            pointerEvents: "auto",
            height: 80,
          }}
        >
          {/* Logo */}
          <Link href="/" className="pn-logo" onClick={() => setOpen(false)}>
            <img
              src="/logo2.png"
              alt="Game Ground"
              style={{ height: 32, width: "auto", display: "block", filter: "brightness(0) invert(1)" }}
            />
          </Link>

          {/* Right Side: Account + Menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, pointerEvents: open ? "none" : "auto" }}>
            {user ? (
              <div className="pn-profile-dropdown-wrapper" style={{ pointerEvents: "auto" }} tabIndex={0}>
                <button type="button" className="pn-auth-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <UserIcon size={14} />
                  <span>{user.name.split(" ")[0]}</span>
                </button>
                <div className="pn-profile-dropdown">
                  <div className="pn-profile-dropdown-inner">
                    <Link href="/profile" className="pn-dropdown-item">View profile</Link>
                    <Link href="/profile/edit" className="pn-dropdown-item">Edit profile</Link>
                    <button onClick={logout} className="pn-dropdown-item pn-dropdown-item-danger" style={{ width: "100%", textAlign: "left" }}>Log out</button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" className="pn-auth-link pn-auth-link-top" onClick={() => setOpen(false)} style={{ pointerEvents: "auto" }}>
                Sign in
              </Link>
            )}

            {/* Menu Button */}
            <button
              onMouseEnter={() => setOpen(true)}
              onClick={() => setOpen(!open)}
              className="pn-menu-toggle"
              aria-label="Toggle Menu"
              style={{ pointerEvents: "auto" }}
            >
              <span style={{ position: "relative", zIndex: 2 }}>{open ? "Close" : "Menu"}</span>
              <div className="pn-menu-indicator" data-open={open} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .pn-logo {
          transition: transform 300ms cubic-bezier(0.2,0.6,0.2,1);
        }
        .pn-logo:hover {
          transform: scale(1.05);
        }

        .pn-menu-toggle {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: none;
          border: none;
          color: #fff;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          position: relative;
          padding: 8px 0;
        }

        .pn-menu-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          transition: transform 400ms cubic-bezier(0.2,0.6,0.2,1), background 400ms ease;
        }
        .pn-menu-toggle:hover .pn-menu-indicator {
          transform: scale(1.5);
        }
        .pn-menu-indicator[data-open="true"] {
          background: #fff;
          transform: scale(1.5);
        }

        .pn-auth-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: opacity 300ms ease;
          padding: 8px 0;
          opacity: 0.6;
        }
        .pn-auth-link:hover {
          opacity: 1;
        }

        .pn-profile-dropdown-wrapper {
          position: relative;
          display: inline-flex;
          height: 100%;
          align-items: center;
        }

        .pn-profile-dropdown {
          position: absolute;
          top: 100%;
          left: 50%;
          right: auto;
          padding-top: 8px;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-50%) translateY(6px) scale(0.96);
          transform-origin: top center;
          transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 300ms ease;
          pointer-events: none;
          z-index: 100;
        }

        .pn-profile-dropdown-wrapper:hover .pn-profile-dropdown,
        .pn-profile-dropdown-wrapper:focus-within .pn-profile-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0) scale(1);
          pointer-events: auto;
        }

        .pn-profile-dropdown-inner {
          background: rgba(15, 15, 15, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          min-width: 140px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .pn-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
          text-align: left;
        }

        .pn-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .pn-dropdown-item-danger {
          margin-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-radius: 0 0 6px 6px;
        }

        .pn-dropdown-item-danger:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }

        /* Mega Menu Typography */
        .mega-link {
          font-family: var(--font-dela);
          font-size: clamp(48px, min(10vw, 13vh), 140px);
          line-height: 0.85;
          text-transform: uppercase;
          color: #fff;
          text-decoration: none;
          display: block;
          transition: color 400ms ease, -webkit-text-stroke 400ms ease, transform 400ms cubic-bezier(0.2,0.6,0.2,1);
          transform-origin: left center;
        }

        /* Hover states for links: Make them outlined when another link is hovered, 
           or keep solid if hovered. */
        .mega-menu-container[data-hovering="true"] .mega-link:not(:hover) {
          color: transparent;
          -webkit-text-stroke: 1px rgba(255,255,255,0.25);
        }

        .mega-link:hover {
          transform: translateX(2vw);
        }

        .mega-utility-link {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          text-decoration: none;
          transition: color 300ms ease;
        }
        .mega-utility-link:hover {
          color: #fff;
        }

        .mega-utility-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 24px;
          margin-top: 24px;
        }
        .mega-utility-heading {
          font-size: 10px;
          color: #747574;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
        }
        .mega-utility-links {
          display: flex;
          gap: 24px;
        }
        .mega-utility-right {
          text-align: right;
        }
        .mega-utility-links-right {
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .mega-link {
            font-size: clamp(40px, 12vw, 64px);
          }
          .mega-utility-footer {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .mega-utility-right {
            text-align: left;
          }
          .mega-utility-links-right {
            justify-content: flex-start;
          }
        }
      `}</style>

      {/* Full-Screen Mega Menu Overlay */}
      <div id="pn-overlay-wrapper">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
              animate={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
              exit={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              style={{
                position: "fixed", inset: 0, zIndex: 199,
                background: "#050505",
                display: "flex", flexDirection: "column",
                overflowY: "auto",
              }}
            >
              {/* Inner Content Wrapper */}
            <div
              className="container-lg"
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                paddingTop: 100, // Below header
                paddingBottom: 24,
                minHeight: "min-content",
              }}
            >
              {/* Links Grid */}
              <div 
                className="mega-menu-container" 
                data-hovering={!!hoveredLink}
                style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
              >
                {LINKS.map((link, i) => {
                  const active = path === link.href || path.startsWith(link.href + "/");
                  return (
                    <div key={link.href} style={{ overflow: "hidden" }}>
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.1 + i * 0.04 }}
                      >
                        <Link
                          href={link.href}
                          className="mega-link"
                          onMouseEnter={() => setHoveredLink(link.href)}
                          onMouseLeave={() => setHoveredLink(null)}
                          style={{
                            color: active ? "#747574" : undefined,
                            WebkitTextStroke: active ? "none" : undefined,
                          }}
                        >
                          {link.label}
                        </Link>
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Utility Footer (Auth / Legal) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                className="mega-utility-footer"
              >
                <div>
                  <div className="mega-utility-heading">Socials</div>
                  <div className="mega-utility-links">
                    <a href="#" className="mega-utility-link">Instagram</a>
                    <a href="#" className="mega-utility-link">Twitter</a>
                  </div>
                </div>

                <div className="mega-utility-right">
                  <div className="mega-utility-heading">Account</div>
                  <div className="mega-utility-links mega-utility-links-right">
                    {user ? (
                      <>
                        <Link href="/profile" className="mega-utility-link">{user.name}</Link>
                        <button 
                          onClick={() => { setOpen(false); logout(); }}
                          className="mega-utility-link"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/login" className="mega-utility-link">Sign in</Link>
                        <Link href="/register" className="mega-utility-link" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          Get started <ArrowUpRight size={14} />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
