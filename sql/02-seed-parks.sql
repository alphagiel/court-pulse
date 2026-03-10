-- ============================================================
-- Court Pulse — Seed Parks
-- ============================================================
-- Run AFTER 01-schema.sql
-- Free outdoor pickleball courts in the Raleigh / Triangle area.
-- ============================================================

INSERT INTO parks (name, address, lat, lng, court_count) VALUES

  -- Raleigh
  ('Harper Park', '2025 Harper Park Dr, Raleigh, NC 27603', 35.7340, -78.6500, 4),
  ('Method Community Park', '514 Method Rd, Raleigh, NC 27607', 35.7842, -78.6756, 6),

  -- Clayton
  ('Clayton Community Center', '715 Amelia Church Rd, Clayton, NC 27520', 35.6505, -78.4564, 8),

  -- Wendell
  ('Hollybrook Park', '1209 S Hollybrook Rd, Wendell, NC 27591', 35.7725, -78.3650, 4),
  ('Wendell Park', '601 W 3rd St, Wendell, NC 27591', 35.7830, -78.3808, 2),

  -- Cary
  ('McCrimmon Park', '3870 Cary Glen Blvd, Cary, NC 27519', 35.8275, -78.8785, 6),
  ('Ed Yerha Park', '1216 Jenks Carpenter Rd, Cary, NC 27519', 35.8033, -78.8178, 3)

ON CONFLICT DO NOTHING;
