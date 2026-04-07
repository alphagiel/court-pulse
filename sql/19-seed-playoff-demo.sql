-- 19-seed-playoff-demo.sql — Complete playoff demo data
-- ============================================================
-- Creates 60 dummy players (20 per tier) with ladder ratings,
-- then builds 6 playoff brackets (3 tiers × singles + doubles)
-- with realistic scores through the semifinals.
--
-- UUID pattern: b0000000-0000-0000-0000-00000000XXXX
-- Users 1-20:  Beginner   (1-10 = 2.5, 11-20 = 3.0)
-- Users 21-40: Intermediate (21-30 = 3.5, 31-40 = 4.0)
-- Users 41-60: Advanced   (41-50 = 4.5, 51-60 = 5.0)
--
-- Idempotent: safe to re-run (uses ON CONFLICT for users/ratings,
-- deletes and recreates brackets on each run).
--
-- To clean up: run sql/99-cleanup-all-demo.sql
-- ============================================================
-- ============================================================
-- 1. Auth users (60)
-- ============================================================
INSERT INTO
  auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    instance_id,
    aud,
    role
  )
SELECT
  (
    'b0000000-0000-0000-0000-' || LPAD(i :: text, 12, '0')
  ) :: uuid,
  'playoff' || i || '@courtpulse.test',
  '$2a$10$dummyhashdummyhashdummyhashdummyhashdu',
  NOW(),
  NOW(),
  NOW(),
  '00000000-0000-0000-0000-000000000000' :: uuid,
  'authenticated',
  'authenticated'
FROM
  generate_series(1, 60) AS i ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Profiles
-- ============================================================
-- Beginner 2.5 (users 1-10)
INSERT INTO
  profiles (id, username, skill_level)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'BronzeBart',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'CopperCate',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'IronIvy',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'SteelStan',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'TinTed',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'PebblePeg',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000007',
    'CoalCole',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    'FlintFlo',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000009',
    'SlateSkye',
    '2.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000010',
    'RustRex',
    '2.5'
  ) ON CONFLICT (id) DO NOTHING;

-- Beginner 3.0 (users 11-20)
INSERT INTO
  profiles (id, username, skill_level)
VALUES
  (
    'b0000000-0000-0000-0000-000000000011',
    'NickelNate',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000012',
    'LeadLena',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000013',
    'ZincZara',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000014',
    'BrassBoris',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000015',
    'ChromeChi',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000016',
    'CobaltCam',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000017',
    'WirelessWes',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000018',
    'PixelPia',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000019',
    'GearGus',
    '3.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000020',
    'BoltBella',
    '3.0'
  ) ON CONFLICT (id) DO NOTHING;

-- Intermediate 3.5 (users 21-30)
INSERT INTO
  profiles (id, username, skill_level)
VALUES
  (
    'b0000000-0000-0000-0000-000000000021',
    'MidMason',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000022',
    'CoreCora',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000023',
    'PivotPete',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000024',
    'HingHanna',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000025',
    'LinkLuke',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000026',
    'NodeNina',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000027',
    'AxleAdam',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000028',
    'GritGrace',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000029',
    'BaseBeau',
    '3.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000030',
    'HubHolly',
    '3.5'
  ) ON CONFLICT (id) DO NOTHING;

-- Intermediate 4.0 (users 31-40)
INSERT INTO
  profiles (id, username, skill_level)
VALUES
  (
    'b0000000-0000-0000-0000-000000000031',
    'RocketRob',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000032',
    'JetJade',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000033',
    'TurboTim',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000034',
    'NitroNell',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000035',
    'BlazeBurt',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000036',
    'ArrowAria',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000037',
    'FlareFinn',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000038',
    'SonicSara',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000039',
    'WarpWade',
    '4.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000040',
    'DashDina',
    '4.0'
  ) ON CONFLICT (id) DO NOTHING;

-- Advanced 4.5 (users 41-50)
INSERT INTO
  profiles (id, username, skill_level)
VALUES
  (
    'b0000000-0000-0000-0000-000000000041',
    'AceAaron',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000042',
    'BladeBree',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000043',
    'FangFeliz',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000044',
    'HawkHugo',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000045',
    'OnyxOpal',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000046',
    'SaberSage',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000047',
    'TalonTess',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000048',
    'ViperVoss',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000049',
    'WolfWren',
    '4.5'
  ),
  (
    'b0000000-0000-0000-0000-000000000050',
    'ZephyrZed',
    '4.5'
  ) ON CONFLICT (id) DO NOTHING;

