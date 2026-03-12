-- ============================================================
-- Court Pulse — Dummy Seed Data
-- ============================================================
-- Run AFTER 01-schema.sql and 02-seed-parks.sql
--
-- Creates dummy users for testing:
--   A. Dashboard data (18 users with check-ins/intents)
--   B. Ladder data (90 users with ratings, proposals, matches)
--
-- UUID patterns:
--   Dashboard: a0000001-0000-0000-0000-00000000XXXX
--   Ladder:    00000000-0000-0000-0000-00000000XXXX
--
-- To clean up: run 04-cleanup-dummy.sql
-- ============================================================


-- ############################################################
-- SECTION A: DASHBOARD DUMMY DATA
-- ############################################################
-- Scenario:
--   Harper Park     → Crowded (7 playing, 6 interested)
--   Clayton CC      → Light (2 playing, 3 interested)
-- ############################################################

-- Fix Clayton court count
UPDATE parks SET court_count = 8 WHERE name = 'Clayton Community Center';

-- ============================================================
-- A1. Dashboard auth users (18)
-- ============================================================
INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at, instance_id, encrypted_password, confirmation_token)
SELECT
  id, email, '{}'::jsonb, 'authenticated', 'authenticated', NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000', '', ''
FROM (VALUES
  ('a0000001-0000-0000-0000-000000000001'::uuid, 'dummy01@test.com'),
  ('a0000001-0000-0000-0000-000000000002'::uuid, 'dummy02@test.com'),
  ('a0000001-0000-0000-0000-000000000003'::uuid, 'dummy03@test.com'),
  ('a0000001-0000-0000-0000-000000000004'::uuid, 'dummy04@test.com'),
  ('a0000001-0000-0000-0000-000000000005'::uuid, 'dummy05@test.com'),
  ('a0000001-0000-0000-0000-000000000006'::uuid, 'dummy06@test.com'),
  ('a0000001-0000-0000-0000-000000000007'::uuid, 'dummy07@test.com'),
  ('a0000001-0000-0000-0000-000000000008'::uuid, 'dummy08@test.com'),
  ('a0000001-0000-0000-0000-000000000009'::uuid, 'dummy09@test.com'),
  ('a0000001-0000-0000-0000-000000000010'::uuid, 'dummy10@test.com'),
  ('a0000001-0000-0000-0000-000000000011'::uuid, 'dummy11@test.com'),
  ('a0000001-0000-0000-0000-000000000012'::uuid, 'dummy12@test.com'),
  ('a0000001-0000-0000-0000-000000000013'::uuid, 'dummy13@test.com'),
  ('a0000001-0000-0000-0000-000000000014'::uuid, 'dummy14@test.com'),
  ('a0000001-0000-0000-0000-000000000015'::uuid, 'dummy15@test.com'),
  ('a0000001-0000-0000-0000-000000000016'::uuid, 'dummy16@test.com'),
  ('a0000001-0000-0000-0000-000000000017'::uuid, 'dummy17@test.com'),
  ('a0000001-0000-0000-0000-000000000018'::uuid, 'dummy18@test.com')
) AS t(id, email)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- A2. Dashboard profiles
-- ============================================================
INSERT INTO profiles (id, username, skill_level) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'player01', '4.0'),
  ('a0000001-0000-0000-0000-000000000002', 'player02', '3.5'),
  ('a0000001-0000-0000-0000-000000000003', 'player03', '4.0'),
  ('a0000001-0000-0000-0000-000000000004', 'player04', '3.5'),
  ('a0000001-0000-0000-0000-000000000005', 'player05', '4.5'),
  ('a0000001-0000-0000-0000-000000000006', 'player06', '3.0'),
  ('a0000001-0000-0000-0000-000000000007', 'player07', '4.0'),
  ('a0000001-0000-0000-0000-000000000008', 'player08', '3.5'),
  ('a0000001-0000-0000-0000-000000000009', 'player09', '4.0'),
  ('a0000001-0000-0000-0000-000000000010', 'player10', '4.5'),
  ('a0000001-0000-0000-0000-000000000011', 'player11', '3.0'),
  ('a0000001-0000-0000-0000-000000000012', 'player12', '3.5'),
  ('a0000001-0000-0000-0000-000000000013', 'player13', '3.0'),
  ('a0000001-0000-0000-0000-000000000014', 'player14', '4.0'),
  ('a0000001-0000-0000-0000-000000000015', 'player15', '3.5'),
  ('a0000001-0000-0000-0000-000000000016', 'player16', '4.5'),
  ('a0000001-0000-0000-0000-000000000017', 'player17', '3.0'),
  ('a0000001-0000-0000-0000-000000000018', 'player18', '4.0')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- A3. Harper Park — 7 checked in, 6 interested
-- ============================================================
-- NOTE: Replace park UUIDs below with your actual park IDs from Supabase.
-- These are example UUIDs from a specific deployment.

