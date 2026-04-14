"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Plus, LogOut, User, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Img } from "@/components/Shared";

const NAV = [
  { href: "/learn",  label: "Learn"  },
  { href: "/play",   label: "Play"   },
  { href: "/camps",  label: "Camps"  },
  { href: "/events", label: "Events" },
];

type SearchResult = { id: string; type: string; title: string; subtitle: string; image: string; href: string };
type SearchData   = { coaches: SearchResult[]; games: SearchResult[]; camps: SearchResult[]; events: SearchResult[] };

const TYPE_COLOR: Record<string, string> = {
  coach: "#60a5fa", game: "#4ade80", camp: "#f59e0b", event: "#e63946",
};
const TYPE_LABEL: Record<string, string> = {
  coach: "Coach", game: "Game", camp: "Camp", event: "Event",
};

const ease = [0.16, 1, 0.3, 1] as const;

export function NavBar() {
  const path   = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [open,       setOpen]       = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q,          setQ]          = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [isMobile,   setIsMobile]   = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setQ(""); setOpen(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data: searchData } = useQuery<SearchData>({
    queryKey: ["nav-search", debouncedQ],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
        .then(r => r.json())
        .then(d => d.data ?? d),
    enabled: debouncedQ.length >= 2,
  });

  const allResults = searchData
    ? [...(searchData.coaches ?? []), ...(searchData.games ?? []), ...(searchData.camps ?? []), ...(searchData.events ?? [])]
    : [];

  const goToResult = (href: string) => { router.push(href); setSearchOpen(false); setQ(""); };
  const isActive   = (href: string) => path.startsWith(href);

  return (
    <>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
          background: scrolled ? "rgba(5,5,5,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          transition: "background 0.35s, border-color 0.35s",
        }}
      >
        <div style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "0 20px", height: 62,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>

          {/* ── Logo ── */}
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <motion.img
              src="/logo.png"
              alt="Game Ground"
              whileHover={{ opacity: 0.85 }}
              style={{ height: 30, width: "auto", filter: "invert(1)", display: "block" }}
            />
          </Link>

          {/* ── Desktop nav ── */}
          {!isMobile && (
            <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {NAV.map(n => (
                <Link key={n.href} href={n.href} style={{ position: "relative", textDecoration: "none" }}>
                  <motion.span
                    whileHover={{ color: "#fff" }}
                    style={{
                      display: "block",
                      padding: "6px 14px", borderRadius: 9, fontSize: 14, fontWeight: 500,
                      color: isActive(n.href) ? "#fff" : "#71717a",
                      background: isActive(n.href) ? "rgba(255,255,255,0.07)" : "transparent",
                      transition: "color 0.15s, background 0.15s",
                    }}
                  >
                    {n.label}
                  </motion.span>
                  {isActive(n.href) && (
                    <motion.span
                      layoutId="nav-indicator"
                      style={{
                        position: "absolute", bottom: -1, left: "50%", x: "-50%",
                        width: 4, height: 4, borderRadius: "50%", background: "#e63946",
                      }}
                    />
                  )}
                </Link>
              ))}
            </nav>
          )}

          {/* ── Right side ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Search button */}
            <motion.button
              whileHover={{ background: "rgba(255,255,255,0.07)" }}
              onClick={() => setSearchOpen(true)}
              style={{
                height: 36, padding: "0 12px", borderRadius: 9,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#52525b", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7, fontSize: 13,
              }}
            >
              <Search size={14} />
              {!isMobile && <span style={{ color: "#52525b" }}>Search</span>}
              {!isMobile && (
                <span style={{
                  fontSize: 11, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "2px 6px", borderRadius: 5, color: "#3f3f46",
                }}>⌘K</span>
              )}
            </motion.button>

            {/* Desktop auth */}
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {loading ? (
                  <div style={{ width: 76, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.04)" }} className="skeleton" />
                ) : user ? (
                  <>
                    <Link href="/create-game" style={{ textDecoration: "none" }}>
                      <motion.span
                        whileHover={{ background: "rgba(255,255,255,0.07)" }}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 12px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                          color: "#71717a", border: "1px solid rgba(255,255,255,0.07)",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={13} />Create
                      </motion.span>
                    </Link>
                    <Link href={`/profile/${user.id}`} style={{ textDecoration: "none" }}>
                      <motion.span
                        whileHover={{ background: "rgba(255,255,255,0.04)" }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "5px 10px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                          color: "#d4d4d8", cursor: "pointer",
                        }}
                      >
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%",
                          background: "linear-gradient(135deg, #e63946, #b91c2d)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
                          boxShadow: "0 2px 10px rgba(230,57,70,0.3)",
                        }}>
                          {user.name[0]}
                        </div>
                        <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.name.split(" ")[0]}
                        </span>
                      </motion.span>
                    </Link>
                    {user.role === "coach" && (
                      <Link href="/coach/dashboard" style={{ textDecoration: "none" }}>
                        <motion.span
                          whileHover={{ background: "rgba(230,57,70,0.1)" }}
                          style={{
                            display: "block",
                            padding: "6px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                            color: "#e63946", border: "1px solid rgba(230,57,70,0.2)",
                            background: "rgba(230,57,70,0.05)", cursor: "pointer",
                          }}
                        >Dashboard</motion.span>
                      </Link>
                    )}
                    <motion.button
                      whileHover={{ color: "#ef4444", background: "rgba(239,68,68,0.06)" }}
                      onClick={logout}
                      style={{
                        width: 34, height: 34, borderRadius: 9, border: "none",
                        background: "transparent", color: "#52525b", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="Sign out"
                    >
                      <LogOut size={14} />
                    </motion.button>
                  </>
                ) : (
                  <>
                    <Link href="/login" style={{ textDecoration: "none" }}>
                      <motion.span
                        whileHover={{ color: "#fff" }}
                        style={{
                          display: "block",
                          padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                          color: "#71717a", cursor: "pointer",
                        }}
                      >Sign In</motion.span>
                    </Link>
                    <Link href="/register" style={{ textDecoration: "none" }}>
                      <motion.span
                        whileHover={{ scale: 1.03, boxShadow: "0 4px 20px rgba(230,57,70,0.35)" }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          display: "block",
                          padding: "7px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                          color: "#fff",
                          background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                          boxShadow: "0 2px 12px rgba(230,57,70,0.25)",
                          cursor: "pointer",
                        }}
                      >Get Started</motion.span>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            {isMobile && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(o => !o)}
                style={{ padding: 6, color: "#71717a", background: "none", border: "none", cursor: "pointer" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {open
                    ? <motion.span key="x"    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}><X    size={20} /></motion.span>
                    : <motion.span key="menu" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}><Menu size={20} /></motion.span>
                  }
                </AnimatePresence>
              </motion.button>
            )}
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <AnimatePresence>
          {isMobile && open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease }}
              style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,5,0.97)", backdropFilter: "blur(20px)" }}
            >
              <div style={{ padding: "12px 20px 20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
                  {NAV.map((n, i) => (
                    <motion.div
                      key={n.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={n.href} onClick={() => setOpen(false)} style={{
                        display: "block",
                        padding: "11px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                        color: isActive(n.href) ? "#fff" : "#71717a",
                        background: isActive(n.href) ? "rgba(255,255,255,0.05)" : "transparent",
                        textDecoration: "none",
                      }}>{n.label}</Link>
                    </motion.div>
                  ))}
                </div>
                <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {user ? (
                    <>
                      <Link href={`/profile/${user.id}`} onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 14, color: "#d4d4d8", textDecoration: "none" }}>
                        <User size={15} />{user.name}
                      </Link>
                      <Link href="/create-game" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 14, color: "#d4d4d8", textDecoration: "none" }}>
                        <Plus size={15} />Create Game
                      </Link>
                      {user.role === "coach" && (
                        <Link href="/coach/dashboard" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 14, color: "#e63946", textDecoration: "none" }}>
                          📊 Coach Dashboard
                        </Link>
                      )}
                      <button onClick={() => { logout(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 14, color: "#ef4444", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        <LogOut size={15} />Sign Out
                      </button>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                      <Link href="/login" onClick={() => setOpen(false)} style={{ flex: 1, textAlign: "center", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#d4d4d8", border: "1px solid rgba(255,255,255,0.09)", textDecoration: "none" }}>Sign In</Link>
                      <Link href="/register" onClick={() => setOpen(false)} style={{ flex: 1, textAlign: "center", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)", textDecoration: "none" }}>Register</Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Search overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onClick={() => { setSearchOpen(false); setQ(""); }}
          >
            <div style={{ maxWidth: 640, margin: "64px auto 0", padding: "0 16px" }} onClick={e => e.stopPropagation()}>
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ duration: 0.22, ease }}
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 20, overflow: "hidden",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
                }}
              >
                {/* Input bar */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <Search size={17} color="#52525b" style={{ flexShrink: 0 }} />
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && q.length >= 2) goToResult(`/search?q=${encodeURIComponent(q)}`);
                    }}
                    placeholder="Search coaches, games, camps, events…"
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "#fff", fontSize: 16, fontFamily: "inherit",
                    }}
                  />
                  <motion.button
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}
                    onClick={() => { setSearchOpen(false); setQ(""); }}
                    style={{
                      color: "#52525b", background: "rgba(255,255,255,0.06)",
                      border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                      padding: "4px 9px", borderRadius: 6, fontFamily: "inherit",
                    }}
                  >
                    Esc
                  </motion.button>
                </div>

                {/* Results */}
                <div style={{ maxHeight: 420, overflowY: "auto", padding: q.length < 2 ? "16px 14px" : "8px 8px" }}>
                  {q.length < 2 && (
                    <div>
                      <p style={{ fontSize: 11, color: "#3f3f46", marginBottom: 10, paddingLeft: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Quick links
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                        {[
                          { href: "/learn",  label: "🎓 Find a Coach" },
                          { href: "/play",   label: "🏃 Join a Game"  },
                          { href: "/camps",  label: "☀️ Summer Camps" },
                          { href: "/events", label: "🏆 Events"       },
                        ].map(({ href, label }) => (
                          <motion.button
                            key={href}
                            whileHover={{ background: "rgba(255,255,255,0.06)" }}
                            onClick={() => goToResult(href)}
                            style={{
                              display: "flex", alignItems: "center", gap: 9,
                              padding: "10px 12px", borderRadius: 10,
                              background: "rgba(255,255,255,0.03)", border: "none",
                              color: "#d4d4d8", fontSize: 13, fontWeight: 500,
                              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                            }}
                          >
                            {label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.length >= 2 && allResults.length === 0 && !searchData && (
                    <p style={{ textAlign: "center", padding: "28px 0", color: "#52525b", fontSize: 14 }}>Searching…</p>
                  )}
                  {q.length >= 2 && allResults.length === 0 && searchData && (
                    <p style={{ textAlign: "center", padding: "28px 0", color: "#52525b", fontSize: 14 }}>
                      No results for &ldquo;{q}&rdquo;
                    </p>
                  )}

                  <AnimatePresence>
                    {allResults.map((r, i) => (
                      <motion.button
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ background: "rgba(255,255,255,0.05)" }}
                        onClick={() => goToResult(r.href)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 12px", width: "100%",
                          borderRadius: 11, background: "none",
                          border: "none", cursor: "pointer",
                          fontFamily: "inherit", textAlign: "left",
                        }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                          <Img src={r.image} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100,
                              background: `${TYPE_COLOR[r.type]}18`, color: TYPE_COLOR[r.type],
                            }}>
                              {TYPE_LABEL[r.type]}
                            </span>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                          <p style={{ fontSize: 12, color: "#52525b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</p>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>

                  {q.length >= 2 && allResults.length > 0 && (
                    <div style={{ padding: "8px 12px 10px", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 4 }}>
                      <button
                        onClick={() => goToResult(`/search?q=${encodeURIComponent(q)}`)}
                        style={{
                          fontSize: 12, color: "#e63946", background: "none",
                          border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                        }}
                      >
                        View all results →
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
