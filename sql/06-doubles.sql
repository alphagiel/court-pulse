-- ============================================================
-- Court Pulse — Doubles Feature Migration
-- ============================================================
-- Run AFTER 05-patches.sql. Adds doubles support to the ladder.
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================


-- ========================
-- 1. ALTER proposals
-- ========================

-- Mode column: singles (default) or doubles
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'singles'
  CHECK (mode IN ('singles', 'doubles'));

-- Creator's partner for doubles (NULL if solo-seeking)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES profiles(id);

-- True when creator doesn't have a partner yet
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS seeking_partner BOOLEAN DEFAULT false;

-- Opponent's partner (set when an opposing team accepts)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS acceptor_partner_id UUID REFERENCES profiles(id);

-- Expand status to include forming + pairing
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('open', 'forming', 'pairing', 'accepted', 'cancelled', 'expired'));


-- ========================
-- 2. ALTER matches
-- ========================

-- Mode column
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'singles'
  CHECK (mode IN ('singles', 'doubles'));

-- Team B players (Team A = player1 + player2, Team B = player3 + player4)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player3_id UUID REFERENCES profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player4_id UUID REFERENCES profiles(id);

-- For doubles: winner_id stores NULL, we use winning_team instead
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winning_team TEXT
  CHECK (winning_team IN ('a', 'b'));


-- ========================
-- 3. NEW TABLE: proposal_signups
-- ========================

CREATE TABLE IF NOT EXISTS proposal_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('creator', 'partner', 'opponent', 'opponent_partner')),
  team TEXT CHECK (team IN ('a', 'b')),
  confirmed BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);


-- ========================
-- 4. INDEXES
-- ========================

CREATE INDEX IF NOT EXISTS idx_proposals_mode ON proposals(mode);
CREATE INDEX IF NOT EXISTS idx_matches_mode ON matches(mode);
CREATE INDEX IF NOT EXISTS idx_proposal_signups_proposal ON proposal_signups(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_signups_user ON proposal_signups(user_id);


-- ========================
-- 5. RLS for proposal_signups
-- ========================

ALTER TABLE proposal_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signups viewable by everyone"
  ON proposal_signups FOR SELECT USING (true);

CREATE POLICY "Users can sign up"
  ON proposal_signups FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signup"
  ON proposal_signups FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own signup"
  ON proposal_signups FOR DELETE USING (auth.uid() = user_id);


-- ========================
-- 6. UPDATE match RLS for doubles
-- ========================

-- Drop and recreate match policies to include player3/player4
DROP POLICY IF EXISTS "Players can create matches" ON matches;
CREATE POLICY "Players can create matches" ON matches FOR INSERT WITH CHECK (
  auth.uid() = player1_id OR auth.uid() = player2_id
  OR auth.uid() = player3_id OR auth.uid() = player4_id
);

DROP POLICY IF EXISTS "Players can update their matches" ON matches;
CREATE POLICY "Players can update their matches" ON matches FOR UPDATE USING (
  auth.uid() = player1_id OR auth.uid() = player2_id
  OR auth.uid() = player3_id OR auth.uid() = player4_id
);

DROP POLICY IF EXISTS "Players can delete their matches" ON matches;
CREATE POLICY "Players can delete their matches" ON matches FOR DELETE USING (
  auth.uid() = player1_id OR auth.uid() = player2_id
  OR auth.uid() = player3_id OR auth.uid() = player4_id
);


-- ========================
-- 7. UPDATE proposal RLS for doubles (partner/acceptor_partner can update)
-- ========================

DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
CREATE POLICY "Users can update own proposals" ON proposals FOR UPDATE USING (
  auth.uid() = creator_id
  OR auth.uid() = partner_id
  OR auth.uid() = accepted_by
  OR auth.uid() = acceptor_partner_id
  OR (status IN ('open', 'forming') AND auth.role() = 'authenticated')
);


-- ========================
-- 8. REALTIME for new table
-- ========================

ALTER PUBLICATION supabase_realtime ADD TABLE proposal_signups;
