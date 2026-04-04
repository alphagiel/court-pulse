-- ============================================================
-- 18-playoffs.sql — Playoff bracket system
-- ============================================================

-- One bracket per tier/season/mode
create table if not exists playoff_brackets (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  tier text not null,
  mode text not null default 'singles',
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  champion_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(season, tier, mode)
);

-- Snapshot of top 8 at bracket creation
create table if not exists playoff_seeds (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references playoff_brackets(id) on delete cascade,
  user_id uuid not null references profiles(id),
  seed int not null check (seed between 1 and 8),
  elo_at_seed int not null,
  unique(bracket_id, seed),
  unique(bracket_id, user_id)
);

-- 7 match slots per bracket (4 QF + 2 SF + 1 Final)
create table if not exists playoff_matches (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references playoff_brackets(id) on delete cascade,
  round int not null check (round between 1 and 3),
  position int not null,
  match_id uuid references matches(id),
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  winner_id uuid references profiles(id),
  forfeit boolean not null default false,
  forfeit_deadline timestamptz,
  created_at timestamptz not null default now(),
  unique(bracket_id, round, position)
);

-- Indexes
create index if not exists idx_playoff_brackets_season_tier on playoff_brackets(season, tier, mode);
create index if not exists idx_playoff_seeds_bracket on playoff_seeds(bracket_id);
create index if not exists idx_playoff_matches_bracket on playoff_matches(bracket_id);
create index if not exists idx_playoff_matches_match_id on playoff_matches(match_id);

-- RLS
alter table playoff_brackets enable row level security;
alter table playoff_seeds enable row level security;
alter table playoff_matches enable row level security;

-- Read: everyone
drop policy if exists "playoff_brackets_select" on playoff_brackets;
create policy "playoff_brackets_select" on playoff_brackets for select using (true);
drop policy if exists "playoff_seeds_select" on playoff_seeds;
create policy "playoff_seeds_select" on playoff_seeds for select using (true);
drop policy if exists "playoff_matches_select" on playoff_matches;
create policy "playoff_matches_select" on playoff_matches for select using (true);

-- Write: authenticated
drop policy if exists "playoff_brackets_insert" on playoff_brackets;
create policy "playoff_brackets_insert" on playoff_brackets for insert to authenticated with check (true);
drop policy if exists "playoff_brackets_update" on playoff_brackets;
create policy "playoff_brackets_update" on playoff_brackets for update to authenticated using (true);
drop policy if exists "playoff_seeds_insert" on playoff_seeds;
create policy "playoff_seeds_insert" on playoff_seeds for insert to authenticated with check (true);
drop policy if exists "playoff_matches_insert" on playoff_matches;
create policy "playoff_matches_insert" on playoff_matches for insert to authenticated with check (true);
drop policy if exists "playoff_matches_update" on playoff_matches;
create policy "playoff_matches_update" on playoff_matches for update to authenticated using (true);

-- Realtime (ignore if already added)
do $$ begin
  alter publication supabase_realtime add table playoff_brackets;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table playoff_matches;
exception when duplicate_object then null;
end $$;