INSERT INTO check_ins (user_id, park_id, skill_level, player_count, created_at, expires_at)
SELECT u.user_id, p.id, u.skill, 1, NOW() - u.ago, NOW() - u.ago + INTERVAL '2 hours'
FROM parks p,
(VALUES
  ('a0000001-0000-0000-0000-000000000001'::uuid, '4.0', INTERVAL '40 minutes'),
  ('a0000001-0000-0000-0000-000000000002'::uuid, '3.5', INTERVAL '38 minutes'),
  ('a0000001-0000-0000-0000-000000000003'::uuid, '4.0', INTERVAL '35 minutes'),
  ('a0000001-0000-0000-0000-000000000004'::uuid, '3.5', INTERVAL '20 minutes'),
  ('a0000001-0000-0000-0000-000000000005'::uuid, '4.5', INTERVAL '18 minutes'),
  ('a0000001-0000-0000-0000-000000000006'::uuid, '3.0', INTERVAL '8 minutes'),
  ('a0000001-0000-0000-0000-000000000007'::uuid, '4.0', INTERVAL '3 minutes')
) AS u(user_id, skill, ago)
WHERE p.name = 'Harper Park';

INSERT INTO intents (user_id, park_id, skill_level, created_at, expires_at)
SELECT u.user_id, p.id, u.skill, NOW() - u.ago, NOW() - u.ago + INTERVAL '90 minutes'
FROM parks p,
(VALUES
  ('a0000001-0000-0000-0000-000000000008'::uuid, '3.5', INTERVAL '15 minutes'),
  ('a0000001-0000-0000-0000-000000000009'::uuid, '4.0', INTERVAL '10 minutes'),
  ('a0000001-0000-0000-0000-000000000010'::uuid, '4.5', INTERVAL '20 minutes'),
  ('a0000001-0000-0000-0000-000000000014'::uuid, '4.0', INTERVAL '5 minutes'),
  ('a0000001-0000-0000-0000-000000000015'::uuid, '3.5', INTERVAL '30 minutes'),
  ('a0000001-0000-0000-0000-000000000016'::uuid, '4.5', INTERVAL '12 minutes')
) AS u(user_id, skill, ago)
WHERE p.name = 'Harper Park';

-- ============================================================
-- A4. Clayton Community Center — 2 checked in, 3 interested
-- ============================================================
INSERT INTO check_ins (user_id, park_id, skill_level, player_count, created_at, expires_at)
SELECT u.user_id, p.id, u.skill, 1, NOW() - u.ago, NOW() - u.ago + INTERVAL '2 hours'
FROM parks p,
(VALUES
  ('a0000001-0000-0000-0000-000000000011'::uuid, '3.0', INTERVAL '25 minutes'),
  ('a0000001-0000-0000-0000-000000000012'::uuid, '3.5', INTERVAL '12 minutes')
) AS u(user_id, skill, ago)
WHERE p.name = 'Clayton Community Center';

INSERT INTO intents (user_id, park_id, skill_level, created_at, expires_at)
SELECT u.user_id, p.id, u.skill, NOW() - u.ago, NOW() - u.ago + INTERVAL '90 minutes'
FROM parks p,
(VALUES
  ('a0000001-0000-0000-0000-000000000013'::uuid, '3.0', INTERVAL '6 minutes'),
  ('a0000001-0000-0000-0000-000000000017'::uuid, '3.0', INTERVAL '15 minutes'),
  ('a0000001-0000-0000-0000-000000000018'::uuid, '4.0', INTERVAL '8 minutes')
) AS u(user_id, skill, ago)
WHERE p.name = 'Clayton Community Center';


-- ############################################################
-- SECTION B: LADDER DUMMY DATA (90 players, ~30 per tier)
-- ############################################################
-- Tiers:
--   Beginner (2.5-3.0):     users 1-30
--   Intermediate (3.5-4.0): users 31-60
--   Advanced (4.5-5.0):     users 61-90
-- ############################################################

