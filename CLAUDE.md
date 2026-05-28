# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # local dev server (port 3000)
npm run build        # production build
npx prisma generate  # regenerate Prisma client after schema changes
npx prisma db push   # sync schema to Railway Postgres (run: start does this automatically)
npx tsc --noEmit     # type-check without emitting
npx tsx src/scripts/<file>.ts  # run a one-off script
```

`npm run start` (Railway) runs `prisma db push --accept-data-loss && next start`. Never run `db push` in dev with production data.

## Architecture

**Deployment**: Railway (Node server, not Vercel). PostgreSQL also on Railway.

**Static content lives in `src/lib/`** — no DB reads needed for public pages:
- `tours.ts` → `TOURS_DB: Tour[]` — all tour definitions
- `destinos.ts` → `DESTINOS_DB` — all destination definitions  
- `paquetes.ts` — package definitions
- `destinoData.ts` → `REVIEWS_POR_DESTINO`, tour lists per destination
- `tourFaqs.ts`, `tourReviews.ts`, `tourMapping.ts` — supplemental tour data
- `jsonld.ts` — Schema.org helpers

**Database (Prisma)** is used for transactional data only: `TourBooking`, `TourQuote`, `BlogPost`, `Destination`, `Activity`, `Itinerary`, `Booking`, `User`.

**`_meta` pattern**: The `lineItems` and `packageItems` JSON fields on `TourBooking` embed a `_meta` string to pass extra data (child counts, promo info) through Stripe checkout without DB migrations. Parse carefully.

## Pricing

Two-tier children pricing via `calcTourTotal()` in `src/lib/tourBooking.ts`:
- `childrenMid` (6–10 yrs) → 70% of adult price
- `childrenSmall` (<6 yrs) → 50% of adult price

This is the canonical pricing function. `TourCalculadora.tsx` (widget) and `reservar-tour/[slug]/page.tsx` (full booking flow) both use it.

## Booking Flow

1. `TourCalculadora` widget (sidebar on tour pages) → deep-links to `/reservar-tour/[slug]` passing state via sessionStorage (`TourBookingState` in `tourBooking.ts`)
2. `/reservar-tour/[slug]` — full booking page with calendar, promo codes, payment mode selector
3. Payment via `/api/cobrar` → Stripe Checkout → webhook at `/api/stripe-webhook`
4. Confirmation email via Brevo (`src/lib/brevo.ts`); admin copy via BCC to `ADMIN_EMAIL_TOURS` env var (Railway)

## Email

Brevo for transactional email (`BREVO_API_KEY` env var). Admin booking copy uses `ADMIN_EMAIL_TOURS` env var — must be set to a real address in Railway (not `onboarding@resend.dev`).

## Auth

Next-Auth v5 beta (`next-auth@5.0.0-beta.19`) with Prisma adapter. Admin pages and `/api/admin/**` routes are protected in `src/middleware.ts` (JWT cookie `admin_session`). Token signing/verification and credential checks live in `src/lib/admin/auth.ts`. `ADMIN_JWT_SECRET` is required (no fallback) — if unset, all admin access is denied.

## Design System

Tailwind with custom tokens in `tailwind.config.ts`:
- Colors: `negro`, `verde-profundo`, `verde-selva`, `verde-vivo`, `lima`, `crema`, `dorado`, `terracota`, `agua`
- Fonts: `cormorant` (headings, display), `dm` (body, UI)
- Keyframes: `slide-up`, `shrink`
- Glass utility classes: `gloss-surface-light`, `gloss-selector-light`

`framer-motion` is installed but **not used** in public-facing components — use Tailwind CSS animations only for new public UI work.

## Page Generation

Static tour/destino/blog pages use `generateStaticParams` + `generateMetadata`. API routes use `export const dynamic = "force-dynamic"`. Avoid adding `"use client"` to page-level components — push interactivity down to leaf components.

## Promo Codes

Hardcoded in `src/lib/tourBooking.ts` → `PROMO_CODES` object. Add new codes there directly.