-- Advanced 5.0 (users 51-60)
INSERT INTO
  profiles (id, username, skill_level)
VALUES
  (
    'b0000000-0000-0000-0000-000000000051',
    'TitanTate',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000052',
    'NovaNeela',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000053',
    'PhoenixPax',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000054',
    'HelixHaze',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000055',
    'PrismPru',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000056',
    'QuasarQuin',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000057',
    'RuneRiva',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000058',
    'StellarSol',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000059',
    'OrbitOra',
    '5.0'
  ),
  (
    'b0000000-0000-0000-0000-000000000060',
    'CosmoCru',
    '5.0'
  ) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Ladder members
-- ============================================================
INSERT INTO
  ladder_members (user_id, season, status)
SELECT
  (
    'b0000000-0000-0000-0000-' || LPAD(i :: text, 12, '0')
  ) :: uuid,
  'Spring',
  'active'
FROM
  generate_series(1, 60) AS i ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 4. Ladder ratings (singles) — spread of ELO within each tier
-- ============================================================
-- Beginner 2.5 (users 1-10): ELO 650-900
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    900,
    10,
    3,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    870,
    9,
    4,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    840,
    8,
    4,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    810,
    7,
    5,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    780,
    6,
    5,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    750,
    5,
    6,
    NOW() - interval '4 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000007',
    720,
    4,
    6,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    700,
    3,
    7,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000009',
    680,
    2,
    7,
    NOW() - interval '6 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000010',
    650,
    1,
    8,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ) ON CONFLICT (user_id, mode) DO NOTHING;

-- Beginner 3.0 (users 11-20): ELO 950-1150
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
VALUES
  (
    'b0000000-0000-0000-0000-000000000011',
    1150,
    12,
    2,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000012',
    1120,
    11,
    3,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000013',
    1090,
    10,
    4,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000014',
    1060,
    9,
    5,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000015',
    1030,
    8,
    5,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000016',
    1010,
    7,
    6,
    NOW() - interval '4 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000017',
    990,
    6,
    6,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000018',
    975,
    5,
    7,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000019',
    960,
    4,
    7,
    NOW() - interval '6 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000020',
    950,
    3,
    8,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ) ON CONFLICT (user_id, mode) DO NOTHING;

-- Intermediate 3.5 (users 21-30): ELO 1100-1350
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
VALUES
  (
    'b0000000-0000-0000-0000-000000000021',
    1350,
    14,
    3,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000022',
    1320,
    13,
    4,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000023',
    1290,
    12,
    4,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000024',
    1260,
    11,
    5,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000025',
    1230,
    10,
    5,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000026',
    1200,
    9,
    6,
    NOW() - interval '4 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000027',
    1170,
    8,
    6,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000028',
    1150,
    7,
    7,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000029',
    1120,
    6,
    7,
    NOW() - interval '6 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000030',
    1100,
    5,
    8,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ) ON CONFLICT (user_id, mode) DO NOTHING;

-- Intermediate 4.0 (users 31-40): ELO 1350-1550
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
VALUES
  (
    'b0000000-0000-0000-0000-000000000031',
    1550,
    16,
    2,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000032',
    1520,
    15,
    3,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000033',
    1490,
    14,
    4,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000034',
    1460,
    13,
    5,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000035',
    1430,
    12,
    5,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000036',
    1410,
    11,
    6,
    NOW() - interval '4 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000037',
    1390,
    10,
    6,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000038',
    1375,
    9,
    7,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000039',
    1360,
    8,
    7,
    NOW() - interval '6 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000040',
    1350,
    7,
    8,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ) ON CONFLICT (user_id, mode) DO NOTHING;

-- Advanced 4.5 (users 41-50): ELO 1500-1800
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
VALUES
  (
    'b0000000-0000-0000-0000-000000000041',
    1800,
    20,
    2,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000042',
    1760,
    18,
    3,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000043',
    1720,
    17,
    4,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000044',
    1680,
    16,
    5,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000045',
    1640,
    15,
    5,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000046',
    1600,
    14,
    6,
    NOW() - interval '4 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000047',
    1560,
    12,
    6,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000048',
    1540,
    11,
    7,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000049',
    1520,
    10,
    7,
    NOW() - interval '6 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000050',
    1500,
    9,
    8,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ) ON CONFLICT (user_id, mode) DO NOTHING;

