# Game Ground

A hyperlocal sports platform for Kozhikode — book coaches, join pickup games, register for camps and tournaments, and run the operation from a live admin console.

**Learn. Play. Connect.**

---

## Quick start

```bash
npm install
cp .env.example .env.local        # fill AUTH_SECRET, DATABASE_URL, DIRECT_URL
npm run db:deploy                 # apply Prisma migrations
npm run db:seed                   # optional — sample data
npm run dev
```

- App: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> (password `admin123` unless `ADMIN_PASSWORD` is set)

### Seeded accounts

All player passwords are `password123`.

| Email                   | Role   |
| ----------------------- | ------ |
| `demo@gameground.com`   | Player |
| `priya@gameground.com`  | Player |
| `rahul@gameground.com`  | Player |
| `admin@gameground.com`  | Admin  |

---

## Stack

| Layer          | Tech                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router, React 19, TypeScript)                             |
| Database       | **Prisma 7** on **Supabase/PostgreSQL** (pooled + direct URLs)                |
| Auth           | **jose** JWT — httpOnly cookie, 7-day player session, 60-min admin session   |
| Data fetching  | **@tanstack/react-query** — caching, mutations, live admin refresh            |
| Payments       | **Razorpay** popup — camps, events, paid games; slot gated on verification   |
| Rate limiting  | **Upstash Redis** + `@upstash/ratelimit` — auth, AI, and mutation buckets     |
| AI             | **Claude** via `@anthropic-ai/sdk` at `/api/ai/recommend`                     |
| Media / email  | **Cloudinary** (uploads) · **Resend** (transactional)                         |
| Styling        | Inline styles throughout — no Tailwind utility classes                        |

> **Note:** Next.js 16 renamed the `middleware` convention to `proxy`. The rate-limit logic lives in `src/proxy.ts`.

---

## Project layout

```
src/
  app/                 # App Router pages + /api route handlers
    (auth)/            # login, register, forgot-password, reset-password
    admin/             # dashboard + admin login
    api/               # route handlers
  components/          # shared UI
  context/             # AuthContext, Providers
  hooks/               # useData — React Query wrappers
  lib/                 # prisma, auth, adminAuth, api (zod), razorpay, ratelimit
  proxy.ts             # Next 16 proxy — rate limiting
prisma/                # schema.prisma, migrations, seed.ts
```

---

## Features

### Player-facing
- Home · login / register (player + 5-step coach flow) · forgot & reset password
- **Learn** — coach directory, coach profile, coach dashboard (bookings, edit)
- **Play** — pickup games list & detail, create-game, join / leave, attendance
- **Camps** — directory, detail, registration with Razorpay checkout
- **Events** — directory, detail, team registration with Razorpay checkout
- **Profile** — view, edit, delete (GDPR), reviews, reliability score
- Global ⌘K search, WhatsApp share

### Admin (`/admin`)
- Overview — metrics, alerts, live activity feed (15s auto-refresh)
- Bookings · Games · Camps · Events · Users · Coaches · Revenue tabs
- Full CRUD for coaches, camps, and events — add, edit, delete from the dashboard
- Cover photo upload (drag-and-drop / file picker) with live preview on all entities
- Approve / reject pending coach applications
- CSV export on bookings, camp registrations, transactions

---

## Rate limiting

Applied in `src/proxy.ts` (auth + generic mutations) and inline in `src/app/api/ai/recommend/route.ts` (per-user):

| Bucket   | Limit     | Key                     | Scope                                                          |
| -------- | --------- | ----------------------- | -------------------------------------------------------------- |
| auth     | 5 / min   | IP                      | `/api/auth/{login,register,forgot-password,reset-password}`    |
| ai       | 10 / hr   | user id (IP fallback)   | `/api/ai/recommend`                                            |
| mutation | 100 / min | IP                      | All other `POST`/`PATCH`/`PUT`/`DELETE` under `/api`           |

On rate-limit hit the proxy returns **429** with a `Retry-After` header.

Without `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` the limiter falls back to an in-memory sliding window (dev only — not safe across instances).

---

## Payments

Camp, event, and paid-game detail pages load the Razorpay checkout script lazily from `src/lib/razorpay.ts`. Flow:

1. Client `POST /api/payments/create-order` with `{ amount, entityType, entityId }`.
2. Razorpay popup opens; on success the client `POST /api/payments/verify`.
3. The verify handler checks the HMAC signature, then in a single Prisma transaction creates the `Payment` row **and** the matching `CampRegistration` / `EventRegistration` / `GamePlayer` row with `paymentStatus = "paid"` and bumps the participant count.

No slot is reserved until payment is verified. Free games and events skip the popup and use the standard register endpoints.

When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are absent, `create-order` returns a mock `devMode: true` order and `verify` skips the signature check — handy for local development.

---

## API response shape

