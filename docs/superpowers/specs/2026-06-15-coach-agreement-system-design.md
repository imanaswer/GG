# Coach Agreement System — Design

**Date:** 2026-06-15
**Status:** Approved (brainstorming) — ready for implementation plan

## Goal

Before any coach can become active on GameGround, they must review and accept a
legally binding **Coach Partnership Agreement (v1.0)**. Acceptance is permanently
recorded as an immutable, hash-verified, versioned legal record, accessible to the
coach and to administrators, and enforced as a server-side gate on all coach
activity.

## Context (existing codebase facts)

- **Coaches** are a `User` with `role: "coach"` linked 1:1 to a `Coach` profile
  (`User.coachProfile`). Coaches are **admin-created today** — there is no
  self-serve coach signup. Existing coach guards are client-side
  (`user.role !== "coach"` → `router.push("/login")`).
- **Storage** = Cloudinary via server-signed uploads (`src/app/api/upload/route.ts`),
  currently **image-only and public/client-driven**.
- **Email** = Resend (`src/lib/email.ts`); `sendEmail({to,subject,html})` with a
  no-op fallback when `RESEND_API_KEY` is unset. **No attachment support yet.**
- **No PDF library** is installed.
- App theme is dark (`#080808`); the legal page intentionally diverges to white.
- Coach personal fields (DOB, address, emergency contacts) **do not exist** in the
  schema.
- **AGENTS.md**: this is a modified Next.js 16 — read `node_modules/next/dist/docs/`
  before writing routes/server actions; verify runtime behavior, don't assume.

## Decisions (chosen defaults — change at review if wrong)

1. **Onboarding entry:** admin creates the coach account as today. On first
   authenticated coach access with no `SIGNED` agreement → redirect to
   `/onboarding-terms`. **No self-serve signup is built.**
2. **Sequencing:** vertical slice first (Phase 1), then admin surfaces (Phase 2),
   then email + audit + badges (Phase 3).
3. **Personal fields** (DOB/address/emergency contact name+number) are stored as an
   **immutable `personalSnapshot` JSON on the agreement record**, not as editable
   `User`/`Coach` columns. The record is a frozen legal snapshot.
4. **PDF library** = `pdf-lib` (pure JS, embedded standard fonts, no native/FS deps;
   safest for bundled serverless). **Must be spiked in-runtime first.**
5. **Governing law / jurisdiction** = Kozhikode, Kerala, India (matches brand
   footer). Lives in the versioned content constant — trivially changeable, but
   never edit v1.0 after ship (bump version instead).

## Data model (Prisma + migration)

### `CoachAgreement`
```
id               String   @id @default(cuid())
agreementNumber  String   @unique         // AGR-2026-000001, from a Postgres sequence
coachId          String   @index
userId           String                    // the signing User
agreementVersion String                    // "v1.0"
fullName         String
email            String
signatureName    String
acceptedAt       DateTime @index
ipAddress        String
userAgent        String
pdfPublicId      String                    // Cloudinary private ref — NOT a public URL
pdfResourceType  String   @default("raw")
agreementHash    String                    // SHA-256, never regenerated
status           String   @default("SIGNED") // PENDING_SIGNATURE|SIGNED|EXPIRED|SUPERSEDED
personalSnapshot Json                      // DOB, address, emergencyContactName, emergencyContactNumber
createdAt        DateTime @default(now())
updatedAt        DateTime @updatedAt

@@index([coachId])
@@index([agreementNumber])
@@index([acceptedAt])
relation: coach Coach @relation(...)
```

### `CoachAgreementAuditLog`
```
id          String   @id @default(cuid())
agreementId String   @index
action      String                          // VIEW | DOWNLOAD
actorId     String                          // user id of viewer
actorRole   String                          // coach | admin
ipAddress   String?
createdAt   DateTime @default(now())
```
(No existing audit-log table to reuse.)

### Agreement number generation
- A Postgres **sequence** (e.g. `coach_agreement_seq`) created in the migration.
  Number = `AGR-<year>-<6-digit zero-padded nextval>`. **Never `count()+1`**
  (race-prone). Reserve the value inside the signing transaction.

## Versioned, frozen content

- `src/lib/coachAgreement/content.ts`: agreement text keyed by version. `v1.0`
  contains all 13 sections:
  1. Professional Conduct · 2. Coaching Responsibilities · 3. Certifications &
  Qualifications · 4. Payments & Earnings · 5. Cancellations & Refunds · 6. Safety
  & Liability · 7. Background Verification · 8. Intellectual Property · 9. Data
  Privacy · 10. Suspension & Termination · 11. Independent Contractor Status ·
  12. Governing Law (India) · 13. Electronic Signature Consent.
- Exposes `CURRENT_AGREEMENT_VERSION = "v1.0"`, `getAgreementContent(version)`,
  and estimated reading time.
- **Immutability rule:** once v1.0 ships, the constant is never edited; new content
  ships as `v1.1`. This is what makes "always show the accepted version" and hash
  verification hold over time.

## Hashing

- `agreementHash = sha256(content + version + signatureName + acceptedAt.toISOString())`.
- Computed **once** at signing inside `src/lib/coachAgreement/hash.ts`. Reproducible
  later for tamper-detection. Never regenerated after signing.

