"use client";
import { useEffect } from "react";
import Link from "next/link";

// Catches errors thrown by the root layout itself, so it must render <html>.
// Kept dependency-free: if the layout is what broke, fonts and providers are gone.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[app] layout error:", error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", color: "#fff", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
            The page hit an error it could not recover from. Try again, or head back to the home page.
            {error.digest ? <><br />Reference: <code>{error.digest}</code></> : null}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 100, border: "none", background: "#fff", color: "#000", fontWeight: 700, cursor: "pointer" }}>Try again</button>
            <Link href="/" style={{ padding: "12px 20px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none", fontWeight: 600 }}>Home</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
