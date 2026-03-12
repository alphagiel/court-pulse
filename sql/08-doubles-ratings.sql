-- ============================================================
-- 08: Separate singles/doubles ratings
-- ============================================================

-- Add mode column (default 'singles' for existing rows)
ALTER TABLE ladder_ratings ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'singles' NOT NULL;

-- Drop old unique constraint on user_id alone
ALTER TABLE ladder_ratings DROP CONSTRAINT IF EXISTS ladder_ratings_user_id_key;

-- Add new unique constraint on (user_id, mode)
ALTER TABLE ladder_ratings ADD CONSTRAINT ladder_ratings_user_id_mode_key UNIQUE (user_id, mode);

-- Create doubles rating rows for all existing users (copy skill-based ELO, 0 wins/losses)
INSERT INTO ladder_ratings (user_id, elo_rating, wins, losses, mode, season)
SELECT user_id, elo_rating, 0, 0, 'doubles', season
FROM ladder_ratings
WHERE mode = 'singles'
ON CONFLICT (user_id, mode) DO NOTHING;

-- Update index to include mode
DROP INDEX IF EXISTS idx_ladder_ratings_elo;
CREATE INDEX idx_ladder_ratings_elo ON ladder_ratings (mode, elo_rating DESC);