-- ============================================================
-- B1. Ladder auth users (90)
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
SELECT
  ('00000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::uuid,
  'dummy' || i || '@courtpulse.test',
  '$2a$10$dummyhashdummyhashdummyhashdummyhashdu',
  NOW(), NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated'
FROM generate_series(1, 90) AS i
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- B2. Ladder profiles
-- ============================================================

-- Beginner 2.5 (users 1-15)
INSERT INTO profiles (id, username, skill_level) VALUES
  ('00000000-0000-0000-0000-000000000001', 'PaddlePete', '2.5'),
  ('00000000-0000-0000-0000-000000000002', 'DinkDiana', '2.5'),
  ('00000000-0000-0000-0000-000000000003', 'NewbNate', '2.5'),
  ('00000000-0000-0000-0000-000000000004', 'KitchenKara', '2.5'),
  ('00000000-0000-0000-0000-000000000005', 'LobLarry', '2.5'),
  ('00000000-0000-0000-0000-000000000006', 'ServeSally', '2.5'),
  ('00000000-0000-0000-0000-000000000007', 'VolleyVince', '2.5'),
  ('00000000-0000-0000-0000-000000000008', 'RallyRita', '2.5'),
  ('00000000-0000-0000-0000-000000000009', 'SpinSteve', '2.5'),
  ('00000000-0000-0000-0000-000000000010', 'BounceBarb', '2.5'),
  ('00000000-0000-0000-0000-000000000011', 'NetNancy', '2.5'),
  ('00000000-0000-0000-0000-000000000012', 'CourtCarl', '2.5'),
  ('00000000-0000-0000-0000-000000000013', 'AceAmanda', '2.5'),
  ('00000000-0000-0000-0000-000000000014', 'SmashSam', '2.5'),
  ('00000000-0000-0000-0000-000000000015', 'DropDave', '2.5')
ON CONFLICT (id) DO NOTHING;

-- Beginner 3.0 (users 16-30)
INSERT INTO profiles (id, username, skill_level) VALUES
  ('00000000-0000-0000-0000-000000000016', 'FreshFrank', '3.0'),
  ('00000000-0000-0000-0000-000000000017', 'GreenGina', '3.0'),
  ('00000000-0000-0000-0000-000000000018', 'HustleHank', '3.0'),
  ('00000000-0000-0000-0000-000000000019', 'JabJulia', '3.0'),
  ('00000000-0000-0000-0000-000000000020', 'QuickQuinn', '3.0'),
  ('00000000-0000-0000-0000-000000000021', 'TapTina', '3.0'),
  ('00000000-0000-0000-0000-000000000022', 'ZoneZach', '3.0'),
  ('00000000-0000-0000-0000-000000000023', 'FlipFiona', '3.0'),
  ('00000000-0000-0000-0000-000000000024', 'DashDan', '3.0'),
  ('00000000-0000-0000-0000-000000000025', 'PopPenny', '3.0'),
  ('00000000-0000-0000-0000-000000000026', 'SwingScott', '3.0'),
  ('00000000-0000-0000-0000-000000000027', 'ChipChris', '3.0'),
  ('00000000-0000-0000-0000-000000000028', 'PickPat', '3.0'),
  ('00000000-0000-0000-0000-000000000029', 'BangBeth', '3.0'),
  ('00000000-0000-0000-0000-000000000030', 'RushRoy', '3.0')
ON CONFLICT (id) DO NOTHING;

-- Intermediate 3.5 (users 31-45)
INSERT INTO profiles (id, username, skill_level) VALUES
  ('00000000-0000-0000-0000-000000000031', 'SolidMike', '3.5'),
  ('00000000-0000-0000-0000-000000000032', 'SteadyLisa', '3.5'),
  ('00000000-0000-0000-0000-000000000033', 'ControlCurt', '3.5'),
  ('00000000-0000-0000-0000-000000000034', 'PlacePaula', '3.5'),
  ('00000000-0000-0000-0000-000000000035', 'AngleTom', '3.5'),
  ('00000000-0000-0000-0000-000000000036', 'ResetRosa', '3.5'),
  ('00000000-0000-0000-0000-000000000037', 'PaceBrad', '3.5'),
  ('00000000-0000-0000-0000-000000000038', 'DriveDebby', '3.5'),
  ('00000000-0000-0000-0000-000000000039', 'ThirdJake', '3.5'),
  ('00000000-0000-0000-0000-000000000040', 'SliceJen', '3.5'),
  ('00000000-0000-0000-0000-000000000041', 'MixMarcus', '3.5'),
  ('00000000-0000-0000-0000-000000000042', 'StackSue', '3.5'),
  ('00000000-0000-0000-0000-000000000043', 'FlowFred', '3.5'),
  ('00000000-0000-0000-0000-000000000044', 'ReadRachel', '3.5'),
  ('00000000-0000-0000-0000-000000000045', 'PushPaul', '3.5')
ON CONFLICT (id) DO NOTHING;

-- Intermediate 4.0 (users 46-60)
INSERT INTO profiles (id, username, skill_level) VALUES
  ('00000000-0000-0000-0000-000000000046', 'PowerMel', '4.0'),
  ('00000000-0000-0000-0000-000000000047', 'CrushKyle', '4.0'),
  ('00000000-0000-0000-0000-000000000048', 'FireFelicia', '4.0'),
  ('00000000-0000-0000-0000-000000000049', 'BlastBen', '4.0'),
  ('00000000-0000-0000-0000-000000000050', 'StrikeSteph', '4.0'),
  ('00000000-0000-0000-0000-000000000051', 'RipRick', '4.0'),
  ('00000000-0000-0000-0000-000000000052', 'TwistTara', '4.0'),
  ('00000000-0000-0000-0000-000000000053', 'HammerHugh', '4.0'),
  ('00000000-0000-0000-0000-000000000054', 'SnapNicole', '4.0'),
  ('00000000-0000-0000-0000-000000000055', 'JoltJason', '4.0'),
  ('00000000-0000-0000-0000-000000000056', 'EdgeEmily', '4.0'),
  ('00000000-0000-0000-0000-000000000057', 'ClutchCody', '4.0'),
  ('00000000-0000-0000-0000-000000000058', 'PrimePreston', '4.0'),
  ('00000000-0000-0000-0000-000000000059', 'WaveWendy', '4.0'),
  ('00000000-0000-0000-0000-000000000060', 'PeakPeter', '4.0')
ON CONFLICT (id) DO NOTHING;

-- Advanced 4.5 (users 61-75)
INSERT INTO profiles (id, username, skill_level) VALUES
  ('00000000-0000-0000-0000-000000000061', 'EliteEric', '4.5'),
  ('00000000-0000-0000-0000-000000000062', 'ProPriya', '4.5'),
  ('00000000-0000-0000-0000-000000000063', 'AlphaAlex', '4.5'),
  ('00000000-0000-0000-0000-000000000064', 'SharpShawn', '4.5'),
  ('00000000-0000-0000-0000-000000000065', 'VenomVera', '4.5'),
  ('00000000-0000-0000-0000-000000000066', 'TitanTroy', '4.5'),
  ('00000000-0000-0000-0000-000000000067', 'FuryFaith', '4.5'),
  ('00000000-0000-0000-0000-000000000068', 'BeastBryan', '4.5'),
  ('00000000-0000-0000-0000-000000000069', 'ClawCara', '4.5'),
  ('00000000-0000-0000-0000-000000000070', 'SurgeSimon', '4.5'),
  ('00000000-0000-0000-0000-000000000071', 'RazorRuby', '4.5'),
  ('00000000-0000-0000-0000-000000000072', 'ApexAndy', '4.5'),
  ('00000000-0000-0000-0000-000000000073', 'StormSasha', '4.5'),
  ('00000000-0000-0000-0000-000000000074', 'IronIan', '4.5'),
  ('00000000-0000-0000-0000-000000000075', 'BoltBianca', '4.5')
ON CONFLICT (id) DO NOTHING;

-- Advanced 5.0 (users 76-90)
INSERT INTO profiles (id, username, skill_level) VALUES
  ('00000000-0000-0000-0000-000000000076', 'KingKen', '5.0'),
  ('00000000-0000-0000-0000-000000000077', 'QueenQuiana', '5.0'),
  ('00000000-0000-0000-0000-000000000078', 'LegendLiam', '5.0'),
  ('00000000-0000-0000-0000-000000000079', 'MavenMaya', '5.0'),
  ('00000000-0000-0000-0000-000000000080', 'ChampCharlie', '5.0'),
  ('00000000-0000-0000-0000-000000000081', 'ReignRae', '5.0'),
  ('00000000-0000-0000-0000-000000000082', 'ZenithZane', '5.0'),
  ('00000000-0000-0000-0000-000000000083', 'CrownCleo', '5.0'),
  ('00000000-0000-0000-0000-000000000084', 'PinnaclePat', '5.0'),
  ('00000000-0000-0000-0000-000000000085', 'OmegaOlivia', '5.0'),
  ('00000000-0000-0000-0000-000000000086', 'VanguardVic', '5.0'),
  ('00000000-0000-0000-0000-000000000087', 'SovereignSyd', '5.0'),
  ('00000000-0000-0000-0000-000000000088', 'NexusNova', '5.0'),
  ('00000000-0000-0000-0000-000000000089', 'AuraAsh', '5.0'),
  ('00000000-0000-0000-0000-000000000090', 'ThroneTheo', '5.0')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- B3. Ladder members + ratings
-- ============================================================
INSERT INTO ladder_members (user_id, season, status)
SELECT
  ('00000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::uuid,
  '2026-spring', 'active'
FROM generate_series(1, 90) AS i
ON CONFLICT (user_id) DO NOTHING;

-- Beginner 2.5: ELO 650-900 (singles)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000001', 880, 8, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000002', 850, 7, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000003', 720, 3, 6, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000004', 810, 6, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000005', 760, 4, 5, NOW() - interval '5 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000006', 690, 2, 7, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000007', 830, 7, 3, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000008', 770, 5, 5, NOW() - interval '6 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000009', 900, 9, 2, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000010', 740, 3, 4, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000011', 680, 1, 5, NULL, '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000012', 800, 5, 3, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000013', 860, 8, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000014', 790, 4, 4, NOW() - interval '7 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000015', 650, 1, 8, NOW() - interval '5 days', '2026-spring', 'singles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Beginner 3.0: ELO 900-1100 (singles)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000016', 1080, 10, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000017', 1050, 9, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000018', 980, 6, 5, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000019', 1020, 8, 4, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000020', 940, 5, 6, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000021', 1100, 12, 2, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000022', 960, 7, 6, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000023', 910, 4, 5, NOW() - interval '5 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000024', 1000, 7, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000025', 970, 6, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000026', 930, 4, 4, NOW() - interval '6 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000027', 1060, 9, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000028', 900, 3, 5, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000029', 1040, 8, 3, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000030', 990, 6, 4, NOW() - interval '3 days', '2026-spring', 'singles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Intermediate 3.5: ELO 1100-1350 (singles)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000031', 1320, 14, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000032', 1280, 12, 5, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000033', 1200, 8, 6, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000034', 1250, 10, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000035', 1180, 7, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000036', 1150, 6, 6, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000037', 1300, 13, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000038', 1220, 9, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000039', 1130, 5, 5, NOW() - interval '5 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000040', 1260, 11, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000041', 1170, 7, 6, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000042', 1350, 15, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000043', 1190, 8, 5, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000044', 1240, 10, 6, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000045', 1100, 4, 6, NOW() - interval '6 days', '2026-spring', 'singles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Intermediate 4.0: ELO 1300-1550 (singles)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000046', 1520, 16, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000047', 1480, 14, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000048', 1440, 13, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000049', 1400, 11, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000050', 1380, 10, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000051', 1550, 18, 2, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000052', 1360, 9, 5, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000053', 1420, 12, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000054', 1340, 8, 6, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000055', 1460, 14, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000056', 1500, 15, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000057', 1300, 7, 6, NOW() - interval '5 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000058', 1380, 10, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000059', 1320, 8, 5, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000060', 1440, 12, 4, NOW() - interval '2 days', '2026-spring', 'singles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Advanced 4.5: ELO 1500-1750 (singles)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000061', 1720, 20, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000062', 1680, 18, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000063', 1650, 16, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000064', 1600, 14, 5, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000065', 1580, 13, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000066', 1750, 22, 2, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000067', 1560, 12, 6, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000068', 1620, 15, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000069', 1540, 11, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000070', 1700, 19, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000071', 1500, 10, 7, NOW() - interval '5 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000072', 1640, 16, 4, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000073', 1570, 13, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000074', 1520, 11, 6, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000075', 1610, 15, 5, NOW() - interval '2 days', '2026-spring', 'singles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Advanced 5.0: ELO 1700-1950 (singles)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000076', 1920, 24, 2, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000077', 1880, 22, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000078', 1950, 26, 1, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000079', 1850, 20, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000080', 1820, 19, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000081', 1780, 17, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000082', 1900, 23, 2, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000083', 1760, 16, 5, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000084', 1840, 20, 3, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000085', 1800, 18, 4, NOW() - interval '2 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000086', 1700, 14, 6, NOW() - interval '5 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000087', 1740, 15, 5, NOW() - interval '4 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000088', 1860, 21, 3, NOW() - interval '1 day', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000089', 1720, 15, 6, NOW() - interval '3 days', '2026-spring', 'singles'),
  ('00000000-0000-0000-0000-000000000090', 1790, 17, 4, NOW() - interval '2 days', '2026-spring', 'singles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- ============================================================
-- B3b. Doubles ratings (different ELO/wins/losses from singles)
-- ============================================================

-- Beginner 2.5: Doubles ELO 700-950
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000001', 920, 6, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000002', 810, 4, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000003', 750, 2, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000004', 870, 5, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000005', 790, 3, 3, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000006', 710, 1, 5, NOW() - interval '6 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000007', 880, 5, 2, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000008', 820, 4, 3, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000009', 950, 7, 1, NOW() - interval '1 day', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000010', 770, 2, 3, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000011', 700, 0, 4, NULL, '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000012', 840, 4, 2, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000013', 890, 6, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000014', 830, 3, 3, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000015', 720, 1, 5, NOW() - interval '6 days', '2026-spring', 'doubles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Beginner 3.0: Doubles ELO 950-1150
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000016', 1120, 8, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000017', 1080, 7, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000018', 1010, 5, 4, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000019', 1060, 6, 3, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000020', 980, 4, 5, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000021', 1150, 9, 1, NOW() - interval '1 day', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000022', 990, 5, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000023', 950, 3, 4, NOW() - interval '6 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000024', 1040, 6, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000025', 1000, 5, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000026', 970, 3, 3, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000027', 1100, 7, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000028', 960, 2, 4, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000029', 1090, 7, 2, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000030', 1030, 5, 3, NOW() - interval '4 days', '2026-spring', 'doubles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Intermediate 3.5: Doubles ELO 1150-1400
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000031', 1370, 10, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000032', 1320, 9, 4, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000033', 1240, 6, 5, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000034', 1290, 8, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000035', 1210, 5, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000036', 1180, 4, 5, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000037', 1350, 10, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000038', 1260, 7, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000039', 1170, 4, 4, NOW() - interval '6 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000040', 1300, 9, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000041', 1200, 5, 5, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000042', 1400, 12, 2, NOW() - interval '1 day', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000043', 1230, 6, 4, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000044', 1280, 8, 5, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000045', 1150, 3, 5, NOW() - interval '5 days', '2026-spring', 'doubles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Intermediate 4.0: Doubles ELO 1350-1600
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000046', 1560, 12, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000047', 1520, 11, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000048', 1480, 10, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000049', 1440, 9, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000050', 1420, 8, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000051', 1600, 14, 1, NOW() - interval '1 day', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000052', 1400, 7, 4, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000053', 1460, 10, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000054', 1380, 6, 5, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000055', 1500, 11, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000056', 1540, 12, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000057', 1350, 5, 5, NOW() - interval '6 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000058', 1420, 8, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000059', 1370, 6, 4, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000060', 1480, 10, 3, NOW() - interval '3 days', '2026-spring', 'doubles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Advanced 4.5: Doubles ELO 1550-1800
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000061', 1770, 16, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000062', 1730, 14, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000063', 1700, 13, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000064', 1650, 11, 4, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000065', 1630, 10, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000066', 1800, 18, 1, NOW() - interval '1 day', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000067', 1610, 9, 5, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000068', 1670, 12, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000069', 1590, 8, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000070', 1750, 15, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000071', 1550, 7, 6, NOW() - interval '6 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000072', 1690, 13, 3, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000073', 1620, 10, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000074', 1570, 8, 5, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000075', 1660, 12, 4, NOW() - interval '3 days', '2026-spring', 'doubles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- Advanced 5.0: Doubles ELO 1750-2000
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, last_played, season, mode) VALUES
  ('00000000-0000-0000-0000-000000000076', 1970, 20, 1, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000077', 1930, 18, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000078', 2000, 22, 0, NOW() - interval '1 day', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000079', 1900, 16, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000080', 1870, 15, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000081', 1830, 14, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000082', 1950, 19, 1, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000083', 1810, 13, 4, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000084', 1890, 17, 2, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000085', 1850, 15, 3, NOW() - interval '3 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000086', 1750, 11, 5, NOW() - interval '6 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000087', 1790, 12, 4, NOW() - interval '5 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000088', 1910, 18, 2, NOW() - interval '2 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000089', 1770, 12, 5, NOW() - interval '4 days', '2026-spring', 'doubles'),
  ('00000000-0000-0000-0000-000000000090', 1840, 14, 3, NOW() - interval '3 days', '2026-spring', 'doubles')
ON CONFLICT (user_id, mode) DO NOTHING;

-- ============================================================
-- B4. Proposals (open + accepted across tiers)
-- ============================================================

-- Beginner proposals (open)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000001', p.id, NOW() + interval '2 days', 'Looking for a friendly match!', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000016', p.id, NOW() + interval '1 day', 'Saturday morning game?', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000005', p.id, NOW() + interval '3 days', NULL, 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000020', p.id, NOW() + interval '1 day' + interval '4 hours', 'After work match', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

-- Beginner accepted proposal
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000009', p.id, NOW() + interval '1 day', 'Lets go!', 'accepted',
  '00000000-0000-0000-0000-000000000002', NOW() - interval '2 hours', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

-- Intermediate proposals (open)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000031', p.id, NOW() + interval '1 day', 'Ready for a challenge', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000046', p.id, NOW() + interval '2 days', 'Evening game at 6?', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000038', p.id, NOW() + interval '3 days', NULL, 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000050', p.id, NOW() + interval '1 day', 'Top 10 matchup?', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000042', p.id, NOW() + interval '2 days', 'Bring your A game', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

-- Intermediate accepted
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000047', p.id, NOW() + interval '1 day', 'Head to head', 'accepted',
  '00000000-0000-0000-0000-000000000032', NOW() - interval '1 hour', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

-- Advanced proposals (open)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000061', p.id, NOW() + interval '1 day', 'Who wants smoke?', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000076', p.id, NOW() + interval '2 days', 'King of the court', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000078', p.id, NOW() + interval '1 day', NULL, 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000066', p.id, NOW() + interval '3 days', 'Battle for #1', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at)
SELECT '00000000-0000-0000-0000-000000000070', p.id, NOW() + interval '2 days', 'Anytime this week', 'open', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

-- Advanced accepted
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000062', p.id, NOW() + interval '1 day', 'Rematch time', 'accepted',
  '00000000-0000-0000-0000-000000000077', NOW() - interval '30 minutes', NOW() + interval '48 hours'
FROM parks p ORDER BY random() LIMIT 1;

-- ============================================================
-- B5. Matches (pending from accepted proposals + historical)
-- ============================================================

-- Pending matches from accepted proposals
INSERT INTO matches (proposal_id, player1_id, player2_id, status)
SELECT p.id, p.creator_id, p.accepted_by, 'pending'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000009' AND p.status = 'accepted'
LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, status)
SELECT p.id, p.creator_id, p.accepted_by, 'pending'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000047' AND p.status = 'accepted'
LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, status)
SELECT p.id, p.creator_id, p.accepted_by, 'pending'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000062' AND p.status = 'accepted'
LIMIT 1;

