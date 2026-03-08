# Court Pulse - Development Checkpoint

## Current Status: MVP UI Complete — Pre-Auth

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
- [x] **"I'm Down to Play" button** with hourly time picker
  - Scrollable slots: Now, next hours through 9 PM (past hours disabled)
  - Toggle on/off, upsert (no duplicates)
  - Active state shows target time + expiry time + tap to cancel
- [x] **Park cards** with:
  - Here now (player count) + last update
  - "Who's interested" — Morning/Afternoon/Evening bucket grid (blue)
    - Tap to expand animated hourly detail breakdown
  - "Skill levels on court" — Beginner/Inter./Advanced bucket grid (green)
    - Tap to expand animated per-level detail breakdown
  - **Paddle Down / Paddle Up** toggle (check-in/out)
    - Upsert — no duplicate check-ins
    - Shows auto check-out time when active
  - Directions button (Google Maps)
- [x] Animated expand/collapse panels (slide down/up, 250ms ease-out)
- [x] Expiry times shown as actual clock time (e.g., "Until 2:30 PM") not countdowns
- [x] Auto-clear expired intents/check-ins from UI
- [x] 2 parks seeded: Harper Park (Knightdale), Clayton Community Center
- [x] Test scripts: `scripts/test/seed-dummy-data.sql`, `clear-dummy-data.sql`, `adding-single-user.sql`
- [x] Environment template (`.env.local.example`)

### What's Next

- [ ] **Auth: Google + Apple sign-in** via Supabase Auth
  - Enable Google provider in Supabase dashboard
  - Create Google OAuth Client ID in Google Cloud Console
  - Redirect URI: `https://opztiobihdphdwpbbkyy.supabase.co/auth/v1/callback`
  - Apple sign-in (requires Apple Developer account — add later)
- [ ] **Profile setup after first sign-in**: username + skill level (2.5–5.0)
- [ ] Replace mock user ID (`demo-user`) with real authenticated user
- [ ] Seed more local parks (5-10 total)
- [ ] Push notifications (when someone beacons at your followed parks)
- [ ] Deploy to Vercel

### Architecture Decisions

- **No auth yet** — using mock user ID for testing. Google + Apple auth planned next.
- **Realtime via refetch** — on any Postgres change, refetch all. Simple, correct. Optimize later.
- **Intents expire based on target time** — "Now" = 90 min, specific hour = target + 1 hour.
- **Check-ins expire in 2 hours** from paddle down.
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