-- Advanced 5.0 (users 51-60): ELO 1750-2000
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
VALUES
  (
    'b0000000-0000-0000-0000-000000000051',
    2000,
    24,
    1,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000052',
    1960,
    22,
    2,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000053',
    1920,
    20,
    3,
    NOW() - interval '1 day',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000054',
    1880,
    18,
    4,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000055',
    1850,
    17,
    5,
    NOW() - interval '2 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000056',
    1820,
    16,
    6,
    NOW() - interval '4 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000057',
    1800,
    15,
    6,
    NOW() - interval '3 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000058',
    1780,
    14,
    7,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000059',
    1760,
    13,
    7,
    NOW() - interval '6 days',
    'Spring',
    'singles'
  ),
  (
    'b0000000-0000-0000-0000-000000000060',
    1750,
    12,
    8,
    NOW() - interval '5 days',
    'Spring',
    'singles'
  ) ON CONFLICT (user_id, mode) DO NOTHING;

-- ============================================================
-- 5. Doubles ratings (mirror singles with slight variation)
-- ============================================================
INSERT INTO
  ladder_ratings (
    user_id,
    elo_rating,
    wins,
    losses,
    last_played,
    season,
    mode
  )
SELECT
  (
    'b0000000-0000-0000-0000-' || LPAD(i :: text, 12, '0')
  ) :: uuid,
  -- Doubles ELO = singles ELO + small random offset (-30 to +30)
  CASE
    WHEN i <= 10 THEN 650 + (i * 25) + ((i % 7) * 5 - 15)
    WHEN i <= 20 THEN 950 + ((i -10) * 20) + ((i % 7) * 5 - 15)
    WHEN i <= 30 THEN 1100 + ((i -20) * 25) + ((i % 7) * 5 - 15)
    WHEN i <= 40 THEN 1350 + ((i -30) * 20) + ((i % 7) * 5 - 15)
    WHEN i <= 50 THEN 1500 + ((i -40) * 30) + ((i % 7) * 5 - 15)
    ELSE 1750 + ((i -50) * 25) + ((i % 7) * 5 - 15)
  END,
  GREATEST(1, (i % 12) + 3),
  GREATEST(1, (i % 8) + 1),
  NOW() - ((i % 7) || ' days') :: interval,
  'Spring',
  'doubles'
FROM
  generate_series(1, 60) AS i ON CONFLICT (user_id, mode) DO NOTHING;

-- ============================================================
-- 6. Playoff brackets with scores
-- ============================================================
-- Clean any existing brackets first
DELETE FROM playoff_brackets;
DELETE FROM proposals WHERE location_name = 'Playoff Match';

DO $$
DECLARE
  _tier text;
  _mode text;
  _bracket_id uuid;
  _proposal_id uuid;

  _players uuid[];
  _elos int[];

  -- QF seeding: 1v8, 4v5, 3v6, 2v7
  _qf_s1 int[] := ARRAY[1,4,3,2];
  _qf_s2 int[] := ARRAY[8,5,6,7];

  _match_id uuid;
  _pm_id uuid;
  _qf_winners uuid[4];
  _p1_scores int[];
  _p2_scores int[];
  _winner_idx int;
  _winning_team text;

  _team_leads uuid[8];
  _team_partners uuid[8];

  _sf_match_id uuid;

  _skill_levels text[];
  _beginner_levels text[] := ARRAY['2.5','3.0'];
  _intermediate_levels text[] := ARRAY['3.5','4.0'];
  _advanced_levels text[] := ARRAY['4.5','5.0'];

