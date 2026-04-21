"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, CalendarCheck, Gamepad2, Tent, Wrench, Trophy, Users, Star, DollarSign, LogOut, Menu } from "lucide-react";

const NAV = [
  { href: "/admin",          label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings",  icon: CalendarCheck },
  { href: "/admin/games",    label: "Games",     icon: Gamepad2 },
  { href: "/admin/camps",      label: "Camps",      icon: Tent },
  { href: "/admin/workshops", label: "Workshops",  icon: Wrench },
  { href: "/admin/events",    label: "Events",     icon: Trophy },
  { href: "/admin/users",    label: "Users",     icon: Users },
  { href: "/admin/coaches",  label: "Coaches",   icon: Star },
  { href: "/admin/revenue",  label: "Revenue",   icon: DollarSign },
];

function Sidebar({
  activeHref,
  onNavigate,
  onLogout,
}: {
  activeHref: (href: string) => boolean;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <img src="/logo.png" alt="Game Ground" style={{ height: 26, filter: "invert(1)", marginBottom: 6 }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: "#e63946", letterSpacing: "0.1em", textTransform: "uppercase" }}>Admin Dashboard</div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = activeHref(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 12px",
              borderRadius: 9, marginBottom: 3, textDecoration: "none", fontSize: 13,
              fontWeight: active ? 700 : 500,
              background: active ? "rgba(230,57,70,0.12)" : "transparent",
              color: active ? "#fff" : "#6b7280",
              borderLeft: active ? "2px solid #e63946" : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              <Icon size={16} />{label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 9, background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          <LogOut size={15} />Sign Out
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

  return (
    <div style={{ display: "flex", height: "100vh", background: "#080808", overflow: "hidden" }}>
      {!isMobile && (
        <div style={{ width: 220, flexShrink: 0 }}>
          <Sidebar activeHref={isActive} onNavigate={() => setSidebarOpen(false)} onLogout={logout} />
        </div>
      )}

      {isMobile && sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div style={{ width: 220, flexShrink: 0 }}>
            <Sidebar activeHref={isActive} onNavigate={() => setSidebarOpen(false)} onLogout={logout} />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0, background: "#080808" }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Menu size={20} />
            </button>
          )}
          <div style={{ marginLeft: isMobile ? 0 : "auto", fontSize: 13, color: "#4b5563" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
