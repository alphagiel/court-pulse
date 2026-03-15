-- =============================================================================
-- Feedback — user-submitted feedback with admin reply
-- Run AFTER 13-*.sql (or latest migration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can submit their own feedback
CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- All authenticated users can read (admin page gates access in the app)
CREATE POLICY "Authenticated users can view feedback"
  ON feedback FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can update (admin page gates access in the app)
CREATE POLICY "Authenticated users can update feedback"
  ON feedback FOR UPDATE
  USING (auth.uid() IS NOT NULL);
