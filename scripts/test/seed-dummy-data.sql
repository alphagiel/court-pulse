-- Court Pulse: Dummy test data
-- Run in Supabase SQL Editor to see how the UI looks with activity
--
-- Scenario:
--   Harper Park     → Crowded (7 players, 6 interested at various times)
--   Clayton CC      → Light activity (2 players, 3 interested)
--
-- To clean up: Run scripts/test/clear-dummy-data.sql

-- ============================================================
-- Fix Clayton court count
-- ============================================================
UPDATE parks SET court_count = 8 WHERE name = 'Clayton Community Center';

-- ============================================================
-- Create fake auth users + profiles for test data
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
-- HARPER PARK — 7 players checked in, 6 interested at various hours
-- ============================================================
INSERT INTO check_ins (user_id, park_id, skill_level, player_count, created_at, expires_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.0', 1, NOW() - INTERVAL '40 minutes', NOW() + INTERVAL '80 minutes'),
  ('a0000001-0000-0000-0000-000000000002', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '3.5', 1, NOW() - INTERVAL '38 minutes', NOW() + INTERVAL '82 minutes'),
  ('a0000001-0000-0000-0000-000000000003', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.0', 1, NOW() - INTERVAL '35 minutes', NOW() + INTERVAL '85 minutes'),
  ('a0000001-0000-0000-0000-000000000004', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '3.5', 1, NOW() - INTERVAL '20 minutes', NOW() + INTERVAL '100 minutes'),
  ('a0000001-0000-0000-0000-000000000005', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.5', 1, NOW() - INTERVAL '18 minutes', NOW() + INTERVAL '102 minutes'),
  ('a0000001-0000-0000-0000-000000000006', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '3.0', 1, NOW() - INTERVAL '8 minutes', NOW() + INTERVAL '112 minutes'),
  ('a0000001-0000-0000-0000-000000000007', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.0', 1, NOW() - INTERVAL '3 minutes', NOW() + INTERVAL '117 minutes');

-- Intents with target_time: 2 for Now, 2 for next hour, 2 for 2 hours out
INSERT INTO intents (user_id, park_id, skill_level, target_time, created_at, expires_at) VALUES
  -- 2 want to play NOW
  ('a0000001-0000-0000-0000-000000000008', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '3.5', NULL, NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '75 minutes'),
  ('a0000001-0000-0000-0000-000000000009', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.0', NULL, NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '80 minutes'),
  -- 2 want to play next hour
  ('a0000001-0000-0000-0000-000000000010', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.5', DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour', NOW() - INTERVAL '20 minutes', DATE_TRUNC('hour', NOW()) + INTERVAL '2 hours'),
  ('a0000001-0000-0000-0000-000000000014', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.0', DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour', NOW() - INTERVAL '5 minutes', DATE_TRUNC('hour', NOW()) + INTERVAL '2 hours'),
  -- 2 want to play 2 hours from now
  ('a0000001-0000-0000-0000-000000000015', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '3.5', DATE_TRUNC('hour', NOW()) + INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', DATE_TRUNC('hour', NOW()) + INTERVAL '3 hours'),
  ('a0000001-0000-0000-0000-000000000016', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.5', DATE_TRUNC('hour', NOW()) + INTERVAL '2 hours', NOW() - INTERVAL '12 minutes', DATE_TRUNC('hour', NOW()) + INTERVAL '3 hours');

-- ============================================================
-- CLAYTON COMMUNITY CENTER — 2 players, 3 interested (mixed times)
-- ============================================================
INSERT INTO check_ins (user_id, park_id, skill_level, player_count, created_at, expires_at) VALUES
  ('a0000001-0000-0000-0000-000000000011', '753f771c-aee2-4581-b5ec-334bd5468b2a', '3.0', 1, NOW() - INTERVAL '25 minutes', NOW() + INTERVAL '95 minutes'),
  ('a0000001-0000-0000-0000-000000000012', '753f771c-aee2-4581-b5ec-334bd5468b2a', '3.5', 1, NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '108 minutes');

INSERT INTO intents (user_id, park_id, skill_level, target_time, created_at, expires_at) VALUES
  -- 1 for now
  ('a0000001-0000-0000-0000-000000000013', '753f771c-aee2-4581-b5ec-334bd5468b2a', '3.0', NULL, NOW() - INTERVAL '6 minutes', NOW() + INTERVAL '84 minutes'),
  -- 1 for next hour
  ('a0000001-0000-0000-0000-000000000017', '753f771c-aee2-4581-b5ec-334bd5468b2a', '3.0', DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour', NOW() - INTERVAL '15 minutes', DATE_TRUNC('hour', NOW()) + INTERVAL '2 hours'),
  -- 1 for 3 hours out
  ('a0000001-0000-0000-0000-000000000018', '753f771c-aee2-4581-b5ec-334bd5468b2a', '4.0', DATE_TRUNC('hour', NOW()) + INTERVAL '3 hours', NOW() - INTERVAL '8 minutes', DATE_TRUNC('hour', NOW()) + INTERVAL '4 hours');
