-- Weekly cleanup: delete expired proposals and their related data
-- Run in Supabase SQL Editor to set up the cron job

-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;

-- Delete proposals (and cascade to signups) where proposed_time has passed
-- and status is still open/forming/pairing (not accepted/cancelled)
-- Runs every Sunday at 3:00 AM UTC
select cron.schedule(
  'cleanup-expired-proposals',
  '0 3 * * 0',
  $$
    delete from proposals
    where proposed_time < now()
      and status in ('open', 'forming', 'pairing');
  $$
);
