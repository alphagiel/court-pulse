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

-- RLS
alter table playoff_teams enable row level security;

drop policy if exists "playoff_teams_select" on playoff_teams;
create policy "playoff_teams_select" on playoff_teams for select using (true);
drop policy if exists "playoff_teams_insert" on playoff_teams;
create policy "playoff_teams_insert" on playoff_teams for insert to authenticated with check (true);

-- Realtime
do $$ begin
  alter publication supabase_realtime add table playoff_teams;
exception when duplicate_object then null;
end $$;
