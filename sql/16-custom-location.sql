-- Allow proposals to have a custom location instead of a park FK
-- At least one of park_id or custom_location must be set

ALTER TABLE proposals ALTER COLUMN park_id DROP NOT NULL;

ALTER TABLE proposals ADD COLUMN custom_location TEXT;

ALTER TABLE proposals ADD CONSTRAINT proposals_location_check
  CHECK (park_id IS NOT NULL OR custom_location IS NOT NULL);