-- Historical confirmed match (beginner)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000001', p.id, NOW() - interval '5 days', NULL, 'accepted',
  '00000000-0000-0000-0000-000000000016', NOW() - interval '5 days', NOW() - interval '3 days'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player1_scores, player2_scores,
  submitted_by, confirmed_by, status, winner_id, played_at)
SELECT p.id,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000016',
  ARRAY[11, 9, 11], ARRAY[7, 11, 8],
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000016',
  'confirmed', '00000000-0000-0000-0000-000000000001', NOW() - interval '5 days'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000001'
  AND p.accepted_by = '00000000-0000-0000-0000-000000000016'
LIMIT 1;

-- Historical confirmed match (intermediate)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000042', p.id, NOW() - interval '3 days', NULL, 'accepted',
  '00000000-0000-0000-0000-000000000046', NOW() - interval '3 days', NOW() - interval '1 day'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player1_scores, player2_scores,
  submitted_by, confirmed_by, status, winner_id, played_at)
SELECT p.id,
  '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000046',
  ARRAY[8, 11, 9], ARRAY[11, 6, 11],
  '00000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000042',
  'confirmed', '00000000-0000-0000-0000-000000000046', NOW() - interval '3 days'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000042'
  AND p.accepted_by = '00000000-0000-0000-0000-000000000046'
