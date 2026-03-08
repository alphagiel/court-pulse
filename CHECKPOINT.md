# Court Pulse - Development Checkpoint

## Current Status: MVP Complete — Ready for Production Deploy

### What's Done

- [x] Next.js project scaffolded (App Router, TypeScript, Tailwind v4)
- [x] shadcn/ui installed (button, card, badge, input, label, select, separator)
- [x] Supabase project live + connected
- [x] Database schema deployed (`supabase-schema.sql`)
  - Tables: `parks`, `profiles`, `intents`, `check_ins`
  - `intents` has `target_time` column for hourly availability
  - Row Level Security policies
  - Realtime enabled on `intents` and `check_ins`
- [x] TypeScript types for all tables (`src/types/database.ts`)
- [x] Geolocation utilities — Haversine distance, drive time estimate (`src/lib/geo.ts`)
- [x] Data hooks — realtime subscriptions, park activity builder with time buckets (`src/lib/hooks.ts`)
- [x] Modern system font (SF Pro / Segoe UI) + 0.5px letter-spacing globally
- [x] **"I'm Down to Play" button** — 2-step picker
  - Step 1: Pick a park ("Where are you playing?")
  - Step 2: Pick a time slot (Now, next hours through 9 PM)
  - Active state shows park name + time + expiry + tap to cancel
  - Toggle on/off, upsert (no duplicates)
- [x] **Park cards** with:
  - Here now (player count) + last update
  - "Who's interested" — Morning/Afternoon/Evening bucket grid (blue)
    - Tap to expand animated hourly detail breakdown
  - "Skill levels on court" — Beginner/Inter./Advanced bucket grid (green)
    - Tap to expand animated per-level detail breakdown
  - **"I'm Here" / Paddle Up** toggle (check-in/out)
    - Upsert — no duplicate check-ins
    - Shows auto check-out time when active
    - **Guard: can only check in at the park you selected** (others show "Select this court first")
    - **Auto-activates "Down to Play"** for that park when checking in
  - Directions button (Google Maps)
- [x] Animated expand/collapse panels (slide down/up, 250ms ease-out)
- [x] Expiry times shown as actual clock time (e.g., "Until 2:30 PM") not countdowns
- [x] Auto-clear expired intents/check-ins from UI
- [x] **7 parks seeded** — all free, outdoor pickleball courts
  - Harper Park (Knightdale) — 4 courts, lit
  - Clayton Community Center — 8 courts
  - Hollybrook Park (Wendell) — 4 courts, new (2025)
  - Wendell Park — 2 courts, lit
  - Method Community Park (Raleigh) — 6 courts, lit
  - McCrimmon Park (Cary) — 6 courts, lit, most popular free in Cary
  - Ed Yerha Park (Cary) — 3 courts
  - Seed script: `scripts/seed-more-parks.sql`
- [x] Test scripts: `scripts/test/seed-dummy-data.sql`, `clear-dummy-data.sql`, `adding-single-user.sql`
- [x] Environment template (`.env.local.example`)
- [x] **Auth: Google + Apple sign-in** via Supabase Auth
  - Google OAuth configured (Google Cloud Console + Supabase)
  - Apple Sign in configured (Apple Developer Services ID + Supabase)
  - Auth context/provider (`src/lib/auth-context.tsx`)
  - OAuth callback route (`src/app/auth/callback/route.ts`)
  - Login page with Google + Apple buttons (`src/app/login/page.tsx`)
  - Redirects: unauthenticated → `/login`, no profile → `/setup`, authenticated → `/`
- [x] **Profile setup after first sign-in** (`src/app/setup/page.tsx`)
  - Username input + skill level picker (2.5–5.0)
  - Inserts into `profiles` table linked to `auth.uid()`
- [x] **Replaced mock user ID** (`demo-user`) with real authenticated user
  - All intents/check-ins now use `user.id` and `profile.skill_level`
  - Header shows username + skill level + sign out button

### Auth Credentials

- **Google OAuth**: Client ID in `.env.local`, secret in Supabase dashboard
- **Apple Sign In**:
  - Services ID: `com.courtpulse.auth.web`
  - Team ID: `BXNKC39NHK`, Key ID: `UCLL98T44T`
  - JWT secret generated: 2026-03-08, **expires ~2026-09-04**
  - Regeneration instructions in `.env.local`
  - `.p8` key file: `full-stack/AuthKey_UCLL98T44T.p8`

### Pre-Deploy Checklist

- [ ] Add production domain to Google OAuth authorized redirect URIs
- [ ] Add production domain to Apple Developer Services ID return URLs
- [ ] Set environment variables in Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] Add production URL to Supabase Auth > URL Configuration > Site URL + Redirect URLs
- [ ] Deploy to Vercel

### What's Next (Post-Launch)

- [ ] Push notifications (when someone beacons at your followed parks)
- [ ] Seed additional parks as users request them

### Architecture Decisions

- **Auth via Supabase OAuth** — Google + Apple providers, session managed client-side via `AuthProvider` context.
- **Profile required** — after first sign-in, users must set username + skill level before accessing dashboard.
- **Intent-park binding** — intent is tied to a specific park. "I'm Here" auto-creates intent. Can only check in at the park you selected. Cancel intent to switch parks.
- **Realtime via refetch** — on any Postgres change, refetch all. Simple, correct. Optimize later.
- **Intents expire based on target time** — "Now" = 90 min, specific hour = target + 1 hour.
- **Check-ins expire in 2 hours** from check-in.
- **Sorting** — Active parks surface to top, then by distance.
- **Time buckets** — Morning (<12), Afternoon (12–5), Evening (5–9) for "interested" display.
- **Skill buckets** — Beginner (2.5–3.0), Intermediate (3.5–4.0), Advanced (4.5–5.0).
- **Supabase client** — lazy-init via Proxy to avoid build-time errors without env vars.

### Future Features (Backburner)

- Group check-ins with intent flag: "playing with anyone" vs "closed group"
- Map view (Leaflet.js)
- Park suggestions from users (add unlisted parks)
- Historical activity patterns (best times to play)
- Email notifications via Resend
