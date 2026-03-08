-- Add a single evening intent to Harper Park for testing
-- Replaces any existing intent for this user

DELETE FROM intents WHERE user_id = 'a0000001-0000-0000-0000-000000000016';

INSERT INTO intents (user_id, park_id, skill_level, target_time, created_at, expires_at) VALUES
  ('a0000001-0000-0000-0000-000000000016', 'b41eb560-fb4a-46d3-9831-c487ff3f4f37', '4.5',
   DATE_TRUNC('hour', NOW()) + INTERVAL '6 hours',
   NOW() - INTERVAL '12 minutes',
   DATE_TRUNC('hour', NOW()) + INTERVAL '7 hours');
