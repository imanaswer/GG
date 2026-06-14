# Coach Agreement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every coach to sign a versioned, hash-verified, immutably-recorded Coach Partnership Agreement (v1.0) before they can act on the platform, with private PDF storage, admin + coach access surfaces, email delivery, and full audit logging.

**Architecture:** Pure logic lives in isolated `src/lib/coachAgreement/*` modules (TDD with vitest). A signing API route assembles them: validate → reserve a Postgres-sequence agreement number → generate a `pdf-lib` PDF → upload privately to Cloudinary (`resource_type=raw`, `type=authenticated`) → write the `CoachAgreement` row with a SHA-256 hash. PDFs are served only through an ownership/admin-checked route that writes an audit log. A server-side gate blocks unsigned coaches at every mutation surface; a client redirect to `/onboarding-terms` is UX only.

**Tech Stack:** Next.js 16 (modified — read the docs noted below), Prisma 7 + Postgres (adapter-pg), `pdf-lib`, Cloudinary (server signed uploads), Resend, Zod, vitest.

**Read before writing any route/page (AGENTS.md mandate — this is a modified Next 16):**
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`

**Codebase conventions to follow (already verified):**
- API helpers from `@/lib/api`: `ok(data,status?)`, `fail(msg,status?,details?)`, `handleErr(e)`, `ApiError`.
- Auth: `getSessionFromRequest(req)` → `SessionUser | null` (`{id,email,name,username,role,...}`); admin: `getAdminSessionFromRequest(req)` → `boolean`.
- Client IP: `clientIp(req)` from `@/lib/ratelimit`.
- Dynamic route ctx: `type Ctx = { params: Promise<{ id: string }> }`, then `const { id } = await params;`.
- DB client: `import { prisma } from "@/lib/prisma";`.
- Migrations are **hand-authored** `prisma/migrations/<timestamp>_<name>/migration.sql`; apply locally with `npm run db:migrate` (dev) — but since raw SQL is hand-written, create the folder + `migration.sql` then run `npx prisma migrate deploy` style via `npm run db:deploy` for already-authored SQL. Tests that need the client only require `npx prisma generate` after schema edits.
- Unit tests: `src/lib/<name>.test.ts`, run with `npm test` (vitest). Local Prisma scripts need the PrismaPg adapter ([[local-prisma-scripts-need-adapter]]); the gate/route tests here mock prisma, so no live DB is needed.
- Coach = `User{role:"coach"}` with `User.coachProfile` → `Coach`. `Coach.userId` is the link.

---

## Phase 0 — Spikes (do FIRST; throwaway, not committed to product)

### Task 0a: Prove `pdf-lib` emits a PDF in this runtime

**Files:**
- Create (throwaway): `src/app/api/_spike_pdf/route.ts`

- [ ] **Step 1: Install the library**

Run: `npm install pdf-lib`
Expected: added to `dependencies`, no native build step.

- [ ] **Step 2: Write a one-page PDF route**

```ts
// src/app/api/_spike_pdf/route.ts
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

export async function GET() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 in points
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("GameGround spike PDF — pdf-lib works.", { x: 50, y: 780, size: 14, font });
  const bytes = await doc.save();
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf" },
  });
}
```

- [ ] **Step 3: Verify in the running app**

Run: `npm run dev`, then `curl -sS http://localhost:3000/api/_spike_pdf -o /tmp/spike.pdf && file /tmp/spike.pdf`
Expected: `/tmp/spike.pdf: PDF document, version 1.x`

- [ ] **Step 4: Delete the spike route**

```bash
rm -rf src/app/api/_spike_pdf
```
Keep the `pdf-lib` dependency. Do not commit the spike route.

### Task 0b: Prove server-side Cloudinary raw + authenticated upload + signed delivery

**Files:**
- Create (throwaway): `scripts/_spike_cloudinary.ts`

- [ ] **Step 1: Write a node script that uploads a tiny raw file privately and signs a URL**

```ts
// scripts/_spike_cloudinary.ts
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import crypto from "crypto";
loadEnv({ path: ".env.local", quiet: true });

const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const apiKey = process.env.CLOUDINARY_API_KEY!;
const secret = process.env.CLOUDINARY_API_SECRET!;

async function main() {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `spike_${timestamp}`;
  // Sign: sorted k=v of params (minus file/api_key/cloud_name/resource_type) + secret
  const toSign: Record<string, string> = {
    folder: "gameground/_spike",
    public_id: publicId,
    timestamp: String(timestamp),
    type: "authenticated",
  };
  const signature = crypto.createHash("sha1")
    .update(Object.keys(toSign).sort().map(k => `${k}=${toSign[k]}`).join("&") + secret)
    .digest("hex");

  const form = new FormData();
  form.set("file", new Blob([Buffer.from("hello pdf bytes")], { type: "application/pdf" }), "spike.pdf");
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature);
  form.set("folder", "gameground/_spike");
  form.set("public_id", publicId);
  form.set("type", "authenticated");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, { method: "POST", body: form });
  const json = await res.json();
  console.log("UPLOAD:", res.status, json.public_id, json.type, json.resource_type);

  // Build a signed delivery URL (expires in 1h)
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const toSignUrl = `raw/authenticated/s--/${json.public_id}`; // shape check only
  console.log("public_id to store:", json.public_id, "expires:", expiresAt, toSignUrl.length);
}
main();
```

- [ ] **Step 2: Run it**

Run: `npx tsx scripts/_spike_cloudinary.ts`
Expected: `UPLOAD: 200 gameground/_spike/spike_... authenticated raw`. Confirms server-side raw + authenticated upload works with the existing sha1 signing convention from `src/app/api/upload/route.ts`.

- [ ] **Step 3: Record the delivery decision**

Cloudinary authenticated assets are fetched via a signed delivery URL. The product code (Task 7) will **proxy bytes**: the download route fetches the asset server-side using an `Authorization`-equivalent signed URL and streams it to the client, so the browser never sees a Cloudinary URL. Confirm the stored value we need is `public_id` (+ `resource_type=raw`, `type=authenticated`).

- [ ] **Step 4: Delete the spike script**

```bash
rm scripts/_spike_cloudinary.ts
```

> **Checkpoint:** If either spike fails, STOP and report — the Phase 1 storage/PDF tasks depend on these. `pdf-lib` failing → fall back to `pdfkit`; Cloudinary authenticated upload failing → fall back to storing PDF bytes in a Postgres `bytea` column on `CoachAgreement` and streaming from the download route (no schema redesign needed beyond swapping `pdfPublicId` for `pdfBytes Bytes`).

---

## Phase 1 — Vertical slice (schema → sign → PDF → private storage → gate)

### Task 1: Prisma schema + migration (CoachAgreement, audit log, sequence)

**Files:**
- Modify: `prisma/schema.prisma` (add two models + relation on `Coach`)
- Create: `prisma/migrations/20260615120000_add_coach_agreements/migration.sql`

- [ ] **Step 1: Add models to `prisma/schema.prisma`**

Add a relation field inside `model Coach { ... }` (alongside `batches Batch[]`):
```prisma
  agreements CoachAgreement[]
```

