# BORDERLAND PROTOCOL — Reverse Hackathon

Landing site for the Borderland Protocol reverse hackathon by SRM DBUG Labs, built with **Next.js 16** (App Router) + Tailwind CSS v4.

The full platform design (registration, payments, admin, attendance) is in [Borderland_Final_Design.md](Borderland_Final_Design.md).

## Run locally

**Prerequisites:** Node.js 20.9+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in values
3. Start the dev server: `npm run dev` → http://localhost:3000

## Project layout

| Path | What |
|---|---|
| `src/app/layout.tsx` | Root layout: metadata, fonts (`next/font`), global CSS |
| `src/app/page.tsx` | Home route — renders `App` |
| `src/app/globals.css` | Tailwind + theme utilities |
| `src/App.tsx` | Landing page (client component) |
| `src/components/` | Page sections and modals |
| `src/types/`, `src/utils/` | Shared types, HUD sound effects |

## Social-proof & urgency features

Three features that use real registration data to encourage signups:

### 1. Live registration ticker (landing page)

An infinitely scrolling horizontal strip directly below the hero, showing e.g. "Aarav K. registered 2 min ago". Pauses on hover, respects `prefers-reduced-motion`, and hides itself when there are fewer than 3 registrations or the API fails.

### 2. "Few slots left" urgency banner (registration page)

A prominent notice above the registration form when remaining slots fall below the threshold. Includes a progress bar. Turns red/amber when remaining < `CRITICAL_SLOTS`. When slots reach 0, the form CTA is replaced by a "Registrations closed" state.

### 3. Urgency popup (landing page)

A dismissible modal reinforcing low-slots urgency with a "Register Now" CTA. Triggers once per session via: 8-second timer, scrolling past the ticker, or desktop exit-intent. Never shown on the registration page, never shown to already-registered users.

### Config constants (`src/lib/slots.ts`)

| Constant | Default | Purpose |
|---|---|---|
| `TOTAL_SLOTS` | `60` | Maximum teams the event can accept |
| `URGENCY_THRESHOLD` | `0.2` | Show urgency UI when remaining ≤ 20 % of total |
| `CRITICAL_SLOTS` | `10` | Stronger red visual when remaining drops below this |
| `POLL_INTERVAL_MS` | `45000` | Client polling interval in milliseconds |

### API endpoints

| Endpoint | Method | Returns |
|---|---|---|
| `/api/registrations/recent` | `GET` | Latest 15 registrations (first name + last initial + `createdAt` only) |
| `/api/registrations/count` | `GET` | `{ count: number }` — active registrations (CONFIRMED + UNDER_REVIEW) |

Both endpoints filter out deleted registrations and never expose PII (email, phone, full name, regNo). The name truncation happens server-side.

### Data layer (`src/lib/registrationData.ts`)

Client-side module that:
- Fetches both endpoints in parallel, shared across all three features (single cache).
- Polls every `POLL_INTERVAL_MS` and pauses when the tab is hidden.
- Converts timestamps to relative time strings ("just now", "2 min ago"), updated every 30 s.
- On fetch failure, returns `null` — consumers hide their UI gracefully.

