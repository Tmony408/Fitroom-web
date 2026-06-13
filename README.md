# FitRoom Web — Batch 2b (Frontend)

Next.js (App Router, TypeScript) web app for the FitRoom platform. Talks to the
`fitroom-api` backend over a typed client. This is the version to demo to pilot designers.

## Stack
- **Next.js 16** (App Router) + **React 19**
- **Framer Motion** for page transitions, staggered reveals, hover springs, animated counters
- Vibrant Afrocentric design system (gradients, glassmorphism, Sora + Plus Jakarta Sans)
- **Keyword-matched imagery** (LoremFlickr): each garment type maps to a real photo tagged with that garment (agbada → agbada, kaftan → kaftan, etc.), pinned per slot. Graceful gradient fallback (`SmartImage`) so nothing ever shows a broken image
- TypeScript, strict mode
- Typed API client (`src/lib/api.ts`) mirroring the backend contract
- JWT auth held client-side; role-aware routing

### Imagery — per-garment, swappable
`src/lib/images.ts` holds a `GARMENTS` list covering many styles (Agbada, Senator, Kaftan,
Aso Ebi, Ankara, Dashiki, Gele, Bridal, Buba & Iro, Native wear), each with its own picture.
Product cards resolve their image by category via `categoryImage()`. Replace any `src` with
your own product photography for exact shots — the gradient fallback covers any URL that fails.

## Prerequisites
1. Run the backend first (`../fitroom-api`) and seed it.
2. Node 18+.

## Quick start
```bash
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:3000/api
npm install
npm run dev                       # http://localhost:3000  (use a different port if API is on 3000)
```
> The API defaults to port 3000. Run the web app on another port, e.g. `PORT=3001 npm run dev`,
> or set the API to a different port and update `NEXT_PUBLIC_API_URL`.

## Typecheck
```bash
npm run typecheck
```

## What's here
**Customer**
- `/register`, `/login`
- `/fit-profile` — consent + editable measurements (versioned)
- `/shop` — browse products
- `/order/new?productId=…` — customise (neck/sleeve/length/add-ons/notes) with a **live size recommendation** from the fit engine
- `/orders`, `/orders/[id]` — accept quote, pay (stub), track production stages, request alteration, cancel

**Designer**
- `/designer/onboard` — create brand profile
- `/designer` — KPI dashboard + incoming orders
- `/designer/orders/[id]` — send quote, advance production stages, view/print measurement sheet, ask for clarification
- `/designer/products` — list + add products with size charts

## Demo flow (after seeding the API)
1. Log in as `customer@demo.io` (password `Password123!`) → add measurements → shop → customise → send order.
2. Log in as `designer@lagosroyale.com` → open the order → send a quote → advance stages.
3. Back as the customer → accept quote → pay → watch it move through Track.

## Notes
- Payment is a **stub** (Batch 4 adds Paystack/Flutterwave + signed webhooks).
- Auth token is stored client-side for the demo; production should move to httpOnly cookies (tracked in the build plan).