LIMIT 1;

-- Historical confirmed match (advanced)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000076', p.id, NOW() - interval '2 days', NULL, 'accepted',
  '00000000-0000-0000-0000-000000000078', NOW() - interval '2 days', NOW()
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player1_scores, player2_scores,
  submitted_by, confirmed_by, status, winner_id, played_at)
SELECT p.id,
  '00000000-0000-0000-0000-000000000076', '00000000-0000-0000-0000-000000000078',
  ARRAY[11, 11], ARRAY[9, 7],
  '00000000-0000-0000-0000-000000000076', '00000000-0000-0000-0000-000000000078',
  'confirmed', '00000000-0000-0000-0000-000000000076', NOW() - interval '2 days'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000076'
  AND p.accepted_by = '00000000-0000-0000-0000-000000000078'
LIMIT 1;

-- Disputed match (advanced)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000066', p.id, NOW() - interval '1 day', NULL, 'accepted',
  '00000000-0000-0000-0000-000000000061', NOW() - interval '1 day', NOW() + interval '1 day'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player1_scores, player2_scores,
  submitted_by, status, winner_id, played_at)
SELECT p.id,
  '00000000-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000061',
  ARRAY[11, 9, 11], ARRAY[8, 11, 9],
  '00000000-0000-0000-0000-000000000066',
  'disputed', '00000000-0000-0000-0000-000000000066', NOW() - interval '1 day'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000066'
  AND p.accepted_by = '00000000-0000-0000-0000-000000000061'