Append these models at the end of the file:
```prisma
model CoachAgreement {
  id               String   @id @default(cuid())
  agreementNumber  String   @unique
  coachId          String
  userId           String
  agreementVersion String
  fullName         String
  email            String
  signatureName    String
  acceptedAt       DateTime @default(now())
  ipAddress        String
  userAgent        String
  pdfPublicId      String
  pdfResourceType  String   @default("raw")
  agreementHash    String
  status           String   @default("SIGNED") // PENDING_SIGNATURE | SIGNED | EXPIRED | SUPERSEDED
  personalSnapshot Json
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  coach    Coach                    @relation(fields: [coachId], references: [id])
  auditLogs CoachAgreementAuditLog[]

  @@index([coachId])
  @@index([agreementNumber])
  @@index([acceptedAt])
}

model CoachAgreementAuditLog {
  id          String   @id @default(cuid())
  agreementId String
  action      String   // VIEW | DOWNLOAD
  actorId     String
  actorRole   String   // coach | admin
  ipAddress   String?
  createdAt   DateTime @default(now())

  agreement CoachAgreement @relation(fields: [agreementId], references: [id], onDelete: Cascade)

  @@index([agreementId])
}
```

- [ ] **Step 2: Hand-author the migration SQL**

```sql
-- prisma/migrations/20260615120000_add_coach_agreements/migration.sql

-- Sequence backing the human-readable agreement number (race-safe).
CREATE SEQUENCE IF NOT EXISTS "coach_agreement_seq" START 1;

-- CreateTable
CREATE TABLE "CoachAgreement" (
    "id" TEXT NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "pdfPublicId" TEXT NOT NULL,
    "pdfResourceType" TEXT NOT NULL DEFAULT 'raw',
    "agreementHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIGNED',
    "personalSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachAgreementAuditLog" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachAgreementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachAgreement_agreementNumber_key" ON "CoachAgreement"("agreementNumber");
CREATE INDEX "CoachAgreement_coachId_idx" ON "CoachAgreement"("coachId");
CREATE INDEX "CoachAgreement_agreementNumber_idx" ON "CoachAgreement"("agreementNumber");
CREATE INDEX "CoachAgreement_acceptedAt_idx" ON "CoachAgreement"("acceptedAt");
CREATE INDEX "CoachAgreementAuditLog_agreementId_idx" ON "CoachAgreementAuditLog"("agreementId");

-- AddForeignKey
ALTER TABLE "CoachAgreement" ADD CONSTRAINT "CoachAgreement_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachAgreementAuditLog" ADD CONSTRAINT "CoachAgreementAuditLog_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CoachAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Generate client + apply migration**

Run: `npx prisma generate && npm run db:deploy`
Expected: `prisma generate` succeeds; migration applies (or is marked applied). If local DB is unavailable, at minimum `npx prisma generate` must succeed so types exist for later tasks.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260615120000_add_coach_agreements package.json package-lock.json
git commit -m "feat(coach-agreement): schema, migration, sequence + pdf-lib dep"
```

---

### Task 2: Versioned, frozen agreement content

**Files:**
- Create: `src/lib/coachAgreement/content.ts`
- Test: `src/lib/coachAgreement/content.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/coachAgreement/content.test.ts
import { describe, it, expect } from "vitest";
import {
  CURRENT_AGREEMENT_VERSION,
  getAgreement,
  agreementPlainText,
  estimatedReadingMinutes,
} from "./content";

describe("coach agreement content", () => {
  it("exposes v1.0 as current", () => {
    expect(CURRENT_AGREEMENT_VERSION).toBe("v1.0");
  });
  it("returns all 13 sections for v1.0", () => {
    const a = getAgreement("v1.0");
    expect(a.sections).toHaveLength(13);
    expect(a.sections[0].heading).toMatch(/Professional Conduct/i);
    expect(a.sections[11].heading).toMatch(/Governing Law/i);
    expect(a.sections[12].heading).toMatch(/Electronic Signature/i);
  });
  it("throws for unknown version", () => {
    expect(() => getAgreement("v9.9")).toThrow();
  });
  it("produces a stable plain-text rendering for hashing", () => {
    expect(agreementPlainText("v1.0")).toBe(agreementPlainText("v1.0"));
    expect(agreementPlainText("v1.0").length).toBeGreaterThan(500);
  });
  it("estimates a positive reading time", () => {
    expect(estimatedReadingMinutes("v1.0")).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npm test -- content`
Expected: FAIL (cannot find `./content`).

- [ ] **Step 3: Implement `content.ts`**

```ts
// src/lib/coachAgreement/content.ts
//
// IMMUTABILITY RULE: once v1.0 has been signed by anyone, NEVER edit the v1.0
// entry below. Ship changes as a new version (v1.1, ...). The hash + "always
// show the accepted version" guarantees depend on this text being frozen.

export type AgreementSection = { heading: string; body: string };
export type Agreement = {
  version: string;
  effectiveDate: string;
  jurisdiction: string;
  sections: AgreementSection[];
};

export const CURRENT_AGREEMENT_VERSION = "v1.0";

const V1_0: Agreement = {
  version: "v1.0",
  effectiveDate: "2026-06-15",
  jurisdiction: "Kozhikode, Kerala, India",
  sections: [
    { heading: "1. Professional Conduct", body:
      "The Coach shall at all times conduct themselves with integrity, courtesy, and professionalism toward players, parents, GameGround staff, and the public. The Coach shall not engage in harassment, discrimination, abusive language, intoxication during sessions, or any conduct that brings GameGround into disrepute." },
    { heading: "2. Coaching Responsibilities", body:
      "The Coach shall deliver coaching services with reasonable skill and care, arrive punctually and prepared, provide age- and skill-appropriate instruction, maintain accurate attendance, and communicate promptly with players regarding scheduling, cancellations, and progress." },
    { heading: "3. Certifications & Qualifications", body:
      "The Coach represents that all certifications, qualifications, and experience provided to GameGround are true and current. The Coach shall maintain the qualifications required for their sport and promptly notify GameGround of any lapse, suspension, or revocation." },
    { heading: "4. Payments & Earnings", body:
      "GameGround shall remit the Coach's earnings, net of the agreed platform service fee and applicable taxes, according to the published payout schedule. The Coach is responsible for their own income-tax obligations. Earnings are calculated from confirmed, completed sessions recorded on the platform." },
    { heading: "5. Cancellations & Refunds", body:
      "The Coach shall honour the cancellation and refund policy published by GameGround. Sessions cancelled by the Coach without adequate notice may be refunded to the player in full, and repeated late cancellations may affect the Coach's standing on the platform." },
    { heading: "6. Safety & Liability", body:
      "The Coach is responsible for maintaining a safe coaching environment, holding any insurance required by law, and reporting injuries or incidents to GameGround without delay. The Coach indemnifies GameGround against claims arising from the Coach's negligence or wilful misconduct, to the extent permitted by law." },
    { heading: "7. Background Verification", body:
      "The Coach consents to identity and background verification, including checks relevant to working with minors where applicable. The Coach shall provide accurate information for these checks and authorises GameGround to conduct them through third-party providers." },
    { heading: "8. Intellectual Property", body:
      "Training materials, drills, and content created by the Coach remain the Coach's property. By uploading content to GameGround, the Coach grants GameGround a non-exclusive, royalty-free licence to host, display, and promote that content in connection with the Coach's profile and the platform." },
    { heading: "9. Data Privacy", body:
      "GameGround processes the Coach's personal data in accordance with its Privacy Policy and applicable Indian data-protection law. The Coach shall handle player personal data confidentially, use it solely for delivering coaching services, and not disclose it to third parties without consent." },
    { heading: "10. Suspension & Termination", body:
      "GameGround may suspend or terminate the Coach's account for breach of this Agreement, policy violations, safety concerns, fraudulent activity, or sustained poor performance. Either party may terminate this Agreement on reasonable notice. Outstanding confirmed earnings remain payable on termination." },
    { heading: "11. Independent Contractor Status", body:
      "The Coach is an independent contractor and not an employee, agent, or partner of GameGround. Nothing in this Agreement creates an employment relationship, and the Coach is not entitled to employee benefits. The Coach controls the manner and means of delivering coaching services." },
    { heading: "12. Governing Law (India)", body:
      "This Agreement is governed by the laws of India. The parties submit to the exclusive jurisdiction of the courts of Kozhikode, Kerala, India for any dispute arising out of or in connection with this Agreement." },
    { heading: "13. Electronic Signature Consent", body:
      "The Coach consents to transact electronically and agrees that typing their full legal name as a signature, together with checking the acceptance boxes, constitutes a legally binding electronic signature under the Information Technology Act, 2000. The Coach agrees that electronic records of this Agreement are admissible and enforceable." },
  ],
};

const REGISTRY: Record<string, Agreement> = { "v1.0": V1_0 };

export function getAgreement(version: string): Agreement {
  const a = REGISTRY[version];
  if (!a) throw new Error(`Unknown agreement version: ${version}`);
  return a;
}

/** Deterministic plain-text rendering — the canonical input for hashing + PDF. */
export function agreementPlainText(version: string): string {
  const a = getAgreement(version);
  const header = `GameGround Coach Partnership Agreement\nVersion: ${a.version}\nEffective: ${a.effectiveDate}\nGoverning law: ${a.jurisdiction}`;
  const body = a.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n");
  return `${header}\n\n${body}`;
}

export function estimatedReadingMinutes(version: string): number {
  const words = agreementPlainText(version).trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200)); // ~200 wpm
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- content`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachAgreement/content.ts src/lib/coachAgreement/content.test.ts
git commit -m "feat(coach-agreement): frozen versioned agreement content (v1.0)"
```

---

### Task 3: Agreement hashing

**Files:**
- Create: `src/lib/coachAgreement/hash.ts`
- Test: `src/lib/coachAgreement/hash.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/coachAgreement/hash.test.ts
import { describe, it, expect } from "vitest";
import { computeAgreementHash } from "./hash";

