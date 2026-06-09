"use client";

/**
 * "Continue with Google" — a plain navigation to the server-side OAuth start
 * route (`/api/auth/google`). No client-side auth logic; the route sets the
 * CSRF state cookie and redirects to Google. `redirect` is the post-login
 * target, carried through the OAuth state.
 */
export function GoogleSignInButton({ redirect = "/", label = "Continue with Google" }: { redirect?: string; label?: string }) {
  const href = `/api/auth/google?redirect=${encodeURIComponent(redirect)}`;
  return (
    <a
      href={href}
      style={{
        width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 600,
        background: "rgba(255,255,255,0.03)", color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontFamily: "inherit", cursor: "pointer",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
      }}
    >
      <GoogleG />
      {label}
    </a>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