All handlers under `src/app/api/*` use the helpers in `src/lib/api.ts`:

```ts
// success
{ ok: true,  data: { ... } }

// error
{ ok: false, error: "message", details?: ... }
```

Always unwrap from `data` on the client. Validation errors return **422** with field-level details; auth failures return **401**; rate-limit hits return **429**.

---

## Scripts

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Next dev server                           |
| `npm run build`      | Production build                          |
| `npm run start`      | Serve the production build                |
| `npm run lint`       | ESLint                                    |
| `npm run db:generate`| Regenerate the Prisma client              |
| `npm run db:migrate` | Create + apply a new migration (dev)      |
| `npm run db:deploy`  | Apply migrations (prod / CI)              |
| `npm run db:seed`    | Seed the database                         |
| `npm run db:reset`   | Drop, re-migrate, re-seed                 |
| `npm run db:studio`  | Open Prisma Studio                        |

---

## Environment

See `.env.example` for the full list. Minimum to boot:

```env
AUTH_SECRET="…32+ random chars…"
DATABASE_URL="postgresql://…pooler…:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://…:5432/postgres"
```

Recommended for production:

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- Cloudinary credentials
- `ADMIN_PASSWORD` (defaults to `admin123` if unset)
- `CRON_SECRET`

---

## Troubleshooting

**Login / register appears to succeed but the UI still shows logged-out.**
Make sure you're on the latest commit — the API returns `{ ok, data: { user, token } }` and the client must read `data.user`. The client hook is in `src/context/AuthContext.tsx`.

**Admin login rejected.**
Use `admin123` unless you have set `ADMIN_PASSWORD` in `.env.local`. The admin session cookie (`gg_admin`) is separate from the player cookie (`gg_token`).

**Rate limited during local dev.**
The auth bucket is 5 req/min/IP. If you hammer `/api/auth/login`, wait 60 seconds or restart the server to clear the in-memory window.

---

## Future roadmap

Below are planned features and improvements, roughly grouped by area.

### Platform & discovery
- **Venue / turf booking** — reserve courts, turfs, and indoor facilities with time-slot calendar and payment
- **Map-based discovery** — interactive map view for coaches, games, events, and venues with radius filters
- **Advanced search & filters** — filter by sport, distance, price range, rating, availability, and age group
- **Push notifications** — browser + mobile PWA push for booking confirmations, game reminders, and slot openings
- **Multi-city expansion** — location selector and city-scoped content beyond Kozhikode

### Player experience
- **In-app chat / messaging** — direct messages between players, coaches, and organizers
- **Team management** — create persistent teams, invite members, track win/loss record
- **Leaderboards & achievements** — sport-specific rankings, badges, streaks, and XP system
- **Social feed** — post match highlights, photos, and results; follow players and coaches
- **Recurring game scheduling** — set up weekly pickup games that auto-create and notify regulars
- **Waitlist auto-promotion** — automatically move waitlisted players into open slots with notification

### Coach & organizer tools
- **Coach availability calendar** — interactive weekly calendar for setting open slots
- **Batch management UI** — coaches can add, edit, and remove training batches from their dashboard
- **Earnings dashboard** — detailed payout history, pending settlements, and tax invoices
- **Attendance tracking** — QR-code or OTP-based check-in for sessions, camps, and events
- **Review replies** — let coaches respond publicly to player reviews

### Admin & operations
- **Role-based admin access** — multiple admin users with granular permissions (view-only, editor, super-admin)
- **Bulk operations** — multi-select and batch-update bookings, registrations, and user statuses
- **Audit log** — track every admin action (who changed what, when) for accountability
- **Email / SMS campaigns** — send targeted announcements to player segments from the admin panel
- **Automated reports** — scheduled weekly / monthly PDF summaries emailed to admins
- **Cloud image storage** — migrate uploaded images from local disk to Cloudinary or Vercel Blob for production persistence

### Payments & monetization
- **Subscription plans** — monthly coaching packages with recurring Razorpay billing
- **Refund management** — admin-initiated partial / full refunds with Razorpay integration
- **Coupon & promo codes** — discount codes for camps, events, and coaching sessions
- **Split payments** — auto-split revenue between platform and coaches / organizers
- **GST invoice generation** — auto-generate tax-compliant invoices for all paid transactions

### Technical improvements
- **Automated testing** — unit tests for API routes, integration tests for payment flows, E2E with Playwright
- **i18n / localization** — Malayalam and Hindi translations
- **Offline PWA support** — cache-first strategy for game listings and profile pages
- **Performance monitoring** — integrate Sentry or Datadog for error tracking and API latency dashboards
- **Database optimization** — add composite indexes on high-traffic query patterns, implement connection pooling health checks
- **CI / CD pipeline** — GitHub Actions for lint, typecheck, test, and preview deployments on every PR
