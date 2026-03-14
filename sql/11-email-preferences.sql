-- =============================================================================
-- Email Preferences — User opt-in/out controls
-- Run AFTER 10-cleanup-cron.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  singles_emails BOOLEAN NOT NULL DEFAULT true,
  doubles_emails BOOLEAN NOT NULL DEFAULT true,
  digest_emails  BOOLEAN NOT NULL DEFAULT true,
  all_emails     BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can read/write their own preferences
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role also needs access (edge functions check preferences before sending)
-- Service role bypasses RLS by default, so no extra policy needed.
