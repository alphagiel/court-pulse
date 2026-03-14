-- =============================================================================
-- Park Submissions — Community-sourced court suggestions
-- Run AFTER 11-email-preferences.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS park_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  court_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE park_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can submit
CREATE POLICY "Users can submit parks"
  ON park_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- All authenticated users can read (admin page gates access in the app)
CREATE POLICY "Authenticated users can view submissions"
  ON park_submissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can update (admin page gates access in the app)
CREATE POLICY "Authenticated users can update submissions"
  ON park_submissions FOR UPDATE
  USING (auth.uid() IS NOT NULL);