LIMIT 1;

-- Score submitted match waiting for confirm (intermediate)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, accepted_by, accepted_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000031', p.id, NOW() - interval '1 day', NULL, 'accepted',
  '00000000-0000-0000-0000-000000000048', NOW() - interval '1 day', NOW() + interval '1 day'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player1_scores, player2_scores,
  submitted_by, status, winner_id, played_at)
SELECT p.id,
  '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000048',
  ARRAY[11, 7, 11], ARRAY[9, 11, 5],
  '00000000-0000-0000-0000-000000000031',
  'score_submitted', '00000000-0000-0000-0000-000000000031', NOW() - interval '12 hours'
FROM proposals p
WHERE p.creator_id = '00000000-0000-0000-0000-000000000031'
  AND p.accepted_by = '00000000-0000-0000-0000-000000000048'
LIMIT 1;


-- ############################################################
-- SECTION C: DOUBLES DUMMY DATA
-- ############################################################

-- ============================================================
-- C1. Doubles proposals (open, with signups)
-- ============================================================

-- Beginner doubles proposal (open, 2 signups so far)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000009', p.id, NOW() + interval '2 days',
  'Doubles anyone? Need 3 more!', 'open', NOW() + interval '48 hours', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000009', 'creator', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000009' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000004', 'opponent', NOW() - interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000009' AND p.mode = 'doubles' LIMIT 1;