BEGIN
  FOREACH _tier IN ARRAY ARRAY['beginner','intermediate','advanced']
  LOOP
    IF _tier = 'beginner' THEN _skill_levels := _beginner_levels;
    ELSIF _tier = 'intermediate' THEN _skill_levels := _intermediate_levels;
    ELSE _skill_levels := _advanced_levels;
    END IF;

    FOREACH _mode IN ARRAY ARRAY['singles','doubles']
    LOOP
      RAISE NOTICE '=== Creating % % bracket ===', _tier, _mode;

      -- Get top players
      IF _mode = 'singles' THEN
        SELECT array_agg(r.user_id ORDER BY r.elo_rating DESC),
               array_agg(r.elo_rating ORDER BY r.elo_rating DESC)
        INTO _players, _elos
        FROM (
          SELECT lr.user_id, lr.elo_rating
          FROM ladder_ratings lr
          JOIN profiles p ON p.id = lr.user_id
          WHERE lr.mode = 'singles' AND p.skill_level = ANY(_skill_levels)
          ORDER BY lr.elo_rating DESC LIMIT 8
        ) r;

        IF array_length(_players, 1) IS NULL OR array_length(_players, 1) < 8 THEN
          RAISE NOTICE '  Skipping % singles — not enough players', _tier;
          CONTINUE;
        END IF;
      ELSE
        SELECT array_agg(r.user_id ORDER BY r.elo_rating DESC),
               array_agg(r.elo_rating ORDER BY r.elo_rating DESC)
        INTO _players, _elos
        FROM (
          SELECT lr.user_id, lr.elo_rating
          FROM ladder_ratings lr
          JOIN profiles p ON p.id = lr.user_id
          WHERE lr.mode = 'doubles' AND p.skill_level = ANY(_skill_levels)
          ORDER BY lr.elo_rating DESC LIMIT 16
        ) r;

        IF array_length(_players, 1) IS NULL OR array_length(_players, 1) < 16 THEN
          RAISE NOTICE '  Skipping % doubles — not enough players', _tier;
          CONTINUE;
        END IF;
      END IF;

      -- Create bracket
      INSERT INTO playoff_brackets (season, tier, mode, status)
      VALUES ('Spring', _tier, _mode, 'active')
      RETURNING id INTO _bracket_id;

      -- Create seeds
      IF _mode = 'singles' THEN
        FOR i IN 1..8 LOOP
          INSERT INTO playoff_seeds (bracket_id, user_id, seed, elo_at_seed)
          VALUES (_bracket_id, _players[i], i, _elos[i]);
        END LOOP;
      ELSE
        FOR i IN 1..16 LOOP
          INSERT INTO playoff_seeds (bracket_id, user_id, seed, elo_at_seed)
          VALUES (_bracket_id, _players[i], i, _elos[i]);
        END LOOP;

        -- Straight-pair teams: 1+2, 3+4, ..., 15+16
        FOR i IN 1..8 LOOP
          _team_leads[i] := _players[(i-1)*2 + 1];
          _team_partners[i] := _players[(i-1)*2 + 2];
          INSERT INTO playoff_teams (bracket_id, seed, lead_id, partner_id, team_elo)
          VALUES (_bracket_id, i, _team_leads[i], _team_partners[i],
                  (_elos[(i-1)*2 + 1] + _elos[(i-1)*2 + 2]) / 2);
        END LOOP;
      END IF;

      -- Create proposal
      INSERT INTO proposals (creator_id, location_name, proposed_time, message, status, accepted_by, accepted_at, mode, expires_at)
      VALUES (_players[1], 'Playoff Match', NOW() + interval '7 days', 'Playoff: ' || _tier,
        'accepted', _players[2], NOW(), _mode, NOW() + interval '30 days')
      RETURNING id INTO _proposal_id;

      -- QF matches with scores
      FOR i IN 1..4 LOOP
        DECLARE
          _p1 uuid; _p2 uuid; _p1_partner uuid; _p2_partner uuid;
        BEGIN
          IF _mode = 'singles' THEN
            _p1 := _players[_qf_s1[i]]; _p2 := _players[_qf_s2[i]];
          ELSE
            _p1 := _team_leads[_qf_s1[i]]; _p2 := _team_leads[_qf_s2[i]];
            _p1_partner := _team_partners[_qf_s1[i]]; _p2_partner := _team_partners[_qf_s2[i]];
          END IF;

          CASE i
            WHEN 1 THEN _p1_scores := ARRAY[11,11];   _p2_scores := ARRAY[7,5];    _winner_idx := 1;
            WHEN 2 THEN _p1_scores := ARRAY[9,11,9];  _p2_scores := ARRAY[11,8,11]; _winner_idx := 2;
            WHEN 3 THEN _p1_scores := ARRAY[11,11];   _p2_scores := ARRAY[6,9];    _winner_idx := 1;
            WHEN 4 THEN _p1_scores := ARRAY[11,11];   _p2_scores := ARRAY[4,7];    _winner_idx := 1;
          END CASE;

          IF _winner_idx = 1 THEN _qf_winners[i] := _p1; _winning_team := 'a';
          ELSE _qf_winners[i] := _p2; _winning_team := 'b'; END IF;

          IF _mode = 'singles' THEN
            INSERT INTO matches (proposal_id, player1_id, player2_id, mode, status,
              player1_scores, player2_scores, winner_id, submitted_by, confirmed_by, played_at)
            VALUES (_proposal_id, _p1, _p2, 'singles', 'confirmed',
              _p1_scores, _p2_scores, _qf_winners[i], _p1, _p2,
              NOW() - interval '3 days' + (i || ' hours')::interval)
            RETURNING id INTO _match_id;
          ELSE
            INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id,
              mode, status, player1_scores, player2_scores, winning_team, submitted_by, confirmed_by, played_at)
            VALUES (_proposal_id, _p1, _p1_partner, _p2, _p2_partner,
              'doubles', 'confirmed', _p1_scores, _p2_scores, _winning_team, _p1, _p2,
              NOW() - interval '3 days' + (i || ' hours')::interval)
            RETURNING id INTO _match_id;
          END IF;

          INSERT INTO playoff_matches (bracket_id, round, position, match_id,
            player1_id, player2_id, winner_id, forfeit_deadline)
          VALUES (_bracket_id, 1, i, _match_id, _p1, _p2, _qf_winners[i], NOW() + interval '2 days');
        END;
      END LOOP;

      -- SF1: scored (p1 wins)
      _p1_scores := ARRAY[11,9,11]; _p2_scores := ARRAY[9,11,6];

      IF _mode = 'singles' THEN
        INSERT INTO matches (proposal_id, player1_id, player2_id, mode, status,
          player1_scores, player2_scores, winner_id, submitted_by, confirmed_by, played_at)
        VALUES (_proposal_id, _qf_winners[1], _qf_winners[2], 'singles', 'confirmed',
          _p1_scores, _p2_scores, _qf_winners[1], _qf_winners[1], _qf_winners[2], NOW() - interval '1 day')
        RETURNING id INTO _sf_match_id;
      ELSE
        DECLARE _sf_p1_partner uuid; _sf_p2_partner uuid;
        BEGIN
          SELECT partner_id INTO _sf_p1_partner FROM playoff_teams WHERE bracket_id = _bracket_id AND lead_id = _qf_winners[1];
          SELECT partner_id INTO _sf_p2_partner FROM playoff_teams WHERE bracket_id = _bracket_id AND lead_id = _qf_winners[2];
          INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id,
            mode, status, player1_scores, player2_scores, winning_team, submitted_by, confirmed_by, played_at)
          VALUES (_proposal_id, _qf_winners[1], _sf_p1_partner, _qf_winners[2], _sf_p2_partner,
            'doubles', 'confirmed', _p1_scores, _p2_scores, 'a', _qf_winners[1], _qf_winners[2], NOW() - interval '1 day')
          RETURNING id INTO _sf_match_id;
        END;
      END IF;

      INSERT INTO playoff_matches (bracket_id, round, position, match_id,
        player1_id, player2_id, winner_id, forfeit_deadline)
      VALUES (_bracket_id, 2, 1, _sf_match_id, _qf_winners[1], _qf_winners[2], _qf_winners[1], NOW() + interval '2 days');

      -- SF2: pending
      IF _mode = 'singles' THEN
        INSERT INTO matches (proposal_id, player1_id, player2_id, mode, status)
        VALUES (_proposal_id, _qf_winners[3], _qf_winners[4], 'singles', 'pending')
        RETURNING id INTO _sf_match_id;
      ELSE
        DECLARE _sf2_p1_partner uuid; _sf2_p2_partner uuid;
        BEGIN
          SELECT partner_id INTO _sf2_p1_partner FROM playoff_teams WHERE bracket_id = _bracket_id AND lead_id = _qf_winners[3];
          SELECT partner_id INTO _sf2_p2_partner FROM playoff_teams WHERE bracket_id = _bracket_id AND lead_id = _qf_winners[4];
          INSERT INTO matches (proposal_id, player1_id, player2_id, player3_id, player4_id, mode, status)
          VALUES (_proposal_id, _qf_winners[3], _sf2_p1_partner, _qf_winners[4], _sf2_p2_partner, 'doubles', 'pending')
          RETURNING id INTO _sf_match_id;
        END;
      END IF;

      INSERT INTO playoff_matches (bracket_id, round, position, match_id,
        player1_id, player2_id, forfeit_deadline)
      VALUES (_bracket_id, 2, 2, _sf_match_id, _qf_winners[3], _qf_winners[4], NOW() + interval '2 days');

      -- Final: SF1 winner vs TBD
      INSERT INTO playoff_matches (bracket_id, round, position, player1_id)
      VALUES (_bracket_id, 3, 1, _qf_winners[1]);

      RAISE NOTICE '=== Done: % % ===', _tier, _mode;
    END LOOP;
  END LOOP;
END $$;