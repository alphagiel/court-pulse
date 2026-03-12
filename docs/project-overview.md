# Court Pulse — Project Overview

## Stack
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- Supabase (PostgreSQL, RLS, Realtime, OAuth via Google/Apple, Email/Password)
- Feature branch: `feature/ladder-system`

## SQL Files (consolidated)
- `sql/01-schema.sql` — All tables, indexes, RLS, realtime
- `sql/02-seed-parks.sql` — 7 Triangle-area parks
- `sql/03-seed-dummy.sql` — 108 dummy users (18 dashboard + 90 ladder)
- `sql/04-cleanup-dummy.sql` — Wipes dummy data by UUID pattern

## Key Files
- `src/app/ladder/page.tsx` — Main ladder page
- `src/app/ladder/proposals/new/page.tsx` — Create proposal form
- `src/app/ladder/proposals/[id]/page.tsx` — Proposal detail (doubles)
- `src/app/ladder/match/[id]/page.tsx` — Match detail + score reporting
- `src/lib/ladder-hooks.ts` — All ladder data hooks with realtime
- `src/lib/elo.ts` — ELO calculation (K=32)
- `src/types/database.ts` — All types, tier maps, constants
- `src/components/court-pairing.tsx` — Doubles court pairing component

## Design Reference
Card inspiration: clean white cards with:
- Bold name top-left, avatar top-right
- Green badge/tag below name
- Key-value rows: muted label left, bold value right-aligned
- Generous padding and spacing between sections
- Minimal, no clutter — use for proposal cards and ranking cards
- Theme: green is the action color (emerald/green-600)

---

## Ladder System (completed)

- Registration gate (free now, Stripe later)
- 3 skill tiers: Beginner (2.5-3.0), Intermediate (3.5-4.0), Advanced (4.5-5.0)
- Landing page: 3 tier cards with green glow on user's tier, stats + top players
- Proposals: create, accept (race condition guarded), cancel (owner=delete, non-owner=reopen)
- Matches: score reporting (best-of-3), confirm, dispute flow (resubmit scores)
- Read-only access to other tiers
- "Show more" pattern (5 items initially) for proposals/matches lists
- Data auto-expires: proposals & matches older than 7 days filtered out

---

## Doubles Feature (completed)

- Extended proposals/matches with `mode` column, `proposal_signups` join table
- Auto-balance by ELO (P1+P4 vs P2+P3), creator tap-to-swap, all 4 confirm
- Singles/Doubles toggle on landing + tier detail pages
- `DoublesProposalsTab` shows slot counts (x/4), `DoublesMatchesTab` shows teams
- SQL migration: `sql/06-doubles.sql` (run after 05-patches)
- Doubles ELO: team-average based, same delta per teammate
- Detailed plan: `docs/doubles-plan.md`

---

## Doubles Ratings (completed)

- Separate ELO for singles and doubles (like UTR)
- `sql/08-doubles-ratings.sql` migration: `mode` column + composite unique `(user_id, mode)`
- Rankings tab now shows for both modes
- Seed data includes doubles ratings, proposals with signups, and matches

---

## Upcoming Features

- **Email Notifications** — see `docs/email-notifications.md`