-- Beginner doubles proposal (open, 3 signups)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000016', p.id, NOW() + interval '1 day',
  'Saturday doubles!', 'open', NOW() + interval '48 hours', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000016', 'creator', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000016' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000021', 'opponent', NOW() - interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000016' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000027', 'opponent_partner', NOW() - interval '30 minutes'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000016' AND p.mode = 'doubles' LIMIT 1;

-- Intermediate doubles proposal (open, 1 signup — just creator)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000042', p.id, NOW() + interval '2 days',
  'Looking for doubles partners!', 'open', NOW() + interval '48 hours', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000042', 'creator', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000042' AND p.mode = 'doubles' AND p.status = 'open' LIMIT 1;

-- Intermediate doubles proposal (pairing, 4 signups with teams assigned)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000046', p.id, NOW() + interval '1 day',
  'Competitive doubles', 'pairing', NOW() + interval '48 hours', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000046', 'creator', 'a', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000046' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000054', 'opponent', 'b', NOW() - interval '3 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000046' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000051', 'opponent', 'a', NOW() - interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000046' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000038', 'opponent_partner', 'b', NOW() - interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000046' AND p.mode = 'doubles' LIMIT 1;

-- Advanced doubles proposal (open, 2 signups)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000066', p.id, NOW() + interval '3 days',
  'Elite doubles showdown', 'open', NOW() + interval '48 hours', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000066', 'creator', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000066' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000072', 'opponent', NOW() - interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000066' AND p.mode = 'doubles' LIMIT 1;

