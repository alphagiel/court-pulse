-- 19-seed-playoff-demo.sql — Playoff demo data
-- ============================================================
-- Creates 20 players per tier (60 total) with ladder ratings,
-- ready for admin to trigger playoffs via the UI.
--
-- UUID pattern: b0000000-0000-0000-0000-00000000XXXX
-- Users 1-20:  Beginner   (1-10 = 2.5, 11-20 = 3.0)
-- Users 21-40: Intermediate (21-30 = 3.5, 31-40 = 4.0)
-- Users 41-60: Advanced   (41-50 = 4.5, 51-60 = 5.0)
--
-- To clean up: DELETE WHERE id LIKE 'b0000000-%'
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