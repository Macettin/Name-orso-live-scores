create table if not exists public.match_team_stats (
  match_id text not null references public.matches(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  tournament_id text not null references public.tournaments(id) on delete cascade default 'main-tournament',
  total_shots integer not null default 0 check (total_shots >= 0),
  shots_on_target integer not null default 0 check (shots_on_target >= 0),
  corners integer not null default 0 check (corners >= 0),
  fouls integer not null default 0 check (fouls >= 0),
  possession integer not null default 0 check (possession >= 0 and possession <= 100),
  yellow_cards integer not null default 0 check (yellow_cards >= 0),
  red_cards integer not null default 0 check (red_cards >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, team_id)
);

create index if not exists match_team_stats_tournament_id_idx on public.match_team_stats(tournament_id);
create index if not exists match_team_stats_match_id_idx on public.match_team_stats(match_id);
create index if not exists match_team_stats_team_id_idx on public.match_team_stats(team_id);

alter table public.match_team_stats enable row level security;

drop policy if exists "public read match team stats" on public.match_team_stats;
drop policy if exists "scorers write match team stats" on public.match_team_stats;
drop policy if exists "scorers update match team stats" on public.match_team_stats;
drop policy if exists "admins delete match team stats" on public.match_team_stats;

create policy "public read match team stats" on public.match_team_stats for select using (true);
create policy "scorers write match team stats" on public.match_team_stats for insert with check (public.can_score());
create policy "scorers update match team stats" on public.match_team_stats for update using (public.can_score()) with check (public.can_score());
create policy "admins delete match team stats" on public.match_team_stats for delete using (public.is_admin());

grant select on public.match_team_stats to anon, authenticated;
grant insert, update, delete on public.match_team_stats to authenticated;

drop trigger if exists match_team_stats_touch_updated_at on public.match_team_stats;
create trigger match_team_stats_touch_updated_at
before update on public.match_team_stats
for each row execute function public.touch_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.match_team_stats;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
