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
