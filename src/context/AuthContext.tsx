"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User { id: string; name: string; email: string; username: string; role: string; }
interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: { name: string; email: string; username: string; password: string; role: string }) => Promise<string | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => null, register: async () => null, logout: () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setUser(d.user); }).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (!r.ok) return d.error ?? "Login failed";
    setUser(d.user);
    return null;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; username: string; password: string; role: string }) => {
    const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!r.ok) return d.error ?? "Registration failed";
    setUser(d.user);
    return null;
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => { setUser(null); window.location.href = "/"; });
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
