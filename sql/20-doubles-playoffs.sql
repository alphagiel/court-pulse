-- ============================================================
-- 20-doubles-playoffs.sql — Team pairings for doubles playoffs
-- ============================================================

-- Allow seeds up to 16 for doubles (16 individuals → 8 teams)
alter table playoff_seeds drop constraint if exists playoff_seeds_seed_check;
alter table playoff_seeds add constraint playoff_seeds_seed_check check (seed between 1 and 16);

-- Paired teams for doubles brackets
create table if not exists playoff_teams (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references playoff_brackets(id) on delete cascade,
  seed int not null check (seed between 1 and 8),
  lead_id uuid not null references profiles(id),
  partner_id uuid not null references profiles(id),
  team_elo int not null,
  unique(bracket_id, seed),
  unique(bracket_id, lead_id),
  unique(bracket_id, partner_id)
);

create index if not exists idx_playoff_teams_bracket on playoff_teams(bracket_id);
create index if not exists idx_playoff_teams_lead on playoff_teams(lead_id);

-- RLS for playoff_teams
alter table playoff_teams enable row level security;

drop policy if exists "playoff_teams_select" on playoff_teams;
create policy "playoff_teams_select" on playoff_teams for select using (true);
drop policy if exists "playoff_teams_insert" on playoff_teams;
create policy "playoff_teams_insert" on playoff_teams for insert to authenticated with check (true);

-- DELETE policies for all playoff tables (needed for restart/cleanup)
drop policy if exists "playoff_brackets_delete" on playoff_brackets;
create policy "playoff_brackets_delete" on playoff_brackets for delete to authenticated using (true);

drop policy if exists "playoff_seeds_delete" on playoff_seeds;
create policy "playoff_seeds_delete" on playoff_seeds for delete to authenticated using (true);

drop policy if exists "playoff_matches_delete" on playoff_matches;
create policy "playoff_matches_delete" on playoff_matches for delete to authenticated using (true);

drop policy if exists "playoff_teams_delete" on playoff_teams;
create policy "playoff_teams_delete" on playoff_teams for delete to authenticated using (true);

-- Allow any authenticated user to update/delete matches linked to playoffs (admin actions)
drop policy if exists "Playoff match update" on matches;
create policy "Playoff match update" on matches for update to authenticated using (
  id in (select match_id from playoff_matches where match_id is not null)
);
drop policy if exists "Playoff match delete" on matches;
create policy "Playoff match delete" on matches for delete to authenticated using (
  id in (select match_id from playoff_matches where match_id is not null)
);

-- Realtime
do $$ begin
  alter publication supabase_realtime add table playoff_teams;
exception when duplicate_object then null;
end $$;
