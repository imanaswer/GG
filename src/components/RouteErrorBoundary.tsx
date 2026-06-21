"use client";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export function RouteErrorView({
  area,
  error,
  reset,
}: {
  area?: string;
  error: Error;
  reset: () => void;
}) {
  const message = error.message || "Something unexpected broke while rendering.";

  return (
    <main style={{ minHeight: "100vh", background: "#050505", paddingTop: 120, paddingBottom: 60 }}>
      <div style={{
        maxWidth: 520, margin: "0 auto", padding: "32px 24px",
        background: "linear-gradient(135deg, rgba(152,8,8,0.08) 0%, rgba(11,11,11,0.95) 100%)",
        border: "1px solid rgba(152,8,8,0.25)",
        borderRadius: 20,
        textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 18px",
          background: "rgba(152,8,8,0.18)", border: "1px solid rgba(152,8,8,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle size={26} color="#d64545" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
          {area ? `${area} couldn't load` : "Something went wrong"}
        </h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.55, marginBottom: 22 }}>
          {message}
        </p>
        <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 18px", borderRadius: 100,
              fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background: "linear-gradient(135deg, #980808 0%, #6b0505 100%)",
              color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(152,8,8,0.35)",
            }}
          >
            <RotateCcw size={13} /> Try again
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 18px", borderRadius: 100,
              fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              textDecoration: "none",
            }}
          >
            <Home size={13} /> Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
