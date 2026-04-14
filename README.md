# Game Ground — Hyperlocal Sports Platform

**Learn. Play. Connect.** — Kozhikode's hyperlocal sports platform.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in AUTH_SECRET at minimum
npm run dev
```

Open **http://localhost:3000**  
Admin dashboard: **http://localhost:3000/admin** (password: `admin123` in dev)

> Delete `data/db.json` first for fresh seed data.

---

## Demo Accounts (`password123`)
| Email | Name | Role |
|---|---|---|
| `demo@gameground.com` | Arjun Sharma | Player |
| `priya@gameground.com` | Priya Menon | Player |
| `rahul@gameground.com` | Rahul Nair | Player |
| `admin@gameground.com` | Admin | Admin (`admin123`) |

---

## What's Built — 71 Routes

### Main Platform (52 routes)
| Section | Routes |
|---|---|
| Home + Auth | `/`, `/login`, `/register`, `/register/coach`, `/forgot-password`, `/reset-password` |
| Learn | `/learn`, `/coach/[id]`, `/coach/dashboard`, `/coach/dashboard/bookings`, `/coach/profile/edit` |
| Play | `/play`, `/game/[id]`, `/create-game` |
| Camps | `/camps`, `/camps/[id]` |
| Events | `/events`, `/events/[id]` |
| Profile | `/profile/[id]`, `/profile/edit` |
| Discover | `/search`, `/about`, `/terms`, `/privacy` |

### Admin Dashboard (19 routes)
| Page | Route | Description |
|---|---|---|
| Login | `/admin/login` | Secure password-protected entry |
| Overview | `/admin` | Metrics, alerts, live activity feed |
| Bookings | `/admin/bookings` | Table + filters + drawer + CSV export |
| Games | `/admin/games` | All games with player lists |
| Camps | `/admin/camps` | Registrations with child details + CSV |
| Events | `/admin/events` | Event registrations, live auto-refresh |
| Users | `/admin/users` | Segments: all / active / new / inactive |
| Coaches | `/admin/coaches` | Approve/reject pending applications |
| Revenue | `/admin/revenue` | Summary cards + breakdown + transaction log |

---

## Key Features

### Branding
- **Game Ground** name with pixel logo throughout
- Logo auto-inverted to white on dark background
- PWA manifest with Game Ground branding

### Admin Dashboard
- JWT-secured, 60-min session timeout
- Real-time activity feed (auto-refresh 15s)
- Platform health metrics (slot fill rate, confirm rate, reliability avg)
- Smart alerts (full camps, stale bookings, low player games)
- Approve/reject pending coach applications
- CSV export on bookings, camp registrations, transactions
- Booking detail drawer with full context

### Main Platform
- Global search overlay (⌘K) across all content types
- WhatsApp sharing on game detail pages
- Forgot / reset password (token-based, 1hr expiry)
- Edit profile + delete account (GDPR)
- 5-step coach self-registration
- Coach dashboard for booking management
- Review submission (confirmed booking required)
- Game complete + attendance → reliability score update
- Razorpay scaffold, email scaffold (Resend)
- Prisma schema ready for PostgreSQL migration

---

## Tech Stack
- **Next.js 16** App Router + TypeScript
- **JSON file DB** (`data/db.json`) — auto-seeded, zero native deps
- **JWT auth** via `jose` — httpOnly cookies, 7-day (player) / 60-min (admin)
- **React Query** — caching, mutations, auto-refetch for live content
- **100% inline styles** — no Tailwind class dependencies
- **Prisma schema** — ready for Supabase/PostgreSQL migration

---

## Environment Variables
See `.env.example` for all 16 variables. Minimum required:
```env
AUTH_SECRET="your-32-char-random-string"
ADMIN_PASSWORD="your-admin-password"
```
