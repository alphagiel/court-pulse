-- =============================================================================
-- Admin delete policies — allow authenticated users to delete
-- (app gates admin access, RLS just allows the operation)
-- Run AFTER 14-feedback.sql
-- =============================================================================

CREATE POLICY "Authenticated users can delete submissions"
  ON park_submissions FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete feedback"
  ON feedback FOR DELETE
  USING (auth.uid() IS NOT NULL);