-- Advanced doubles proposal (open, 4 signups)
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000076', p.id, NOW() + interval '1 day',
  'Top dogs doubles', 'open', NOW() + interval '48 hours', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000076', 'creator', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000076' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000078', 'opponent', NOW() - interval '4 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000076' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000082', 'opponent', NOW() - interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000076' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000088', 'opponent_partner', NOW() - interval '30 minutes'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000076' AND p.mode = 'doubles' LIMIT 1;

-- ============================================================
-- C2. Doubles matches (historical confirmed + pending)
-- ============================================================

-- Historical confirmed doubles match (beginner) — Team A wins
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000001', p.id, NOW() - interval '4 days', NULL,
  'accepted', NOW() - interval '2 days', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000001', 'creator', 'a', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000001' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000013', 'opponent', 'a', p.created_at + interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000001' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000007', 'opponent', 'b', p.created_at + interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000001' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000012', 'opponent_partner', 'b', p.created_at + interval '3 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000001' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id,
  player1_scores, player2_scores, submitted_by, confirmed_by, status, winning_team, played_at, mode)
SELECT p.id,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000012',
  ARRAY[11, 9, 11], ARRAY[8, 11, 7],
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007',
  'confirmed', 'a', NOW() - interval '4 days', 'doubles'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000001' AND p.mode = 'doubles' LIMIT 1;

-- Historical confirmed doubles match (intermediate) — Team B wins
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000042', p.id, NOW() - interval '3 days', NULL,
  'accepted', NOW() - interval '1 day', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000042', 'creator', 'a', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000042' AND p.mode = 'doubles' AND p.status = 'accepted' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000055', 'opponent', 'a', p.created_at + interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000042' AND p.mode = 'doubles' AND p.status = 'accepted' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000047', 'opponent', 'b', p.created_at + interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000042' AND p.mode = 'doubles' AND p.status = 'accepted' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000037', 'opponent_partner', 'b', p.created_at + interval '3 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000042' AND p.mode = 'doubles' AND p.status = 'accepted' LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id,
  player1_scores, player2_scores, submitted_by, confirmed_by, status, winning_team, played_at, mode)
SELECT p.id,
  '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000055',
  '00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000037',
  ARRAY[7, 11, 8], ARRAY[11, 9, 11],
  '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000047',
  'confirmed', 'b', NOW() - interval '3 days', 'doubles'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000042' AND p.mode = 'doubles' AND p.status = 'accepted' LIMIT 1;

-- Historical confirmed doubles match (advanced) — Team A wins
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000078', p.id, NOW() - interval '2 days', NULL,
  'accepted', NOW(), 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000078', 'creator', 'a', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000078' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000086', 'opponent', 'a', p.created_at + interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000078' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000077', 'opponent', 'b', p.created_at + interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000078' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000082', 'opponent_partner', 'b', p.created_at + interval '3 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000078' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id,
  player1_scores, player2_scores, submitted_by, confirmed_by, status, winning_team, played_at, mode)
SELECT p.id,
  '00000000-0000-0000-0000-000000000078', '00000000-0000-0000-0000-000000000086',
  '00000000-0000-0000-0000-000000000077', '00000000-0000-0000-0000-000000000082',
  ARRAY[11, 11], ARRAY[8, 9],
  '00000000-0000-0000-0000-000000000078', '00000000-0000-0000-0000-000000000077',
  'confirmed', 'a', NOW() - interval '2 days', 'doubles'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000078' AND p.mode = 'doubles' LIMIT 1;

-- Pending doubles match (intermediate) — score not yet submitted
INSERT INTO proposals (creator_id, park_id, proposed_time, message, status, expires_at, mode)
SELECT '00000000-0000-0000-0000-000000000050', p.id, NOW() - interval '1 day', NULL,
  'accepted', NOW() + interval '1 day', 'doubles'
FROM parks p ORDER BY random() LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000050', 'creator', 'a', p.created_at
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000050' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000057', 'opponent', 'a', p.created_at + interval '1 hour'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000050' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000048', 'opponent', 'b', p.created_at + interval '2 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000050' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO proposal_signups (proposal_id, user_id, role, team, joined_at)
SELECT p.id, '00000000-0000-0000-0000-000000000034', 'opponent_partner', 'b', p.created_at + interval '3 hours'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000050' AND p.mode = 'doubles' LIMIT 1;

INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id, status, mode)
SELECT p.id,
  '00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000057',
  '00000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000034',
  'pending', 'doubles'
FROM proposals p WHERE p.creator_id = '00000000-0000-0000-0000-000000000050' AND p.mode = 'doubles' LIMIT 1;
