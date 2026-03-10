-- ============================================================
-- Court Pulse — Full Database Schema
-- ============================================================
-- Run this FIRST in the Supabase SQL Editor on a fresh project.
-- Contains all tables, indexes, RLS policies, and realtime config.
--
-- Sections:
--   1. Core tables (parks, profiles, intents, check_ins)
--   2. Ladder tables (ladder_members, proposals, matches, ladder_ratings)
--   3. Indexes
--   4. Row Level Security
--   5. Realtime
-- ============================================================


-- ========================
-- 1. CORE TABLES
-- ========================

-- Parks (seeded manually)
CREATE TABLE parks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  court_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('2.5', '3.0', '3.5', '4.0', '4.5', '5.0')),
  preferred_park_id UUID REFERENCES parks(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intents ("I'm Down to Play" — want to play)
CREATE TABLE intents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES parks(id) ON DELETE CASCADE NOT NULL,
  skill_level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 minutes')
);

-- Check-ins ("I'm Here" — at the court)
CREATE TABLE check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES parks(id) ON DELETE CASCADE NOT NULL,
  skill_level TEXT NOT NULL,
  player_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);


-- ========================
-- 2. LADDER TABLES
-- ========================

-- Ladder members (registration gate — free for now, payment gate later)
CREATE TABLE ladder_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  season TEXT DEFAULT '2026-spring',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals (challenges posted by players)
CREATE TABLE proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES parks(id) ON DELETE CASCADE NOT NULL,
  proposed_time TIMESTAMPTZ NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'cancelled', 'expired')),
  accepted_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours')
);

-- Matches (created when a proposal is accepted)
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  player1_id UUID REFERENCES profiles(id) NOT NULL,
  player2_id UUID REFERENCES profiles(id) NOT NULL,
  player1_scores INTEGER[],
  player2_scores INTEGER[],
  submitted_by UUID REFERENCES profiles(id),
  confirmed_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'score_submitted', 'confirmed', 'disputed', 'cancelled')),
  winner_id UUID REFERENCES profiles(id),
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ladder ratings (one per player per season)
CREATE TABLE ladder_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  last_played TIMESTAMPTZ,
  season TEXT DEFAULT '2026-spring',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================
-- 3. INDEXES
-- ========================

-- Core
CREATE INDEX idx_intents_park_id ON intents(park_id);
CREATE INDEX idx_intents_expires_at ON intents(expires_at);
CREATE INDEX idx_check_ins_park_id ON check_ins(park_id);
CREATE INDEX idx_check_ins_expires_at ON check_ins(expires_at);

-- Ladder
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_creator ON proposals(creator_id);
CREATE INDEX idx_proposals_expires ON proposals(expires_at);
CREATE INDEX idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_ladder_ratings_elo ON ladder_ratings(elo_rating DESC);
CREATE INDEX idx_ladder_members_user ON ladder_members(user_id);


-- ========================
-- 4. ROW LEVEL SECURITY
-- ========================

ALTER TABLE parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_ratings ENABLE ROW LEVEL SECURITY;

-- Parks
CREATE POLICY "Parks are viewable by everyone" ON parks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add parks" ON parks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Intents
CREATE POLICY "Intents are viewable by everyone" ON intents FOR SELECT USING (true);
CREATE POLICY "Users can create intents" ON intents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own intents" ON intents FOR DELETE USING (auth.uid() = user_id);

-- Check-ins
CREATE POLICY "Check-ins are viewable by everyone" ON check_ins FOR SELECT USING (true);
CREATE POLICY "Users can create check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own check-ins" ON check_ins FOR DELETE USING (auth.uid() = user_id);

-- Ladder members
CREATE POLICY "Ladder members viewable by everyone" ON ladder_members FOR SELECT USING (true);
CREATE POLICY "Users can register themselves" ON ladder_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON ladder_members FOR UPDATE USING (auth.uid() = user_id);

-- Proposals
CREATE POLICY "Proposals viewable by everyone" ON proposals FOR SELECT USING (true);
CREATE POLICY "Users can create proposals" ON proposals FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own proposals" ON proposals FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = accepted_by);
CREATE POLICY "Users can delete own proposals" ON proposals FOR DELETE USING (auth.uid() = creator_id);

-- Matches
CREATE POLICY "Matches viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Players can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Players can update their matches" ON matches FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Players can delete their matches" ON matches FOR DELETE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Ladder ratings
CREATE POLICY "Ratings viewable by everyone" ON ladder_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own rating" ON ladder_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating" ON ladder_ratings FOR UPDATE USING (auth.uid() = user_id);


-- ========================
-- 5. REALTIME
-- ========================

ALTER PUBLICATION supabase_realtime ADD TABLE intents;
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
