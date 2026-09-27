"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User { id: string; name: string; email: string; username: string; role: string; avatarUrl?: string | null; phone?: string | null; }
interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  register: (data: { name: string; email: string; username: string; password: string; role: string }) => Promise<string | null>;
  /** Pass `false` to clear the session without leaving the current page. */
  logout: (redirectTo?: string | false) => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => ({ ok: false, error: "Auth not ready" }), register: async () => null, logout: () => {}, refreshUser: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Login/register responses come from the JWT payload, which carries no phone —
  // so re-read /api/auth/me after them, and after a profile edit.
  const refreshUser = useCallback(
    () => fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => { if (d?.data?.user) setUser(d.data.user); }).catch(() => {}),
    [],
  );

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => { if (d?.data?.user) setUser(d.data.user); }).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (!r.ok) return { ok: false as const, error: d.error ?? "Login failed" };
    setUser(d.data.user);
    void refreshUser();
    return { ok: true as const, user: d.data.user as User };
  }, [refreshUser]);

  const register = useCallback(async (data: { name: string; email: string; username: string; password: string; role: string }) => {
    const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!r.ok) return d.error ?? "Registration failed";
    setUser(d.data.user);
    return null;
  }, []);

  const logout = useCallback((redirectTo: string | false = "/") => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      setUser(null);
      if (redirectTo !== false) window.location.href = redirectTo;
    });
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}
