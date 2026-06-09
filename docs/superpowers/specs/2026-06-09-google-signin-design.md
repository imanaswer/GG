# Google Sign-In — Design

**Date:** 2026-06-09
**Status:** Approved (pending spec review)

## Goal

Let users sign in / sign up with their Google account, in addition to the
existing email + password flow. Add "Continue with Google" to **both** the
login and register pages.

## Approach

Manual Google OAuth 2.0 **authorization code** flow that issues the app's
existing `gg_token` JWT on success. No new auth framework (no Auth.js /
NextAuth) — the current custom JWT system (`jose`, HS256, httpOnly cookie) is
kept intact. Zero new runtime dependencies: token exchange and userinfo are
fetched directly from Google's HTTP endpoints.

Email is the linking identity. If a Google email matches an existing account,
the user is logged into that same account (auto-link). One person = one account.

## Existing context

- Auth lib: `src/lib/auth.ts` — `signToken`, `cookieOpts`, cookie name `gg_token`.
- Login route: `src/app/api/auth/login/route.ts` — bcrypt-compares against
  `user.passwordHash`.
- Register route: `src/app/api/auth/register/route.ts` — creates user, defaults
  `role` to `player`.
- `AuthContext.tsx` reads session from `/api/auth/me` on mount — no client change
  strictly required for OAuth (cookie is set server-side, page redirects).
- Schemas in `src/lib/api.ts`: roles are `"player" | "coach"`.
- Prisma 7 with real migrations (`prisma migrate dev`), Supabase/Postgres.
  Migration config in `prisma.config.ts` (uses `DIRECT_URL`).
- `NEXT_PUBLIC_APP_URL` already exists in env — used to build the redirect URI.
- AGENTS.md: this Next.js (16.2.3) has breaking changes; read
  `node_modules/next/dist/docs/` for route-handler patterns before writing routes.
  `cookies()` is async in this version.

## Schema change

Migration name: `add_google_auth`.

```prisma
model User {
  // ...
  passwordHash  String?            // was required; null for Google-only users
  googleId      String?  @unique   // Google "sub"; secondary id, email stays link key
}
```

Run with `npm run db:migrate`.

`googleId` is a nice-to-have (lets us recognize the same Google identity even if
the user later changes their Google email). It is **not** load-bearing — email is
the linking key.

## API routes

### `GET /api/auth/google`
1. Generate a cryptographically random `state` string.
2. Store `state` in a short-lived (~10 min) httpOnly, SameSite=lax cookie. Pack
   the incoming `?redirect=` target into the state cookie (or a parallel cookie)
   so it survives the round-trip.
3. 302-redirect to Google's authorization endpoint with `client_id`,
   `redirect_uri` (= `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback`),
   `response_type=code`, `scope=openid email profile`, `state`,
   `prompt=select_account`.

The "start" must be a **server route**, not a bare `<a>` to Google, because only
a route can set the httpOnly `state` cookie.

### `GET /api/auth/google/callback`
1. Read `code` and `state` from the query.
2. **Verify `state` matches the state cookie** (CSRF guard). Reject on mismatch.
3. Exchange `code` for tokens at Google's token endpoint
   (`client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`).
4. Fetch the user's profile (userinfo endpoint or decode the `id_token`).
5. **Reject if `email_verified` is false** — this is what makes auto-link safe;
   skipping it is an account-takeover vector for Workspace accounts that can
   present unverified emails.
6. Resolve the user, in this exact order:
   1. **Find by `googleId`.** If found → log that user in (fast path for repeat
      Google logins).
   2. **Else find by `email`.** If found → **link**: set `googleId` on that
      account (and backfill `avatarUrl` if null), then log in. Do not overwrite
      an existing password.
   3. **Else create** a new user: `role: "player"`, `passwordHash: null`, name
      from Google profile, `avatarUrl` from Google picture, `googleId` set, and a
      **generated unique username** (see below).
   - **P2002 race handling:** wrap step 3's `create` so a Prisma `P2002` unique
     violation (on `email` or `googleId`) does **not** error. Instead, re-run the
     lookup (by `googleId`, then `email`) and link/log in the now-existing row.
     This makes two near-simultaneous callbacks converge on one account instead
     of one of them 500-ing.
7. Issue `gg_token` via `signToken` + `cookieOpts`, set the cookie.
8. Redirect to the saved `redirect` target (default `/`). On any error, redirect
   to `/login?error=google` so the user sees a message rather than a raw 500.

### Username generation
`username` is unique and required. Generate from the email local-part:
1. Slugify the local-part (lowercase, strip non-alphanumeric).
2. If empty after slugify, fall back to e.g. `user`.
3. On collision, append an incrementing numeric suffix (`name`, `name1`,
   `name2`, …) until a free username is found.

## Guard the existing password login

`src/app/api/auth/login/route.ts` currently calls
`bcrypt.compare(input.password, user.passwordHash)`. Once `passwordHash` is
nullable, a Google-only account would pass `null` here.

Add a guard: if the matched user has no `passwordHash`, fail with
`"This account uses Google sign-in — continue with Google."` (same 401 shape as
"Invalid email or password", no crash, no info leak beyond the hint).

## UI — "Continue with Google" button

Add a Google-branded button to **both** pages:
- `src/app/(auth)/login/page.tsx` — in the existing "or" section alongside the
  demo button.
- `src/app/(auth)/register/page.tsx` — equivalent placement.

The button is a plain navigation to
`/api/auth/google?redirect=<current redirect>` — no client-side auth logic.
Styled to match the existing dark theme (white/neutral surface, Google "G" mark,
matching height/radius to the demo button).

## Configuration (user setup — not code)

1. **Google Cloud Console**: create an OAuth 2.0 Client ID (Web application).
   Add **authorized redirect URIs** for both environments:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://<vercel-domain>/api/auth/google/callback`
2. **Env vars** (add to `.env.local`, `vercel.env`, and document in
   `.env.example`):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

The flow will not work until these exist.

## Testing

- **Unit:** username-generation collision logic; `email_verified === false`
  rejection; null-`passwordHash` login guard returns the right error.
- **Manual (localhost round-trip):** new Google user (account created, logged
  in, redirected); existing-email user (auto-linked, logged in); password login
  for a Google-only account shows the guard message.

## Out of scope (YAGNI)

- Additional OAuth providers (Apple, Facebook).
- Account-settings UI to link/unlink Google after the fact.
- One-tap / Google Identity Services widget.
