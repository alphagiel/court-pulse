-- Court Pulse: Seed 5 more free outdoor pickleball courts in the Triangle
-- Run in Supabase SQL Editor
--
-- All courts are: free, outdoor, dedicated pickleball, first-come first-served

INSERT INTO parks (name, address, lat, lng, court_count) VALUES

  -- Hollybrook Park (Wendell) — 4 dedicated courts, opened 2025, dawn to dusk
  ('Hollybrook Park', '1209 S Hollybrook Rd, Wendell, NC 27591', 35.7725, -78.3650, 4),

  -- Wendell Park — 2 outdoor courts (shared nets), lit
  ('Wendell Park', '601 W 3rd St, Wendell, NC 27591', 35.7830, -78.3808, 2),

  -- Method Community Park (Raleigh) — 6 outdoor dedicated courts, free, lit
  ('Method Community Park', '514 Method Rd, Raleigh, NC 27607', 35.7842, -78.6756, 6),

  -- McCrimmon Parkway Park (Cary) — 6 dedicated courts, free, lit, most popular free spot in Cary
  ('McCrimmon Park', '3870 Cary Glen Blvd, Cary, NC 27519', 35.8275, -78.8785, 6),

  -- Ed Yerha Park (Cary) — 3 dedicated courts, free, no lights (sunrise to sunset)
  ('Ed Yerha Park', '1216 Jenks Carpenter Rd, Cary, NC 27519', 35.8033, -78.8178, 3);
