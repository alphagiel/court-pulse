-- ============================================================
-- Court Pulse — Doubles RLS Fixes
-- ============================================================
-- Fixes proposal_signups RLS so that:
-- 1. Proposal creators can update any signup in their proposal (team assignments)
-- 2. Any authenticated user in a proposal can update their own signup (confirm)
-- ============================================================

-- Allow proposal creator to update any signup in their proposal
-- (needed for team assignment changes during pairing phase)
DROP POLICY IF EXISTS "Users can update own signup" ON proposal_signups;
CREATE POLICY "Users can update own or creator can update" ON proposal_signups
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_signups.proposal_id
        AND proposals.creator_id = auth.uid()
    )
  );

-- Update proposal RLS to also allow pairing status updates by any authenticated user
-- and allow partner_id user to update (for decline action)
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
CREATE POLICY "Users can update own proposals" ON proposals FOR UPDATE USING (
  auth.uid() = creator_id
  OR auth.uid() = partner_id
  OR auth.uid() = accepted_by
  OR auth.uid() = acceptor_partner_id
  OR (status IN ('open', 'forming', 'pairing') AND auth.role() = 'authenticated')
);
