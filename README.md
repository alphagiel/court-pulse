# Court Pulse

Real-time pickup pickleball court activity. See who's playing, find your skill level, and signal you're ready to play.

## The Problem

You drive 20 minutes to a court — 14 paddles in rotation (hour-long wait) or zero (no game). There's no visibility into what's happening at any court before you arrive.

## What It Does

- **"Let's Play" beacon** — One tap to signal you want to play. Everyone following that court gets notified.
- **Live dashboard** — See how many paddles are in rotation at nearby courts, skill levels, and how recently it was updated.
- **"I'm Here Now" check-in** — Confirm you're at the court so others know it's active.
- **Skill level visibility** — Know if the court matches your level before you drive there.

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/DB/Realtime:** Supabase (Postgres + Realtime subscriptions)
- **Geolocation:** Browser Geolocation API + Haversine distance formula
- **Deployment:** Vercel (frontend) + Supabase (backend)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd court-pulse
   npm install
   ```

2. Create a Supabase project and run the schema:
   - Go to your Supabase dashboard > SQL Editor
   - Paste and run the contents of `supabase-schema.sql`

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Supabase URL and anon key from the Supabase dashboard (Settings > API).

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Seed Parks

Before the app is useful, seed a few local parks. Insert directly in Supabase SQL Editor:

```sql
INSERT INTO parks (name, address, lat, lng, court_count) VALUES
  ('Example Park', '123 Main St', 33.7490, -84.3880, 4),
  ('Another Park', '456 Oak Ave', 33.7550, -84.3900, 2);
```

## Project Structure

```
src/
  app/
    layout.tsx            # Root layout with metadata
    page.tsx              # Home — dashboard + Let's Play button
    globals.css           # Tailwind + shadcn styles
  components/
    lets-play-button.tsx  # The big "Let's Play" beacon button
    park-card.tsx         # Expandable park activity card
    ui/                   # shadcn/ui components
  lib/
    supabase.ts           # Supabase client
    hooks.ts              # Data fetching + realtime hooks
    geo.ts                # Geolocation + distance utilities
  types/
    database.ts           # TypeScript types + Supabase DB types
supabase-schema.sql       # Full database schema with RLS policies
```

## Deployment

1. Push to GitHub
2. Connect repo in [Vercel](https://vercel.com)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

## License

Private — not open source (yet).