const base = {
  content: "AGREEMENT TEXT",
  version: "v1.0",
  signatureName: "Asha Rao",
  acceptedAtISO: "2026-06-15T10:00:00.000Z",
};

describe("computeAgreementHash", () => {
  it("is a 64-char hex sha256", () => {
    const h = computeAgreementHash(base);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
  it("is deterministic for identical input", () => {
    expect(computeAgreementHash(base)).toBe(computeAgreementHash(base));
  });
  it("changes when any field changes", () => {
    const h0 = computeAgreementHash(base);
    expect(computeAgreementHash({ ...base, signatureName: "Asha  Rao" })).not.toBe(h0);
    expect(computeAgreementHash({ ...base, version: "v1.1" })).not.toBe(h0);
    expect(computeAgreementHash({ ...base, acceptedAtISO: "2026-06-15T10:00:01.000Z" })).not.toBe(h0);
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- hash`
Expected: FAIL.

- [ ] **Step 3: Implement `hash.ts`**

```ts
// src/lib/coachAgreement/hash.ts
import crypto from "crypto";

export type HashInput = {
  content: string;
  version: string;
  signatureName: string;
  acceptedAtISO: string;
};

/**
 * SHA-256 over the exact accepted content + version + signature + timestamp.
 * Reproducible later for tamper detection. NEVER regenerate after signing.
 */
export function computeAgreementHash(input: HashInput): string {
  const canonical = [input.content, input.version, input.signatureName, input.acceptedAtISO].join("\n--\n");
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- hash`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachAgreement/hash.ts src/lib/coachAgreement/hash.test.ts
git commit -m "feat(coach-agreement): SHA-256 tamper-detection hash"
```

---

### Task 4: Agreement number formatting

**Files:**
- Create: `src/lib/coachAgreement/agreementNumber.ts`
- Test: `src/lib/coachAgreement/agreementNumber.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/coachAgreement/agreementNumber.test.ts
import { describe, it, expect } from "vitest";
import { formatAgreementNumber } from "./agreementNumber";

describe("formatAgreementNumber", () => {
  it("zero-pads to 6 digits with year prefix", () => {
    expect(formatAgreementNumber(2026, 1)).toBe("AGR-2026-000001");
    expect(formatAgreementNumber(2026, 42)).toBe("AGR-2026-000042");
  });
  it("does not truncate numbers beyond 6 digits", () => {
    expect(formatAgreementNumber(2026, 1234567)).toBe("AGR-2026-1234567");
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- agreementNumber`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/coachAgreement/agreementNumber.ts
export function formatAgreementNumber(year: number, seq: number): string {
  return `AGR-${year}-${String(seq).padStart(6, "0")}`;
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- agreementNumber`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachAgreement/agreementNumber.ts src/lib/coachAgreement/agreementNumber.test.ts
git commit -m "feat(coach-agreement): agreement number formatter"
```

---

### Task 5: Signing request validation (Zod + signature match)

**Files:**
- Create: `src/lib/coachAgreement/validation.ts`
- Test: `src/lib/coachAgreement/validation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/coachAgreement/validation.test.ts
import { describe, it, expect } from "vitest";
import { SignAgreementSchema, validateSignature } from "./validation";

const good = {
  fullName: "Asha Rao",
  email: "asha@example.com",
  phone: "9876543210",
  dateOfBirth: "1990-04-01",
  address: "12 MG Road, Kozhikode",
  emergencyContactName: "Ravi Rao",
  emergencyContactNumber: "9876500000",
  signatureName: "Asha Rao",
  signedDate: "2026-06-15",
  confirmAccurate: true,
  agreeAgreement: true,
  consentESign: true,
  understandTermination: true,
};

describe("SignAgreementSchema", () => {
  it("accepts a complete valid payload", () => {
    expect(SignAgreementSchema.safeParse(good).success).toBe(true);
  });
  it("rejects when any checkbox is false", () => {
    expect(SignAgreementSchema.safeParse({ ...good, consentESign: false }).success).toBe(false);
  });
  it("rejects missing personal fields", () => {
    expect(SignAgreementSchema.safeParse({ ...good, address: "" }).success).toBe(false);
  });
});

describe("validateSignature", () => {
  it("matches after trimming whitespace", () => {
    expect(validateSignature("  Asha Rao ", "Asha Rao")).toBe(true);
  });
  it("rejects a mismatch", () => {
    expect(validateSignature("A. Rao", "Asha Rao")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- validation`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/coachAgreement/validation.ts
import { z } from "zod";

const trueLiteral = z.literal(true);

export const SignAgreementSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(6).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  address: z.string().trim().min(4).max(300),
  emergencyContactName: z.string().trim().min(2).max(120),
  emergencyContactNumber: z.string().trim().min(6).max(20),
  signatureName: z.string().trim().min(2).max(120),
  signedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  confirmAccurate: trueLiteral,
  agreeAgreement: trueLiteral,
  consentESign: trueLiteral,
  understandTermination: trueLiteral,
});

export type SignAgreementInput = z.infer<typeof SignAgreementSchema>;

/** Typed signature must exactly match the legal name after trimming. */
export function validateSignature(signature: string, fullName: string): boolean {
  return signature.trim() === fullName.trim();
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- validation`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachAgreement/validation.ts src/lib/coachAgreement/validation.test.ts
git commit -m "feat(coach-agreement): signing payload validation + signature match"
```

---

### Task 6: Server-side gate logic

**Files:**
- Create: `src/lib/coachAgreement/gate.ts`
- Test: `src/lib/coachAgreement/gate.test.ts`

- [ ] **Step 1: Write the failing test (prisma mocked)**

```ts
// src/lib/coachAgreement/gate.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { coachAgreement: { findFirst: (...a: unknown[]) => findFirst(...a) } },
}));

import { hasSignedCurrentAgreement, requireSignedAgreement, AgreementGateError } from "./gate";

beforeEach(() => findFirst.mockReset());

describe("hasSignedCurrentAgreement", () => {
  it("true when a SIGNED current-version row exists for the user", async () => {
    findFirst.mockResolvedValue({ id: "a1" });
    expect(await hasSignedCurrentAgreement("u1")).toBe(true);
  });
  it("false when none", async () => {
    findFirst.mockResolvedValue(null);
    expect(await hasSignedCurrentAgreement("u1")).toBe(false);
  });
});

describe("requireSignedAgreement", () => {
  it("throws AgreementGateError when unsigned", async () => {
    findFirst.mockResolvedValue(null);
    await expect(requireSignedAgreement("u1")).rejects.toBeInstanceOf(AgreementGateError);
  });
  it("resolves when signed", async () => {
    findFirst.mockResolvedValue({ id: "a1" });
    await expect(requireSignedAgreement("u1")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- gate`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/coachAgreement/gate.ts
import { prisma } from "@/lib/prisma";
import { CURRENT_AGREEMENT_VERSION } from "./content";

export class AgreementGateError extends Error {
  status = 403;
  constructor(msg = "You must sign the Coach Partnership Agreement before continuing.") {
    super(msg);
    this.name = "AgreementGateError";
  }
}

export async function hasSignedCurrentAgreement(userId: string): Promise<boolean> {
  const row = await prisma.coachAgreement.findFirst({
    where: { userId, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
    select: { id: true },
  });
  return !!row;
}

/** Throws AgreementGateError if the coach has not signed the current version. */
export async function requireSignedAgreement(userId: string): Promise<void> {
  if (!(await hasSignedCurrentAgreement(userId))) throw new AgreementGateError();
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- gate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coachAgreement/gate.ts src/lib/coachAgreement/gate.test.ts
git commit -m "feat(coach-agreement): server-side signed-agreement gate"
```

---

### Task 7: Cloudinary private PDF storage helper

**Files:**
- Create: `src/lib/coachAgreement/storage.ts`

> No unit test: this is thin I/O glue around `fetch` + crypto, already proven by spike 0b. Verified via the signing route in Task 9 and download route in Task 10.

- [ ] **Step 1: Read the route-handler doc** (per AGENTS.md) before writing, then implement

```ts
// src/lib/coachAgreement/storage.ts
import crypto from "crypto";

const FOLDER = "gameground/coach-agreements";

function cfg() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new Error("Cloudinary is not configured");
  return { cloud, apiKey, secret };
}

function sign(params: Record<string, string>, secret: string): string {
  return crypto.createHash("sha1")
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + secret)
    .digest("hex");
}

/** Upload PDF bytes privately (raw + authenticated). Returns the public_id to store. */
export async function uploadAgreementPdf(bytes: Uint8Array, publicIdBase: string): Promise<string> {
  const { cloud, apiKey, secret } = cfg();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${publicIdBase}_${timestamp}`;
  const toSign = { folder: FOLDER, public_id: publicId, timestamp: String(timestamp), type: "authenticated" };
  const signature = sign(toSign, secret);

  const form = new FormData();
  form.set("file", new Blob([Buffer.from(bytes)], { type: "application/pdf" }), `${publicId}.pdf`);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature);
  form.set("folder", FOLDER);
  form.set("public_id", publicId);
  form.set("type", "authenticated");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  const json = (await res.json()) as { public_id: string };
  return json.public_id;
}

/** Build a short-lived signed delivery URL for a private raw asset. */
export function signedAgreementUrl(publicId: string, ttlSeconds = 300): string {
  const { cloud, apiKey, secret } = cfg();
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  // URL signature per Cloudinary: sha1 of "public_id" delivery params + secret, then api_key + expiry.
  const toSign = { public_id: publicId, timestamp: String(expiresAt), type: "authenticated" };
  const signature = sign(toSign, secret);
  const q = new URLSearchParams({ api_key: apiKey, timestamp: String(expiresAt), signature });
  return `https://res.cloudinary.com/${cloud}/raw/authenticated/${publicId}?${q.toString()}`;
}

/** Fetch the private PDF bytes server-side (used by the proxy download route). */
export async function fetchAgreementPdf(publicId: string): Promise<Buffer> {
  const res = await fetch(signedAgreementUrl(publicId), { cache: "no-store" });
  if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
```

> Implementation note: Cloudinary's exact signed-URL scheme for authenticated raw delivery can vary by account settings. During Task 10 verification, if `fetchAgreementPdf` 401s, switch to Cloudinary's `private_download_url` Admin API (sign `public_id`+`format`+`type`+`timestamp`) — keep the same `fetchAgreementPdf`/`signedAgreementUrl` signatures so callers don't change. This is the one spot allowed to adapt at implementation time; the spikes (0b) de-risked the upload half.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `storage.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/coachAgreement/storage.ts
git commit -m "feat(coach-agreement): private Cloudinary PDF upload + signed fetch"
```

---

### Task 8: PDF generation

**Files:**
- Create: `src/lib/coachAgreement/pdf.ts`

> No unit test (binary output + layout). Verified end-to-end in Task 9/10.

- [ ] **Step 1: Implement `pdf.ts`**

```ts
// src/lib/coachAgreement/pdf.ts
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getAgreement } from "./content";

export type PdfData = {
  agreementNumber: string;
  version: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  signatureName: string;
  acceptedAtISO: string;
  ipAddress: string;
  userAgent: string;
  agreementHash: string;
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const RED = rgb(0.902, 0.224, 0.275); // #e63946

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateAgreementPdf(data: PdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const agreement = getAgreement(data.version);
  const contentWidth = A4[0] - MARGIN * 2;

  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - MARGIN;

  const ensure = (need: number) => {
    if (y - need < MARGIN) {
      page = doc.addPage(A4);
      y = A4[1] - MARGIN;
    }
  };
  const draw = (text: string, f: PDFFont, size: number, color = rgb(0.1, 0.1, 0.1)) => {
    for (const ln of wrap(text, f, size, contentWidth)) {
      ensure(size + 4);
      page.drawText(ln, { x: MARGIN, y, size, font: f, color });
      y -= size + 4;
    }
  };
  const gap = (h: number) => { y -= h; };

  // Branding header
  page.drawRectangle({ x: 0, y: A4[1] - 40, width: A4[0], height: 40, color: RED });
  page.drawText("GAME GROUND", { x: MARGIN, y: A4[1] - 27, size: 14, font: bold, color: rgb(1, 1, 1) });
  y = A4[1] - 64;

  draw("Coach Partnership Agreement", bold, 18);
  gap(4);
  draw(`Agreement Number: ${data.agreementNumber}   ·   Version: ${data.version}`, font, 10);
  draw(`Effective: ${agreement.effectiveDate}   ·   Governing law: ${agreement.jurisdiction}`, font, 10);
  gap(10);

  // Coach details block
  draw("Coach Details", bold, 12);
  gap(2);
  const details: [string, string][] = [
    ["Full legal name", data.fullName],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Date of birth", data.dateOfBirth],
    ["Address", data.address],
    ["Emergency contact", `${data.emergencyContactName} (${data.emergencyContactNumber})`],
  ];
  for (const [k, v] of details) draw(`${k}: ${v}`, font, 10);
  gap(10);

  // Agreement sections
  for (const s of agreement.sections) {
    gap(4);
    draw(s.heading, bold, 12);
    draw(s.body, font, 10);
  }
  gap(12);

  // Signature + audit block
  draw("Electronic Signature", bold, 12);
  draw(`Signed by (typed signature): ${data.signatureName}`, font, 10);
  draw(`Accepted at: ${data.acceptedAtISO}`, font, 10);
  draw(`IP address: ${data.ipAddress}`, font, 10);
  draw(`User agent: ${data.userAgent}`, font, 9);
  gap(6);
  draw(`Integrity hash (SHA-256): ${data.agreementHash}`, font, 8, rgb(0.4, 0.4, 0.4));

  return doc.save();
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/coachAgreement/pdf.ts
git commit -m "feat(coach-agreement): pdf-lib agreement document generation"
```

---

### Task 9: Signing API route (create agreement)

**Files:**
- Create: `src/app/api/coach/agreements/route.ts`

- [ ] **Step 1: Read the route-handler doc** (per AGENTS.md), then implement `POST` (+ `GET` status)

```ts
// src/app/api/coach/agreements/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { clientIp } from "@/lib/ratelimit";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { CURRENT_AGREEMENT_VERSION, agreementPlainText } from "@/lib/coachAgreement/content";
import { SignAgreementSchema, validateSignature } from "@/lib/coachAgreement/validation";
import { formatAgreementNumber } from "@/lib/coachAgreement/agreementNumber";
import { computeAgreementHash } from "@/lib/coachAgreement/hash";
import { generateAgreementPdf } from "@/lib/coachAgreement/pdf";
import { uploadAgreementPdf } from "@/lib/coachAgreement/storage";

export const runtime = "nodejs";

// GET: current signing status for the logged-in coach.
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "coach") return fail("Coach authentication required", 401);
    const existing = await prisma.coachAgreement.findFirst({
      where: { userId: session.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      orderBy: { acceptedAt: "desc" },
      select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true, status: true },
    });
    return ok({ signed: !!existing, currentVersion: CURRENT_AGREEMENT_VERSION, agreement: existing });
  } catch (e) { return handleErr(e); }
}

// POST: sign the current agreement.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "coach") return fail("Coach authentication required", 401);

    const coach = await prisma.coach.findUnique({ where: { userId: session.id }, select: { id: true } });
    if (!coach) throw new ApiError("No coach profile is linked to this account.", 400);

    const already = await prisma.coachAgreement.findFirst({
      where: { userId: session.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      select: { id: true, agreementNumber: true },
    });
    if (already) return ok({ alreadySigned: true, agreementNumber: already.agreementNumber });

    const input = SignAgreementSchema.parse(await req.json());
    if (!validateSignature(input.signatureName, input.fullName)) {
      throw new ApiError("Signature must exactly match your full legal name.", 422);
    }

    const acceptedAt = new Date();
    const acceptedAtISO = acceptedAt.toISOString();
    const ipAddress = clientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const version = CURRENT_AGREEMENT_VERSION;
    const content = agreementPlainText(version);
    const agreementHash = computeAgreementHash({ content, version, signatureName: input.signatureName, acceptedAtISO });

    // Reserve a race-safe sequential number.
    const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('coach_agreement_seq') AS nextval`;
    const agreementNumber = formatAgreementNumber(acceptedAt.getUTCFullYear(), Number(nextval));

    const pdfBytes = await generateAgreementPdf({
      agreementNumber, version,
      fullName: input.fullName, email: input.email, phone: input.phone,
      dateOfBirth: input.dateOfBirth, address: input.address,
      emergencyContactName: input.emergencyContactName, emergencyContactNumber: input.emergencyContactNumber,
      signatureName: input.signatureName, acceptedAtISO, ipAddress, userAgent, agreementHash,
    });
    const pdfPublicId = await uploadAgreementPdf(pdfBytes, `${coach.id}_${version}`);

    const record = await prisma.coachAgreement.create({
      data: {
        agreementNumber, coachId: coach.id, userId: session.id, agreementVersion: version,
        fullName: input.fullName, email: input.email, signatureName: input.signatureName,
        acceptedAt, ipAddress, userAgent, pdfPublicId, pdfResourceType: "raw",
        agreementHash, status: "SIGNED",
        personalSnapshot: {
          phone: input.phone, dateOfBirth: input.dateOfBirth, address: input.address,
          emergencyContactName: input.emergencyContactName, emergencyContactNumber: input.emergencyContactNumber,
          signedDate: input.signedDate,
        },
      },
      select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true },
    });

    return ok({ agreement: record }, 201);
  } catch (e) { return handleErr(e); }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Manual verify (dev)**

Note: authed routes 500 locally if Upstash isn't configured ([[local-upstash-placeholder-500s]]); these routes don't call the limiter, but if blocked, verify via the UI in Task 11. With a coach session cookie, POST a valid body and confirm a `201` + agreement number; POST again → `{alreadySigned:true}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/coach/agreements/route.ts
git commit -m "feat(coach-agreement): signing API route (create + status)"
```

---

### Task 10: PDF download route with ownership/admin check + audit

**Files:**
- Create: `src/app/api/coach/agreements/[id]/pdf/route.ts`

- [ ] **Step 1: Implement (read dynamic-routes doc first)**

```ts
// src/app/api/coach/agreements/[id]/pdf/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { clientIp } from "@/lib/ratelimit";
import { fail, handleErr } from "@/lib/api";
import { fetchAgreementPdf } from "@/lib/coachAgreement/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const isAdmin = await getAdminSessionFromRequest(req);
    const session = await getSessionFromRequest(req);

    const agreement = await prisma.coachAgreement.findUnique({
      where: { id },
      select: { id: true, userId: true, agreementNumber: true, pdfPublicId: true },
    });
    if (!agreement) return fail("Agreement not found", 404);

    const isOwner = !!session && session.id === agreement.userId;
    if (!isAdmin && !isOwner) return fail("You are not allowed to access this document", 403);

    await prisma.coachAgreementAuditLog.create({
      data: {
        agreementId: agreement.id, action: "DOWNLOAD",
        actorId: isAdmin ? "admin" : session!.id, actorRole: isAdmin ? "admin" : "coach",
        ipAddress: clientIp(req),
      },
    });

    const bytes = await fetchAgreementPdf(agreement.pdfPublicId);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${agreement.agreementNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) { return handleErr(e); }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Manual verify**

After signing in Task 11, hit `/api/coach/agreements/<id>/pdf` as the owner → PDF downloads; as a different user → 403; confirm a `CoachAgreementAuditLog` DOWNLOAD row exists. If Cloudinary fetch 401s, apply the `private_download_url` fallback noted in Task 7.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/coach/agreements/[id]/pdf/route.ts"
git commit -m "feat(coach-agreement): authenticated PDF download + audit log"
```

---

### Task 11: `/onboarding-terms` signing page (UI)

**Files:**
- Create: `src/app/onboarding-terms/page.tsx`

> Styling note: this page intentionally diverges from the dark app theme to a **white premium legal-document** look. Follow the inline-style conventions used across the app (see `src/app/coach/dashboard/page.tsx`), but with `background:#fff`, dark text, and the `#e63946` brand accent. Mobile responsive via `maxWidth` + `clamp()`.

- [ ] **Step 1: Implement the page**

Key behaviors (full component):
```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAgreement, CURRENT_AGREEMENT_VERSION, estimatedReadingMinutes } from "@/lib/coachAgreement/content";

export default function OnboardingTermsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const agreement = useMemo(() => getAgreement(CURRENT_AGREEMENT_VERSION), []);
  const readMins = useMemo(() => estimatedReadingMinutes(CURRENT_AGREEMENT_VERSION), []);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", dateOfBirth: "", address: "",
    emergencyContactName: "", emergencyContactNumber: "",
    signatureName: "", signedDate: new Date().toISOString().slice(0, 10),
  });
  const [checks, setChecks] = useState({ confirmAccurate: false, agreeAgreement: false, consentESign: false, understandTermination: false });
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ agreementNumber: string; id: string; acceptedAt: string } | null>(null);

  // Redirect non-coaches; prefill from session + coach profile; skip if already signed.
  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "coach") { router.push("/login"); return; }
    fetch("/api/coach/agreements").then(r => r.json()).then(d => {
      if (d?.data?.signed) { router.push("/coach/dashboard"); return; }
    });
    setForm(f => ({ ...f, fullName: user.name ?? "", email: user.email ?? "" }));
    fetch(`/api/coaches/by-user`) // existing endpoint or fallback; see Step 2 note
      .then(r => r.ok ? r.json() : null).then(d => {
        const c = d?.data ?? d?.coach;
        if (c) setForm(f => ({ ...f, phone: c.phone ?? f.phone, address: c.address ?? f.address }));
      }).catch(() => {});
  }, [user, loading, router]);

  // Reading progress on scroll of the agreement panel.
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const pct = Math.min(100, Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100));
    setProgress(Number.isFinite(pct) ? pct : 0);
  };

  const allChecked = Object.values(checks).every(Boolean);
  const sigMatches = form.signatureName.trim().length > 0 && form.signatureName.trim() === form.fullName.trim();
  const canSubmit = allChecked && sigMatches && !submitting &&
    Object.values(form).every(v => String(v).trim().length > 0);

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/coach/agreements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...checks }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) { setError(json.error ?? "Submission failed"); return; }
      const a = json.data.agreement ?? json.data;
      setDone({ agreementNumber: a.agreementNumber, id: a.id, acceptedAt: a.acceptedAt });
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  if (done) {
    return (
      <main style={{ minHeight: "100vh", background: "#fff", color: "#111", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>Agreement Successfully Signed</h1>
          <p style={{ color: "#555", marginTop: 8 }}>Agreement Number: <strong>{done.agreementNumber}</strong></p>
          <p style={{ color: "#555" }}>Version: {CURRENT_AGREEMENT_VERSION}</p>
          <p style={{ color: "#555" }}>Date Signed: {new Date(done.acceptedAt).toLocaleDateString()}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <a href={`/api/coach/agreements/${done.id}/pdf`} style={btnPrimary}>Download PDF</a>
            <button onClick={() => router.push("/coach/dashboard")} style={btnGhost}>Continue Onboarding</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: "#111" }}>
      {/* Sticky progress + reading time */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #eee", padding: "12px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 820, margin: "0 auto" }}>
          <strong style={{ color: "#e63946" }}>GAME GROUND</strong>
          <span style={{ fontSize: 13, color: "#666" }}>~{readMins} min read · {progress}% read</span>
        </div>
        <div style={{ height: 3, background: "#eee", marginTop: 8, maxWidth: 820, marginInline: "auto" }}>
          <div style={{ height: 3, width: `${progress}%`, background: "#e63946" }} />
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Coach Partnership Agreement</h1>
        <p style={{ color: "#666" }}>Version {agreement.version} · Effective {agreement.effectiveDate} · {agreement.jurisdiction}</p>

        {/* Coach information form */}
        <section style={card}>
          <h2 style={h2}>Your Information</h2>
          {([
            ["fullName", "Full Legal Name", "text"], ["email", "Email Address", "email"],
            ["phone", "Phone Number", "tel"], ["dateOfBirth", "Date of Birth", "date"],
            ["address", "Address", "text"], ["emergencyContactName", "Emergency Contact Name", "text"],
            ["emergencyContactNumber", "Emergency Contact Number", "tel"],
          ] as const).map(([key, label, type]) => (
            <label key={key} style={{ display: "block", marginBottom: 12 }}>
              <span style={lbl}>{label}</span>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={input} />
            </label>
          ))}
        </section>

        {/* Scrollable agreement */}
        <section style={card}>
          <h2 style={h2}>Agreement</h2>
          <div onScroll={onScroll} style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            {agreement.sections.map(s => (
              <div key={s.heading} style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{s.heading}</h3>
                <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mandatory checkboxes */}
        <section style={card}>
          {([
            ["confirmAccurate", "I confirm all information provided is accurate."],
            ["agreeAgreement", "I have read and agree to the Coach Partnership Agreement."],
            ["consentESign", "I consent to electronic signatures and records."],
            ["understandTermination", "I understand GameGround may suspend or terminate my account for policy violations."],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, fontSize: 14 }}>
              <input type="checkbox" checked={checks[key]} onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))} />
              <span>{label}</span>
            </label>
          ))}
        </section>

        {/* Signature */}
        <section style={card}>
          <h2 style={h2}>Digital Signature</h2>
          <p style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>
            By typing your name below, you are providing a legally binding electronic signature.
          </p>
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={lbl}>Digital Signature (type your full legal name)</span>
            <input value={form.signatureName} onChange={e => setForm(f => ({ ...f, signatureName: e.target.value }))} style={input} />
          </label>
          {form.signatureName.trim() && !sigMatches && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>Signature must exactly match your full legal name.</p>
          )}
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={lbl}>Date</span>
            <input type="date" value={form.signedDate} onChange={e => setForm(f => ({ ...f, signedDate: e.target.value }))} style={input} />
          </label>
        </section>

        {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
        <button disabled={!canSubmit} onClick={submit} style={{ ...btnPrimary, width: "100%", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {submitting ? "Submitting…" : "Accept Agreement & Continue"}
        </button>
      </div>
    </main>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20, marginTop: 18 };
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginBottom: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: 13, color: "#444", marginBottom: 4, fontWeight: 600 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: "#e63946", color: "#fff", padding: "12px 18px", borderRadius: 9, fontWeight: 700, border: "none", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { background: "#fff", color: "#111", padding: "12px 18px", borderRadius: 9, fontWeight: 700, border: "1px solid #ddd", cursor: "pointer" };
```

- [ ] **Step 2: Resolve the prefill endpoint**

The prefill uses `/api/coaches/by-user`. Check whether such an endpoint exists (`grep -rn "by-user" src/app/api`). If not, either (a) add a tiny `GET /api/coach/profile` returning the logged-in coach's `phone`/`address`, or (b) drop the optional profile-prefill `fetch` (name+email from session already prefill). Choose the smallest change; do not block on it.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: page compiles. Per [[local-upstash-placeholder-500s]], if you need to exercise the authed UI locally, intercept `/api/coach/agreements` in Playwright; otherwise verify the rendered form + disabled-submit logic.

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding-terms/page.tsx
git commit -m "feat(coach-agreement): /onboarding-terms signing page + success state"
```

---

### Task 12: Client gate redirect (UX layer)

**Files:**
- Modify: `src/app/coach/dashboard/page.tsx`
- Modify: `src/app/coach/profile/edit/page.tsx`
- Modify: `src/app/coach/dashboard/bookings/page.tsx`

- [ ] **Step 1: Add an unsigned-agreement redirect to each coach page's guard effect**

In each file, find the existing guard:
```tsx
useEffect(() => {
  if (!loading && (!user || user.role !== "coach")) router.push("/login");
}, [user, loading, router]);
```
Add, immediately after it, a second effect:
```tsx
useEffect(() => {
  if (loading || !user || user.role !== "coach") return;
  fetch("/api/coach/agreements")
    .then(r => r.json())
    .then(d => { if (d?.data && d.data.signed === false) router.push("/onboarding-terms"); })
    .catch(() => {});
}, [user, loading, router]);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/coach/dashboard/page.tsx src/app/coach/profile/edit/page.tsx src/app/coach/dashboard/bookings/page.tsx
git commit -m "feat(coach-agreement): redirect unsigned coaches to onboarding-terms"
```

---

### Task 13: Server gate enforcement on coach mutation surfaces

**Files:**
- Modify: coach-owned mutation routes (identify via grep below)

- [ ] **Step 1: Identify coach mutation surfaces**

Run: `grep -rln "role.*coach\|coachId\|approve\|reject" src/app/api | grep -iE "booking|coach|batch"`
Target the surfaces from the spec: **accept/approve bookings**, **create/edit coach profile (publish)**, **create sessions/batches**. For each route that performs a coach-initiated mutation, enforce the gate.

- [ ] **Step 2: Enforce the gate in each identified mutation route**

Pattern to insert after the coach session is established (where `session.id` is the coach user id), before the mutation:
```ts
import { requireSignedAgreement, AgreementGateError } from "@/lib/coachAgreement/gate";
// ...
await requireSignedAgreement(session.id);
```
And ensure the route's `catch` surfaces it (the `handleErr` helper returns 500 for unknown errors, so map it explicitly):
```ts
} catch (e) {
  if (e instanceof AgreementGateError) return fail(e.message, e.status);
  return handleErr(e);
}
```
For booking approval that runs through the admin/coach booking service, add the same check at the coach-initiated entry point only (admin-initiated actions are exempt).

- [ ] **Step 3: Add a focused test for one enforced route's gate wiring**

Where a coach mutation route is pure-enough to unit test its guard, add a test asserting it rejects when `hasSignedCurrentAgreement` is false. If routes aren't unit-testable here, rely on the `gate.test.ts` coverage (Task 6) plus a manual check: as an unsigned coach, attempt to approve a booking → expect 403 with the gate message.

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: pass + clean build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(coach-agreement): enforce signed-agreement gate on coach mutations"
```

> **PHASE 1 CHECKPOINT — stop and review with the user before Phase 2.**
> Demonstrable: a coach with no agreement is redirected to `/onboarding-terms`, can sign, gets an agreement number + downloadable private PDF, and is then able to act; an unsigned coach is blocked server-side.

---

## Phase 2 — Admin + coach surfaces

### Task 14: Admin agreements list (API + page)

**Files:**
- Create: `src/app/api/admin/coaches/agreements/route.ts`
- Create: `src/app/admin/coaches/agreements/page.tsx`

- [ ] **Step 1: Implement the list API (admin-guarded, filtered, searchable)**

```ts
// src/app/api/admin/coaches/agreements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const version = sp.get("version")?.trim();
  const status = sp.get("status")?.trim();
  const from = sp.get("from"); const to = sp.get("to");

  const where: Record<string, unknown> = {};
  if (version) where.agreementVersion = version;
  if (status) where.status = status;
  if (from || to) where.acceptedAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) };
  if (q) where.OR = [
    { fullName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { agreementNumber: { contains: q, mode: "insensitive" } },
  ];

  const rows = await prisma.coachAgreement.findMany({
    where, orderBy: { acceptedAt: "desc" },
    select: { id: true, agreementNumber: true, fullName: true, email: true, agreementVersion: true, acceptedAt: true, status: true },
  });
  return NextResponse.json({ agreements: rows });
}
```

- [ ] **Step 2: Implement the admin list page**

Follow the existing admin page pattern in `src/app/admin/coaches/page.tsx` (dark theme, admin nav/tabs). Render a table with columns: Agreement Number, Coach Name, Email, Version, Signed Date, Status (color badge — see Task 19's `AgreementStatusBadge`), and per-row **View** (`/admin/coaches/agreements/[id]`) + **Download PDF** (`/api/coach/agreements/[id]/pdf`) actions. Add filter controls (date range, version `<select>`, status `<select>`) and a search box bound to `q`, wired to refetch with query params. Use `useQuery` (TanStack) as other admin pages do.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/coaches/agreements/route.ts" "src/app/admin/coaches/agreements/page.tsx"
git commit -m "feat(coach-agreement): admin agreements list (api + page)"
```

---

### Task 15: Admin agreement detail (API + page)

**Files:**
- Create: `src/app/api/admin/coaches/agreements/[id]/route.ts`
- Create: `src/app/admin/coaches/agreements/[id]/page.tsx`

- [ ] **Step 1: Implement the detail API (returns the accepted-version content)**

```ts
// src/app/api/admin/coaches/agreements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAgreement } from "@/lib/coachAgreement/content";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const a = await prisma.coachAgreement.findUnique({ where: { id } });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Always render the EXACT accepted version, never the latest.
  let content = null;
  try { content = getAgreement(a.agreementVersion); } catch { content = null; }
  return NextResponse.json({ agreement: a, content });
}
```

- [ ] **Step 2: Implement the detail page**

Following the admin theme, show: Agreement Number, Coach Information (name, email, + `personalSnapshot` fields), Version, Signed Date, IP Address, User Agent, Agreement Hash; **Download PDF** + **View Agreement** buttons; and render the **accepted version's** sections from the `content` payload (fallback message if that version is no longer in the registry). Never substitute the latest version.

- [ ] **Step 3: Verify build + commit**

Run: `npm run build`
```bash
git add "src/app/api/admin/coaches/agreements/[id]/route.ts" "src/app/admin/coaches/agreements/[id]/page.tsx"
git commit -m "feat(coach-agreement): admin agreement detail (accepted version)"
```

---

### Task 16: Coach dashboard "Legal Documents" card

**Files:**
- Modify: `src/app/coach/dashboard/page.tsx`

- [ ] **Step 1: Fetch agreement status and render a Legal Documents card**

Add a `useQuery` for `/api/coach/agreements`, then render a card (matching the dark dashboard cards) titled "Legal Documents" showing: Coach Agreement · Status badge (Signed) · Version · Signed Date · **View Agreement** (links to a coach-facing view — reuse the success-style page or link to the PDF) · **Download PDF** (`/api/coach/agreements/<id>/pdf`). If `signed === false`, show a "Sign now" link to `/onboarding-terms` instead.

- [ ] **Step 2: Verify build + commit**

Run: `npm run build`
```bash
git add src/app/coach/dashboard/page.tsx
git commit -m "feat(coach-agreement): coach dashboard legal documents card"
```

> **PHASE 2 CHECKPOINT — optional review.**

---

## Phase 3 — Email, audit completeness, status badges

### Task 17: Email signed PDF to coach (Resend attachments)

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/coach/agreements/route.ts` (send after create)

- [ ] **Step 1: Extend `sendEmail` to support attachments**

In `src/lib/email.ts`, widen `EmailPayload`:
```ts
interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[]; // content = base64
}
```
And include them in the Resend body when present:
```ts
body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html,
  ...(payload.attachments ? { attachments: payload.attachments } : {}) }),
```

- [ ] **Step 2: Add the agreement-signed email template to `emails`**

```ts
agreementSigned: (name: string, agreementNumber: string, version: string, signedDate: string, pdfUrl: string) => ({
  subject: "GameGround Coach Agreement Successfully Signed",
  html: `${brand}<div style="padding:28px">
    <h2 style="color:#fff;margin:0 0 12px">Agreement Signed ✓</h2>
    <p style="color:#9ca3af">Thank you, ${name}. Your Coach Partnership Agreement is now on file.</p>
    <p style="color:#9ca3af">Agreement Number: <strong style="color:#fff">${agreementNumber}</strong><br/>
       Version: ${version}<br/>Signed: ${signedDate}</p>
    <a href="${pdfUrl}" style="display:inline-block;margin-top:16px;background:#e63946;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Download PDF</a>
  </div>${footer}`,
}),
```

- [ ] **Step 3: Send the email after a successful create (Task 9 route)**

After `prisma.coachAgreement.create(...)` in `POST`, before returning, add (non-fatal):
```ts
import { sendEmail, emails } from "@/lib/email";
// ...
const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/coach/agreements/${record.id}/pdf`;
await sendEmail({
  to: input.email,
  ...emails.agreementSigned(input.fullName, agreementNumber, version, input.signedDate, pdfUrl),
  attachments: [{ filename: `${agreementNumber}.pdf`, content: pdfBase64 }],
}).catch(() => {});
```
(Reuse the `pdfBytes` already generated — do not re-fetch from Cloudinary.)

- [ ] **Step 4: Verify build + commit**

Run: `npm run build`
Expected: clean. Without `RESEND_API_KEY`, `sendEmail` logs and no-ops ([[local-upstash-placeholder-500s]] context: dev no-op is expected).
```bash
git add src/lib/email.ts src/app/api/coach/agreements/route.ts
git commit -m "feat(coach-agreement): email signed PDF to coach"
```

---

### Task 18: Audit VIEW logging + admin audit visibility

**Files:**
- Modify: `src/app/api/admin/coaches/agreements/[id]/route.ts` (log admin VIEW)
- Modify: `src/app/api/coach/agreements/[id]/pdf/route.ts` (already logs DOWNLOAD — confirm)
- Optionally Create: a small audit list within the admin detail page

- [ ] **Step 1: Log a VIEW on the admin detail API**

In the admin detail `GET`, after loading the agreement, write:
```ts
import { clientIp } from "@/lib/ratelimit";
// ...
await prisma.coachAgreementAuditLog.create({
  data: { agreementId: a.id, action: "VIEW", actorId: "admin", actorRole: "admin", ipAddress: clientIp(req) },
});
```

- [ ] **Step 2: Surface recent audit entries on the admin detail page**

Extend the detail API to also return the latest ~20 `auditLogs` (`orderBy createdAt desc`) and render them in a small "Access Log" table (action, actor role, date) on the detail page.

- [ ] **Step 3: Verify build + commit**

Run: `npm run build`
```bash
git add -A
git commit -m "feat(coach-agreement): audit view logging + admin access log"
```

---

### Task 19: Status badges + expiry/superseded handling

**Files:**
- Create: `src/components/coachAgreement/AgreementStatusBadge.tsx`
- Modify: admin list/detail pages + coach dashboard card to use it

- [ ] **Step 1: Implement the color-coded badge**

```tsx
// src/components/coachAgreement/AgreementStatusBadge.tsx
const MAP: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING_SIGNATURE: { label: "Pending Signature", bg: "#fef9c3", fg: "#854d0e" },
  SIGNED:            { label: "Signed",            bg: "#dcfce7", fg: "#166534" },
  EXPIRED:           { label: "Expired",           bg: "#fee2e2", fg: "#991b1b" },
  SUPERSEDED:        { label: "Superseded",        bg: "#e5e7eb", fg: "#374151" },
};

export function AgreementStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.PENDING_SIGNATURE;
  return (
    <span style={{ background: s.bg, color: s.fg, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2: Use the badge in admin list, admin detail, and coach dashboard card**

Replace inline status text with `<AgreementStatusBadge status={...} />` in the three surfaces.

- [ ] **Step 3: Add a superseding rule (future-version support)**

Document + implement: when a new version ships and a coach signs it, the create route should mark the coach's prior `SIGNED` rows for older versions as `SUPERSEDED`. Add, inside the Task 9 `POST` transaction-ish flow (after create), a guarded update:
```ts
await prisma.coachAgreement.updateMany({
  where: { userId: session.id, status: "SIGNED", agreementVersion: { not: version } },
  data: { status: "SUPERSEDED" },
});
```
(No-op today since only v1.0 exists; correct when v1.1 lands.)

- [ ] **Step 4: Verify build + commit**

Run: `npm run build && npm test`
```bash
git add -A
git commit -m "feat(coach-agreement): status badges + supersede-on-new-version"
```

> **PHASE 3 CHECKPOINT — final review.** Run the full suite (`npm test`) and a production build (`npm run build`) before declaring done.

---

## Self-review — spec coverage map

- New `/onboarding-terms` page, blocks progress → Task 11 (UI) + Task 12 (client redirect) + Task 13 (server gate).
- Premium white legal look, sticky progress, reading time, scrollable agreement, branding, responsive → Task 11.
- Coach info section (7 fields), prefill → Task 11 + Task 5 (validation).
- 13 versioned legal sections, v1.0, future-version support → Task 2 (+ Task 19 supersede).
- 4 mandatory checkboxes, submit disabled until all checked → Task 5 (schema) + Task 11 (UI).
- Digital signature, trim-match, blocked on mismatch, warning copy → Task 5 + Task 9 (server) + Task 11 (UI).
- Submission: agreement number (sequence), capture coachId/version/timestamp/signature/name/email/IP/UA, PDF snapshot, upload, save, email, redirect → Tasks 1, 4, 7, 8, 9, 17.
- DB table `coach_agreements` with listed fields + indexes → Task 1 (`CoachAgreement`).
- SHA-256 hash over content+version+signature+timestamp, stored, never regenerated → Task 3 + Task 9.
- Admin → Coaches → Agreements list (columns, actions, filters, search) → Task 14.
- Admin detail page `/admin/coaches/agreements/[id]` (fields, buttons, accepted version) → Task 15.
- Coach dashboard → Legal Documents (status, version, date, view/download) → Task 16.
- Email automation (subject, content, download button, attached PDF) → Task 17.
- Security: PDFs require auth, coach-own-only, admin-all, audit every view/download, immutable, no edit → Tasks 10, 13, 18 (+ no update endpoints by design).
- Onboarding blocker (publish/accept/create/active until SIGNED; redirect if missing) → Task 12 + Task 13.
- UI status indicators (4 statuses, color badges) → Task 19.
- Success page (✓, number, version, date, download, continue) → Task 11 (`done` state).
- Quality: TS types, prisma schema/migration, API routes, error/loading/success states, audit, responsive, clean modules → throughout; pure logic isolated + TDD in `src/lib/coachAgreement/`.

**Placeholder scan:** none — every code step contains concrete content. Two explicitly-bounded adaptation points are flagged (Cloudinary signed-delivery fallback in Task 7; prefill endpoint resolution in Task 11) with exact fallback instructions.

**Type consistency:** `getAgreement`/`agreementPlainText`/`CURRENT_AGREEMENT_VERSION` (Task 2), `computeAgreementHash`/`HashInput` (Task 3), `formatAgreementNumber` (Task 4), `SignAgreementSchema`/`validateSignature` (Task 5), `hasSignedCurrentAgreement`/`requireSignedAgreement`/`AgreementGateError` (Task 6), `uploadAgreementPdf`/`fetchAgreementPdf`/`signedAgreementUrl` (Task 7), `generateAgreementPdf`/`PdfData` (Task 8) — names used consistently across Tasks 9, 10, 13, 17.
