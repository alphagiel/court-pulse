-- Migration: Replace park_id + custom_location with location_name + location_address on proposals
-- This removes the dependency on the parks table for proposals

-- Add new columns
ALTER TABLE proposals ADD COLUMN location_name TEXT;
ALTER TABLE proposals ADD COLUMN location_address TEXT;

-- Migrate existing data: park_id → park name/address, custom_location → location_name
UPDATE proposals p
SET location_name = parks.name,
    location_address = parks.address
FROM parks
WHERE p.park_id = parks.id;

UPDATE proposals
SET location_name = custom_location
WHERE park_id IS NULL AND custom_location IS NOT NULL;

-- Make location_name required going forward
ALTER TABLE proposals ALTER COLUMN location_name SET NOT NULL;

-- Drop old columns and constraint
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_location_check;
ALTER TABLE proposals DROP COLUMN park_id;
ALTER TABLE proposals DROP COLUMN custom_location;
