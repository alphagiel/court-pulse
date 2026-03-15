# Court Pulse - Development Checkpoint

## Current Status: Production Live — Active Feature Development

### Stack
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- Supabase (PostgreSQL, RLS, Realtime, OAuth via Google/Apple, Email/Password)
- Resend for transactional email (`noreply@send.pickleconnect.club`)
- Deployed: `https://court-pulse-raleigh.vercel.app`

---

### Core Features (shipped)

#### Pickup System
- [x] "I'm Down to Play" button — 2-step picker (park → time slot)
- [x] Park cards with activity: here now, interested (time buckets), skill levels
- [x] "I'm Here" / Paddle Up toggle (check-in/out, auto-expires 2hrs)
- [x] Guard: can only check in at selected park
- [x] 7 Triangle-area parks seeded
- [x] Sorting: active parks first, then by distance
- [x] Weather widget on pickup page

#### Auth & Profiles
- [x] Google + Apple OAuth via Supabase
- [x] Email/Password auth with forgot/reset password flow
- [x] Profile setup (username + skill level 2.5–5.0)
- [x] Geo-restriction (zipcode-based access gate)

#### Ladder System
- [x] Registration gate (free now, Stripe later)
- [x] 3 skill tiers: Beginner (2.5-3.0), Intermediate (3.5-4.0), Advanced (4.5-5.0)
- [x] Landing page: 3 tier cards, stats + top players
- [x] Proposals: create, accept, cancel (race condition guarded)
- [x] Matches: score reporting (best-of-3), confirm, dispute flow
- [x] Read-only access to other tiers
- [x] Data auto-expires: proposals & matches older than 7 days filtered out

#### Doubles
- [x] Extended proposals/matches with `mode` column, `proposal_signups` join table
- [x] Auto-balance by ELO (P1+P4 vs P2+P3), creator tap-to-swap, all 4 confirm
- [x] Singles/Doubles toggle on landing + tier detail pages
- [x] Separate ELO ratings for singles and doubles (like UTR)

#### Email Notifications
- [x] Supabase Edge Function: `supabase/functions/send-email/`
- [x] Database Webhooks on proposals INSERT/UPDATE + matches UPDATE
- [x] 5 immediate emails: new proposal, accepted, doubles filled, partner invite, disputed
- [x] Throttle: 1 email per user per hour for fan-out, 600ms delay between sends
- [x] Auth emails restyled (confirm signup, reset password, magic link)
- [x] Email preferences: `/settings` page with per-category toggles + master switch

#### Park Submissions
- [x] Users can submit new parks (name, address, court count)
- [x] Admin approve (geocodes via Nominatim → inserts to parks) or reject
- [x] Admin can delete submissions

#### Feedback System (NEW)
- [x] `FloatingUtility` component — side-edge tab, bottom-right, purple-to-blue gradient
- [x] Click opens slide-out feedback form, submits to `feedback` table
- [x] Shows on all pages for logged-in users (in root layout)
- [x] Named generically for future reuse (updates, announcements, etc.)
- [x] Admin Feedback tab: New/Replied sub-tabs
- [x] Admin can reply — saves to DB + sends email to user via edge function
- [x] Admin can delete feedback entries
- [x] Feedback reply email template (`feedbackReplyEmail`)
- [x] UX: currently high-visibility gradient to encourage early feedback — tone down later

#### Admin
- [x] `/admin` — gated by `NEXT_PUBLIC_ADMIN_IDS` env var
- [x] Top-level toggle: Parks | Feedback (with unread badge)
- [x] Delete button on all cards (two-tap confirm: "Del" → "Delete?")
- [x] Admin link in hamburger menu (only visible to admins)

---

### SQL Migrations (run in order)
1. `sql/01-schema.sql` — All tables, indexes, RLS, realtime
2. `sql/02-seed-parks.sql` — 7 Triangle-area parks
3. `sql/03-seed-dummy.sql` — 108 dummy users
4. `sql/04-cleanup-dummy.sql` — Wipes dummy data
5. `sql/05-patches.sql` — Schema patches
6. `sql/06-doubles.sql` — Doubles mode
7. `sql/07-*` through `sql/11-*` — ELO, ratings, email, preferences
8. `sql/12-park-submissions.sql` — Park submissions table
9. `sql/13-*` — (if exists)
10. `sql/14-feedback.sql` — Feedback table
11. `sql/15-admin-delete.sql` — DELETE RLS policies for park_submissions + feedback

### Key Files
- `src/app/admin/page.tsx` — Admin page (Parks + Feedback)
- `src/components/floating-utility.tsx` — Floating feedback tab
- `src/app/layout.tsx` — Root layout (includes FloatingUtility)
- `src/app/ladder/page.tsx` — Main ladder page
- `src/lib/theme.ts` — Global color config
- `supabase/functions/send-email/index.ts` — Edge function (webhooks + direct invoke)
- `supabase/functions/send-email/templates.ts` — All email templates

### Auth Credentials
- **Google OAuth**: Client ID in `.env.local`, secret in Supabase dashboard
- **Apple Sign In**:
  - Services ID: `com.courtpulse.auth.web`
  - Team ID: `BXNKC39NHK`, Key ID: `UCLL98T44T`
  - JWT secret generated: 2026-03-08, **expires ~2026-09-04**
  - `.p8` key file: `full-stack/AuthKey_UCLL98T44T.p8`

### Architecture Decisions
- **Auth via Supabase OAuth** — Google + Apple + Email/Password
- **Realtime via refetch** — on Postgres change, refetch all. Simple, correct.
- **Theme system** — `src/lib/theme.ts` centralized colors (green=pickup, sky=ladder)
- **Admin gating** — env var `NEXT_PUBLIC_ADMIN_IDS` (comma-separated UUIDs), checked client-side
- **Email** — Resend via Supabase Edge Function, triggered by DB webhooks + direct `functions.invoke()`
- **Feedback reply** — direct invoke (not webhook) since it's admin-initiated, not DB-triggered

### Deploy
- **App**: Vercel auto-deploy from `main`
- **Edge Function**: `$env:SUPABASE_ACCESS_TOKEN="..."; npx supabase functions deploy send-email --project-ref opztiobihdphdwpbbkyy`

### What's Next
- [ ] Push notifications
- [ ] Daily digest email (Phase 2)
- [ ] Stripe integration for ladder registration
- [ ] Map view
- [ ] Historical activity patterns
