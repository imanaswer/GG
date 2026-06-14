# Guided hosting flow (create-game stepper)

**Date:** 2026-06-14
**Scope:** Redesign `/create-game` (`src/app/create-game/page.tsx`) from a single long
scroll into a guided 3-step wizard, plus the streamlining wins that make hosting
genuinely easier.

## Goal

Make hosting a pickup game faster and harder to get lost in — one decision at a
time, with progress always visible — while removing two long-standing friction
points (fragile cost entry, manual title).

## Constraints

- **Pure client-side restructure.** The create POST payload stays **identical**:
  `{ sport, title, slotId, slots, skillLevel, cost, costAmount, description }`.
  No changes to the create mutation (`useCreateGame`) or `POST /api/games`.
- **One small read-only backend addition** (approved): venues GET returns an
  `openSlots` count per venue.
- Reuse existing pieces: `SlotPicker`, `PillSelect`, `SectionCard`, `FieldRow`,
  the sport→venue→slot cascade, and the `slotAvailability` helper in `@/lib/venues`.
- Per AGENTS.md: before writing code, confirm the modified Next version's docs in
  `node_modules/next/dist/docs/` don't change anything we touch (this is a client
  component refactor with no new Next APIs, so the risk is low — but verify).

## Steps

### Step 1 — What & where
- **Sport** (pills) → **Skill level** (pills) → **Venue** (cards).
- Each venue card shows an **availability hint** driven by `openSlots`:
  `"{n} open slots"` when `n > 0`, or a muted `"No open slots yet"` when `n === 0`.
  Venues with zero open slots render de-emphasized so hosts avoid the dead-end.
- **Cascade-clear, preserved across back-navigation:** changing sport clears
  `venueId` + `slotId`; changing venue clears `slotId`. (Matches today's
  `selectSport` / `selectVenue`.)
- **Next** enabled only when `sport && skillLevel && venueId` are set.

### Step 2 — When
- Existing day-grouped `SlotPicker` for the chosen venue (slots from
  `/api/venues/{venueId}/slots?all=1`).
- **No-slots empty state is a real action:** a **"← Pick a different venue"**
  button that returns to step 1 (not "scroll up"). A normal **Back** button is
  also present.
- **Next** enabled when `slotId` is set.

### Step 3 — Details & publish
- **Max players** — number input (min 2, max 100), required.
- **Cost** — a **Free / Paid toggle**. Default Free (`cost = "Free"`,
  `costAmount = 0`). Selecting Paid reveals a ₹ amount input; the amount maps to
  `costAmount` (integer) and `cost` renders as the formatted label (e.g. `"₹100"`).
  This **replaces** the free-text `"Free or ₹100"` field and its regex parsing.
- **Title** — prefilled, editable, optional. Default:
  `"{skillLevel} {sport} at {venueName}"` (e.g. *"Intermediate Basketball at SM Street"*).
  If the host clears it, fall back to the default on submit so `title` is never empty.
- **Notes** — optional textarea (`description`).
- **Summary** — compact read-only recap (sport · skill · venue · day & time ·
  players · cost) shown above Publish so the host confirms before posting.
- **Back** to step 2. **Publish** runs the existing create mutation, then
  `router.push("/play")`.

## Chrome / navigation

- A slim 3-segment **progress indicator** with labels (`What & where` · `When` ·
  `Details`), always visible at the top.
- The large hero image is replaced by a compact header to reduce scrolling.
- **Back** is always allowed; you cannot advance past an invalid step (Next stays
  disabled). Step state lives in the page component (`step: 1 | 2 | 3`) alongside
  the existing `form` state.

## Backend change (read-only)

`GET /api/venues` (`src/app/api/venues/route.ts`) returns an extra `openSlots:
number` per venue:
- Include each venue's `venueSlot` rows within the existing 30-day look-ahead.
- Count those where `slotAvailability({ startTime, isBlocked, booked }, now)` is
  available — same source of truth as the slot picker, so counts never drift.
- Single query with a relation include; no N+1.

Client `Venue` type gains `openSlots?: number`. No other API changes.

## Validation rules

| Step | Advance requires |
|------|------------------|
| 1 | `sport` && `skillLevel` && `venueId` |
| 2 | `slotId` |
| 3 | `slots` (parsable, ≥ 2); if Paid, `costAmount > 0` |

`canSubmit` (final) = all of the above. Title is never blocking (auto-default).

## Out of scope / deferred

- **Paid-join revenue leak (real bug, not part of this work):** the `/play` game
  card "Join" button and `POST /api/games/{id}` let a user join a **paid** game
  without paying — only the game-detail page charges, and the server does not
  enforce payment. Tracked separately; do not fix here.
- Find & join and Manage-a-game flow improvements (separate specs).

## Testing

- Manual: host a free game and a paid game end-to-end via the 3 steps; verify the
  published game on `/play` matches the summary (title, cost label, slot, players).
- Verify cascade-clear when changing sport/venue after advancing and coming back.
- Verify the no-slots venue path routes back cleanly.
- Confirm `openSlots` count matches the slot picker for a known venue.
- Existing API tests for `/api/games` and `/api/venues` continue to pass; add a
  case asserting `openSlots` is present and correct for a venue with mixed
  blocked/available/booked slots.
