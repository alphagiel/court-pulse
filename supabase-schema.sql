-- Court Pulse - Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Parks table (seeded manually at first)
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

-- Intents ("Let's Play" button - I want to play)
CREATE TABLE intents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES parks(id) ON DELETE CASCADE NOT NULL,
  skill_level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 minutes')
);

-- Check-ins ("I'm Here Now" - currently at the court)
CREATE TABLE check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES parks(id) ON DELETE CASCADE NOT NULL,
  skill_level TEXT NOT NULL,
  player_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Indexes for common queries
CREATE INDEX idx_intents_park_id ON intents(park_id);
CREATE INDEX idx_intents_expires_at ON intents(expires_at);
CREATE INDEX idx_check_ins_park_id ON check_ins(park_id);
CREATE INDEX idx_check_ins_expires_at ON check_ins(expires_at);

-- Row Level Security
ALTER TABLE parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Parks: anyone can read, only authenticated can insert
CREATE POLICY "Parks are viewable by everyone" ON parks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add parks" ON parks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Intents: anyone can read, authenticated can insert/delete own
CREATE POLICY "Intents are viewable by everyone" ON intents FOR SELECT USING (true);
CREATE POLICY "Users can create intents" ON intents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own intents" ON intents FOR DELETE USING (auth.uid() = user_id);

-- Check-ins: anyone can read, authenticated can insert/delete own
CREATE POLICY "Check-ins are viewable by everyone" ON check_ins FOR SELECT USING (true);
CREATE POLICY "Users can create check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own check-ins" ON check_ins FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for intents and check_ins
ALTER PUBLICATION supabase_realtime ADD TABLE intents;
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
