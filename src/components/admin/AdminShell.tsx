"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, CalendarCheck, Gamepad2, MapPin, Tent, Wrench, Trophy, Users, Star, FileText, DollarSign, LogOut, Menu, ChevronDown, Inbox, type LucideIcon } from "lucide-react";
import { AdminSearch } from "./AdminSearch";

const BOOKING_CHILDREN = [
  { href: "/admin/bookings/coaches",       label: "Coaches" },
  { href: "/admin/bookings/play-sessions", label: "Play Sessions" },
  { href: "/admin/bookings/workshops",     label: "Workshops" },
  { href: "/admin/bookings/camps",         label: "Camps" },
  { href: "/admin/bookings/events",        label: "Events" },
];

const NAV = [
  { href: "/admin",          label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/inbox",    label: "Inbox",     icon: Inbox },
  { href: "/admin/bookings", label: "Bookings",  icon: CalendarCheck, children: BOOKING_CHILDREN },
  { href: "/admin/games",    label: "Games",     icon: Gamepad2 },
  { href: "/admin/venues",   label: "Venues",    icon: MapPin },
  { href: "/admin/camps",      label: "Camps",      icon: Tent },
  { href: "/admin/workshops", label: "Workshops",  icon: Wrench },
  { href: "/admin/events",    label: "Events",     icon: Trophy },
  { href: "/admin/users",    label: "Users",     icon: Users },
  { href: "/admin/coaches",  label: "Coaches",   icon: Star },
  { href: "/admin/coaches/agreements", label: "Agreements", icon: FileText },
  { href: "/admin/revenue",  label: "Revenue",   icon: DollarSign },
];

function Sidebar({
  activeHref,
  onNavigate,
  onLogout,
  adminName,
}: {
  activeHref: (href: string) => boolean;
  onNavigate: () => void;
  onLogout: () => void;
  adminName?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#050505", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <img src="/logo2.png" alt="Game Ground" style={{ height: 32, width: "auto", marginBottom: 12, filter: "brightness(0) invert(1)" }} />
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Admin Dashboard</div>
      </div>
      <nav style={{ flex: 1, padding: "20px 12px", overflowY: "auto" }}>
        {NAV.map(({ href, label, icon: Icon, children }: { href: string; label: string; icon: LucideIcon; children?: { href: string; label: string }[] }) => {
          const active = activeHref(href);
          return (
            <div key={href}>
              <Link href={href} onClick={onNavigate} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderRadius: 4, marginBottom: 4, textDecoration: "none", fontSize: 13,
                fontWeight: active ? 600 : 400,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.5)",
                borderLeft: active ? "2px solid #fff" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}>
                <Icon size={16} />{label}
                {children && <ChevronDown size={14} style={{ marginLeft: "auto", transform: active ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s" }} />}
              </Link>
              {children && active && (
                <div style={{ marginLeft: 16, marginBottom: 8, borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 8 }}>
                  {children.map(c => {
                    const cActive = activeHref(c.href);
                    return (
                      <Link key={c.href} href={c.href} onClick={onNavigate} style={{
                        display: "block", padding: "8px 12px", borderRadius: 4, marginBottom: 2,
                        textDecoration: "none", fontSize: 12,
                        fontWeight: cActive ? 600 : 400,
                        color: cActive ? "#fff" : "rgba(255,255,255,0.5)",
                        background: cActive ? "rgba(255,255,255,0.04)" : "transparent",
                      }}>{c.label}</Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {adminName && (
          <div style={{ padding: "4px 16px 12px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Signed in as <span style={{ color: "#fff", fontWeight: 600 }}>{adminName}</span>
          </div>
        )}
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", borderRadius: 4, background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s ease" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
        >
          <LogOut size={16} />Sign Out
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path   = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isActive = (href: string) => href === "/admin" ? path === "/admin" : path.startsWith(href);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    router.push("/admin/login");
  };

  const [adminName, setAdminName] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth")
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.admin && typeof d.name === "string") setAdminName(d.name); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#050505", overflow: "hidden" }}>
      {!isMobile && (
        <div style={{ width: 260, flexShrink: 0 }}>
          <Sidebar activeHref={isActive} onNavigate={() => setSidebarOpen(false)} onLogout={logout} adminName={adminName} />
        </div>
      )}

      {isMobile && sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div style={{ width: 260, flexShrink: 0 }}>
            <Sidebar activeHref={isActive} onNavigate={() => setSidebarOpen(false)} onLogout={logout} adminName={adminName} />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, background: "#050505" }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Menu size={24} />
            </button>
          )}
          
          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", alignItems: "center", gap: 24 }}>
            {!isMobile && <AdminSearch />}
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "40px 40px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
