-- ============================================================
-- 99-cleanup-all-demo.sql — Remove all demo/dummy data
-- ============================================================
-- Removes:
--   - All playoff brackets, seeds, teams, matches
--   - All dummy users (a0000000-* from 03-seed-dummy.sql)
--   - All playoff demo users (b0000000-* from 19-seed-playoff-demo.sql)
-- Keeps: real users, admin, organic signups
-- ============================================================

-- 1. Clean up playoff data
DELETE FROM matches WHERE proposal_id IN (
  SELECT id FROM proposals WHERE location_name = 'Playoff Match'
);
DELETE FROM playoff_brackets;
DELETE FROM proposals WHERE location_name = 'Playoff Match';

-- 2. Delete dummy ladder data
DELETE FROM ladder_ratings WHERE user_id::text LIKE 'a0000000-%' OR user_id::text LIKE 'b0000000-%';
DELETE FROM ladder_members WHERE user_id::text LIKE 'a0000000-%' OR user_id::text LIKE 'b0000000-%';

-- 3. Delete dummy profiles
DELETE FROM profiles WHERE id::text LIKE 'a0000000-%' OR id::text LIKE 'b0000000-%';

-- 4. Delete dummy auth users
DELETE FROM auth.users WHERE id::text LIKE 'a0000000-%' OR id::text LIKE 'b0000000-%';