## Signing flow — `/onboarding-terms`

UI (white, premium legal-document look; mobile responsive; GameGround branding):
- Sticky progress indicator + estimated reading time.
- **Coach information** form: Full Legal Name, Email, Phone, DOB, Address,
  Emergency Contact Name, Emergency Contact Number. Pre-fill from `User`/`Coach`
  where available (name, email, phone); rest entered by coach.
- Scrollable agreement section rendering the full v1.0 content.
- **4 mandatory checkboxes** (all required, submit disabled until all checked):
  accurate info · read & agree to agreement · consent to e-signatures & records ·
  understand suspension/termination.
- **Digital signature:** Full Legal Name + typed signature + date. Validation:
  `signature.trim() === fullName.trim()`, else submission blocked. Warning copy:
  "By typing your name below, you are providing a legally binding electronic
  signature."

Submit → server route/action:
1. Auth = signing coach; reject if already has a SIGNED current-version agreement.
2. Validate all fields + checkbox flags + signature match (server-side, not just client).
3. Reserve agreement number from the sequence (in a transaction).
4. Capture coachId, version, timestamp, signatureName, fullName, email, IP, UA.
5. Generate PDF (full text + coach details + number + version + signature +
   timestamp + IP + UA + branding).
6. Upload PDF privately to Cloudinary (`resource_type=raw`, `type=authenticated`);
   store `public_id`.
7. Compute hash; write `CoachAgreement` record.
8. (Phase 3) email signed PDF to coach.
9. Return success payload → client shows success state, then Continue Onboarding.

**Success state:** ✓ Agreement Successfully Signed + agreement number, version, date
signed + Download PDF + Continue Onboarding.

## PDF + storage

- `src/lib/coachAgreement/pdf.ts` builds the document with `pdf-lib`
  (multi-page, word-wrapped, standard embedded font, GameGround header/branding).
- Upload via a **server-side** Cloudinary call (the existing `/api/upload` is
  image-only + public + client-driven; PDFs are server-generated + private). Store
  `public_id` + resource type. **No public URL persisted.**
- Download route `GET /api/coach/agreements/[id]/pdf`: verifies ownership-or-admin,
  writes a DOWNLOAD audit log, then streams the bytes or 302s to a short-lived
  Cloudinary **signed** URL.

## The gate (server-side is the real gate)

- `src/lib/coachAgreement/gate.ts` → `getCoachAgreementStatus(userId)` /
  `requireSignedAgreement(userId)`.
- Enforced server-side in every coach **mutation** surface: publish/edit profile,
  accept/approve bookings, create sessions/batches. Unsigned coach → blocked with a
  clear error (cannot publish profile, accept bookings, create sessions, become
  active).
- Client redirect (`role:coach` + unsigned → `/onboarding-terms`) is **UX only**,
  layered on top of the server gate.

## Admin surfaces (Phase 2)

- **List:** `/admin/coaches/agreements` — table: Agreement Number · Coach Name ·
  Email · Version · Signed Date · Status (color badge). Filters: date range,
  version, coach name, status. Search: coach name, email, agreement number.
  Actions: View, Download PDF. Follows existing admin page patterns.
- **Detail:** `/admin/coaches/agreements/[id]` — agreement number, coach info,
  version, signed date, IP, UA, agreement hash; Download PDF + View Agreement;
  renders the **exact accepted version's content** (never the latest).

## Coach surface (Phase 2)

- **Legal Documents** card on `/coach/dashboard`: Coach Agreement · Status: Signed ·
  Version · Signed Date · View Agreement · Download PDF. Accessible anytime.

## Email (Phase 3)

- Extend `sendEmail` to support Resend **attachments** (`{filename, content}` base64).
- "GameGround Coach Agreement Successfully Signed": thanks + agreement number +
  version + signed date + Download PDF button, with the signed PDF attached.

## Security

- PDFs are private; served only through the auth-checked download route
  (ownership-or-admin). Coaches access only their own agreements; admins access all.
- **Audit log** every VIEW and DOWNLOAD.
- Records are immutable: no edit endpoints after signing; hash detects tampering.

## Status indicators

- `PENDING_SIGNATURE` · `SIGNED` · `EXPIRED` · `SUPERSEDED`, color-coded badges
  (reuse existing `StatusBadge` pattern where possible).

## Pre-implementation spikes (do FIRST, per AGENTS.md)

1. Throwaway route that emits a one-page PDF via `pdf-lib` and returns it — confirm
   it works in this Next 16 runtime before building the 13-section layout on it.
2. Server-side Cloudinary `resource_type=raw` + `type=authenticated` upload +
   signed delivery — confirm before the storage flow depends on it.

## Build order

- **Phase 1 (checkpoint):** schema + sequence + frozen content + hash + sign flow +
  PDF + private storage + server gate.
- **Phase 2:** admin list/detail + coach legal card.
- **Phase 3:** email attachment + audit logging on every view/download + status
  badges/expiry handling.

## Quality requirements

Production-ready, TypeScript types, Prisma schema + migration, API routes / server
actions, error + loading + success states, audit logging, responsive UI, clean
isolated modules under `src/lib/coachAgreement/`, fully integrated into the existing
coach onboarding flow.
