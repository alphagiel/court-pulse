-- ============================================================
-- Court Pulse — Schema Patches
-- ============================================================
-- Run these AFTER 01-schema.sql on existing deployments.
-- Each patch fixes an issue discovered post-deploy.
-- Safe to re-run (uses DROP IF EXISTS / OR REPLACE).
-- ============================================================


-- ============================================================
-- PATCH 1: Fix proposal accept RLS policy
-- ============================================================
-- Problem: The original UPDATE policy on proposals only allowed
--   creator_id or accepted_by to update. But when a user accepts
--   an open proposal, accepted_by is still NULL — so the update
--   is silently blocked by RLS (returns 0 rows, no error).
--
-- Fix: Also allow any authenticated user to update proposals
--   that are still in 'open' status (i.e., to accept them).
--   Once accepted, only creator or acceptor can modify.
-- ============================================================

DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
CREATE POLICY "Users can update own proposals" ON proposals FOR UPDATE USING (
  auth.uid() = creator_id
  OR auth.uid() = accepted_by
  OR (status = 'open' AND auth.role() = 'authenticated')
);
