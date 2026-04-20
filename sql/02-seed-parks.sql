-- ============================================================
-- Court Pulse Tennis — Seed Parks
-- ============================================================
-- Run AFTER 01-schema.sql
-- Public tennis courts in the Raleigh / Triangle area.
-- ============================================================

INSERT INTO parks (name, address, lat, lng, court_count) VALUES

  -- Raleigh
  ('Millbrook Exchange Park', '1905 Spring Forest Rd, Raleigh, NC 27615', 35.8636, -78.6267, 8),
  ('Optimist Park', '1700 Lake Wheeler Rd, Raleigh, NC 27603', 35.7605, -78.6596, 6),
  ('Fallon Park', '3800 Carya Dr, Raleigh, NC 27610', 35.7858, -78.5851, 4),

  -- Cary
  ('Cary Tennis Park', '2838 Kildaire Farm Rd, Cary, NC 27518', 35.7580, -78.8015, 10),
  ('McCrimmon Park', '3870 Cary Glen Blvd, Cary, NC 27519', 35.8275, -78.8785, 4),

  -- Durham
  ('Cole Mill Park', '1020 Cole Mill Rd, Durham, NC 27705', 36.0270, -79.0123, 6),

  -- Chapel Hill
  ('Southern Community Park', '1 Sumac Rd, Chapel Hill, NC 27516', 35.8833, -79.0605, 6)

ON CONFLICT DO NOTHING;
