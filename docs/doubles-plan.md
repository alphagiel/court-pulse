# Doubles Feature — Implementation Plan

## Design Decisions (locked in)
- Extend existing tables with `mode` column (not separate tables)
- `proposal_signups` join table for flexible player assembly
- Auto-balance teams by ELO (highest+lowest vs two middles)
- Creator can drag-rearrange, all 4 confirm pairings
- Draggable court component with net divider, player chips, team avg ELO
- Individual ELO adjustments from doubles (team avg for calculation, delta applied per player)

## Proposal Statuses (doubles)
`open` → `forming` → `pairing` → `accepted` → match created
- `open`: posted, waiting for signups
- `forming`: 1-3 players signed up, need more
- `pairing`: all 4 players in, arranging teams
- `accepted`: pairings confirmed, match auto-created

## Schema Changes

### ALTER proposals
```sql
ALTER TABLE proposals ADD COLUMN mode TEXT DEFAULT 'singles' CHECK (mode IN ('singles', 'doubles'));
ALTER TABLE proposals ADD COLUMN partner_id UUID REFERENCES profiles(id);
ALTER TABLE proposals ADD COLUMN seeking_partner BOOLEAN DEFAULT false;
-- Update status check to include forming/pairing
ALTER TABLE proposals DROP CONSTRAINT proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('open', 'forming', 'pairing', 'accepted', 'cancelled', 'expired'));
```

### ALTER matches
```sql
ALTER TABLE matches ADD COLUMN mode TEXT DEFAULT 'singles' CHECK (mode IN ('singles', 'doubles'));
ALTER TABLE matches ADD COLUMN player3_id UUID REFERENCES profiles(id);
ALTER TABLE matches ADD COLUMN player4_id UUID REFERENCES profiles(id);
```
Teams: player1+player2 = Team A, player3+player4 = Team B

### NEW TABLE proposal_signups
```sql
CREATE TABLE proposal_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('partner', 'opponent', 'opponent_partner')),
  team TEXT CHECK (team IN ('a', 'b')),
  confirmed BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);
```

### RLS for proposal_signups
- SELECT: everyone
- INSERT: authenticated, auth.uid() = user_id
- UPDATE: authenticated, auth.uid() = user_id (for confirming)
- DELETE: auth.uid() = user_id

### Match RLS update
- Expand to include player3_id, player4_id in policies

## Implementation Phases

### Phase 1: Database & Types
1. Write SQL migration `sql/05-doubles.sql`
2. Update `src/types/database.ts` — new types, extend Proposal/Match
3. Update `src/lib/elo.ts` — add `calculateDoublesElo()`

### Phase 2: Hooks & Data Layer
4. New hook: `useProposalSignups(proposalId)` with realtime
5. Update `useProposals` — add mode filter
6. Update `useMyMatches` — handle 4-player matches
7. New hook: `useAutoBalance(players[])` — returns suggested team split

### Phase 3: UI — Proposal Creation
8. Update proposal creation form — singles/doubles toggle
9. "Team" mode: pick partner from ladder members
10. "Solo" mode: just post, others join

### Phase 4: UI — Court Pairing Component
11. `CourtPairing` component — draggable court with net
12. Player chips with name + ELO
13. Team avg ELO display per side
14. Drag restricted to creator only
15. Confirm button per player, checkmarks as they confirm
16. Auto-create match when all 4 confirm

### Phase 5: UI — Match & Scoring
17. Update match detail page for 4 players
18. Score reporting: team1_scores / team2_scores (reuse player1/player2 columns)
19. Either player on a team can submit/confirm scores
20. ELO update: calculate with team averages, apply delta individually

### Phase 6: Ladder Page Integration
21. Singles/Doubles toggle on ladder page
22. Proposal cards show player slots (2/4, 3/4, etc.)
23. Join buttons based on open roles
24. Rankings: unified ELO, optional doubles stats badge

## Auto-Balance Algorithm
```
Sort 4 players by ELO descending: [P1, P2, P3, P4]
Team A: P1 + P4 (highest + lowest)
Team B: P2 + P3 (two middles)
This minimizes the team average difference.
```

## Court Component Visual
```
┌─────────────────────────────┐
│   ┌──────┐  ║  ┌──────┐    │
│   │  A   │  ║  │  C   │    │
│   │ Alex │  ║  │Chris │    │
│   │ 1350 │  ║  │ 1280 │    │
│   └──────┘  ║  └──────┘    │
│             ║              │
│   ┌──────┐  ║  ┌──────┐    │
│   │  B   │  ║  │  D   │    │
│   │Blake │  ║  │ Dana │    │
│   │ 1150 │  ║  │ 1220 │    │
│   └──────┘  ║  └──────┘    │
│                             │
│  Team A: 1250  Team B: 1250 │
│                             │
│  [✓ Alex] [✓ Blake] [Chris] │
│            [Dana]           │
│                             │
│     [ Confirm Pairings ]    │
└─────────────────────────────┘
```
