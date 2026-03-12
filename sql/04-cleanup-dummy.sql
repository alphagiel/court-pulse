-- ============================================================
-- Court Pulse — Remove All Dummy Data
-- ============================================================
-- Run in Supabase SQL Editor to clean up seed data from 03-seed-dummy.sql
--
-- Removes:
--   A. Dashboard dummy users (a0000001-0000-0000-0000-*)
--   B. Ladder dummy users (00000000-0000-0000-0000-*)
-- ============================================================


-- ############################################################
-- SECTION A: DASHBOARD DUMMY CLEANUP
-- ############################################################

DELETE FROM check_ins WHERE user_id::text LIKE 'a0000001-0000-0000-0000-%';
DELETE FROM intents WHERE user_id::text LIKE 'a0000001-0000-0000-0000-%';
DELETE FROM profiles WHERE id::text LIKE 'a0000001-0000-0000-0000-%';
DELETE FROM auth.users WHERE id::text LIKE 'a0000001-0000-0000-0000-%';


-- ############################################################
-- SECTION B: LADDER DUMMY CLEANUP
-- ############################################################

-- Matches first (FK to proposals + profiles)
DELETE FROM matches WHERE player1_id IN (
  SELECT id FROM profiles WHERE id::text LIKE '00000000-0000-0000-0000-%'
);

-- Proposal signups (FK to proposals + profiles)
DELETE FROM proposal_signups WHERE user_id IN (
  SELECT id FROM profiles WHERE id::text LIKE '00000000-0000-0000-0000-%'
);

-- Proposals (FK to profiles)
DELETE FROM proposals WHERE creator_id IN (
  SELECT id FROM profiles WHERE id::text LIKE '00000000-0000-0000-0000-%'
);

-- Ladder ratings (FK to profiles)
DELETE FROM ladder_ratings WHERE user_id IN (
  SELECT id FROM profiles WHERE id::text LIKE '00000000-0000-0000-0000-%'
);

-- Ladder members (FK to profiles)
DELETE FROM ladder_members WHERE user_id IN (
  SELECT id FROM profiles WHERE id::text LIKE '00000000-0000-0000-0000-%'
);

-- Profiles (FK to auth.users)
DELETE FROM profiles WHERE id::text LIKE '00000000-0000-0000-0000-%';

-- Auth users
DELETE FROM auth.users WHERE id::text LIKE '00000000-0000-0000-0000-%';
