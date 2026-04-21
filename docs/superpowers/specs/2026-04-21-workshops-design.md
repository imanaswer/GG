# Workshops Feature Design

## Overview

Add a Workshops feature to GAMEGROUND as a standalone entity alongside Events and Camps. Workshops are focused skill sessions — either single-session (1-3 hours) or multi-session series (e.g., weekly over a few weeks). They serve both youth and adult audiences, with registration adapting based on the workshop's audience type.

## Database Schema

### Workshop Model

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| title | String | Workshop title |
| sport | String | Sport category |
| description | String | Full description |
| sessionType | String | "single" or "series" |
| sessionCount | Int | Number of sessions (1 for single) |
| sessionDuration | String | e.g., "2 hours" |
| sessions | Json | Array of `{ date, time, topic, description }` |
| startDate | DateTime | First session date |
| endDate | DateTime | Last session date (same as startDate for single) |
| registrationDeadline | DateTime | Cutoff for registration |
| location | String | Venue name |
| address | String | Full address |
| distance | String | Distance indicator |
| price | Int | Price in smallest currency unit |
| priceDisplay | String | Formatted price string |
| ageGroup | String | Target age group |
| audienceType | String | "youth", "adult", or "all" |
| skillLevel | String | Beginner/Intermediate/Advanced/All Levels |
| rating | Float | Average rating (default 0) |
| reviewCount | Int | Number of reviews (default 0) |
| participants | Int | Current registered count (default 0) |
| maxParticipants | Int | Capacity |
| instructor | Json | `{ name, bio, imageUrl, credentials }` |
| testimonials | Json | Array of testimonial objects |
| imageUrl | String | Workshop image |
| featured | Boolean | Featured flag (default false) |
| status | String | "open", "full", "completed", "archived" |
| tags | String[] | Searchable tags |
| highlights | String[] | Key selling points |
| requirements | String[] | What participants need |
| organizer | String | Organizer name |
| organizerContact | String | Contact info |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |

### WorkshopRegistration Model

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| workshopId | String | FK to Workshop |
| userId | String | FK to User |
| participantName | String | Child's name (youth) or user's name (adult) |
| participantAge | Int? | Required for youth, optional otherwise |
| registrationType | String | "youth" or "adult" |
| paymentStatus | String | "unpaid", "paid", or "free" |
| registeredAt | DateTime | Auto-set |

Relations: Workshop has many WorkshopRegistrations. User has many WorkshopRegistrations.

## API Routes

### Public

- **GET `/api/workshops`** — List workshops with filters: `q` (search), `sport`, `skillLevel`, `sessionType`, `audienceType`. Excludes completed/archived. Ordered by featured then startDate.
- **GET `/api/workshops/[id]`** — Workshop detail with registration count and user's registration status.
- **POST `/api/workshops/[id]`** — Register for workshop. Body: `{ participantName, participantAge?, registrationType }`. Validates: not full, deadline not passed, not already registered. Auto-updates status to "full" at capacity. Creates Payment record for paid workshops.
- **DELETE `/api/workshops/[id]`** — Cancel registration. 90-minute cutoff before startDate. Auto-updates status back to "open" if was "full".

### Admin

- **GET `/api/admin/workshops`** — All workshops + registrations with participant details.
- **POST `/api/admin/workshops`** — Create workshop. Auto-formats priceDisplay.
- **PUT `/api/admin/workshops`** — Update workshop fields.
- **DELETE `/api/admin/workshops`** — Delete workshop. Cascade: Payments → WorkshopRegistrations → Workshop.

## Pages

### Public: `/workshops` (Listing)

- Hero section with search bar
- Filter bar: sport, skill level, session type (single/series), audience type (youth/adult/all)
- Featured workshops in 2-column grid (FeaturedCard)
- Regular workshops in 3-column grid (CompactCard)
- Cards show: title, sport badge, session type badge, audience type badge, price, location, date range, participants/max progress bar
- Loading skeletons while fetching
- Same design language as camps/events pages

### Public: `/workshops/[id]` (Detail)

- Hero with workshop image, title, sport badge, session type badge
- Enrollment status bar (participants / maxParticipants)
- Tabbed content:
  - **Overview**: description, highlights, requirements
  - **Sessions**: Each session as a card — date, time, topic, description. Single-session shows one card; series shows all chronologically.
  - **Instructor**: Name, photo, bio, credentials in a profile-card layout.
  - **Reviews**: Testimonials grid
- Sidebar: Workshop info card (price, dates, location, skill level, age group, audience type), register/cancel button
- Registration modal behavior:
  - `audienceType === "youth"`: Collect participantName + participantAge
  - `audienceType === "adult"`: Auto-fill user name, no age field, registrationType = "adult"
  - `audienceType === "all"`: Ask "Registering for yourself or a child?" — if self: adult flow; if child: youth flow
- Payment via Razorpay for paid workshops, free workshops skip payment

### Admin: `/admin/workshops`

- Workshop overview cards with: title, sport tag, session type, participants/max progress bar, deadline, status
- Click card to filter registrations table by that workshop
- Registration table columns: ID, Participant Name, Age, Type (youth/adult), Workshop, Registered On, Payment Status
- CRUD actions: Add, Edit, Delete workshops via AdminModal
- CSV export for registrations

## Navigation

Add `/workshops` labeled "Workshops" to PremiumNav LINKS array, positioned between "Camps" and "Events":

```
/learn    → "Coaches"
/play     → "Games"
/camps    → "Camps"
/workshops → "Workshops"  ← NEW
/events   → "Events"
/about    → "About"
```

Also add `/admin/workshops` to admin sidebar navigation.

## Hooks (in useData.ts)

- `useWorkshops(filters)` — list query with filters
- `useWorkshop(id)` — detail query, enabled when id present
- `useRegisterWorkshop()` — mutation, invalidates workshop queries on success
- `useCancelWorkshop()` — mutation, invalidates workshop queries on success

## Payment Integration

Same as camps/events:
- Payment entity type: "workshop"
- Create order via `/api/payments/create-order`
- Verify via `/api/payments/verify`
- Payment record links to workshopId via entityType + entityId

## Status Management

- "open" — accepting registrations
- "full" — auto-set when participants === maxParticipants
- "completed" — manually set by admin or could be auto-set after endDate
- "archived" — hidden from public listing

Auto-transitions:
- Register when full → reject
- Register fills last spot → status becomes "full"
- Cancel from full workshop → status reverts to "open"
