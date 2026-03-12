-- =============================================================================
-- Email Notifications — Throttle table only
-- Triggers are handled via Supabase Database Webhooks (configured in dashboard)
-- Run AFTER 08-doubles-ratings.sql
-- =============================================================================

-- Throttle table: prevents spamming the same user for the same event type
CREATE TABLE IF NOT EXISTS email_throttle (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_type)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_email_throttle_last_sent ON email_throttle(last_sent_at);

-- RLS: only service role should access this table (edge functions use service role)
ALTER TABLE email_throttle ENABLE ROW LEVEL SECURITY;
-- No public policies — only service_role can read/write
