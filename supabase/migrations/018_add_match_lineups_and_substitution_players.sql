alter table public.match_events add column if not exists player_in_id text references public.players(id) on delete set null;
alter table public.match_events add column if not exists player_out_id text references public.players(id) on delete set null;

alter table public.match_events drop constraint if exists match_events_type_check;
alter table public.match_events
  add constraint match_events_type_check
  check (event_type in ('goal', 'assist', 'yellow', 'red', 'substitution', 'own_goal', 'penalty_goal', 'missed_penalty'));

drop policy if exists "admins write match events" on public.match_events;
drop policy if exists "admins update match events" on public.match_events;
drop policy if exists "admins delete match events" on public.match_events;
drop policy if exists "scorers write match events" on public.match_events;
drop policy if exists "scorers update match events" on public.match_events;
drop policy if exists "scorers delete match events" on public.match_events;

create policy "scorers write match events" on public.match_events for insert with check (public.can_score());
create policy "scorers update match events" on public.match_events for update using (public.can_score()) with check (public.can_score());
create policy "scorers delete match events" on public.match_events for delete using (public.can_score());

create table if not exists public.match_lineups (
  tournament_id text not null references public.tournaments(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  role text not null default 'reserve',
  x numeric,
  y numeric,
  formation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id),
  constraint match_lineups_role_check check (role in ('starting', 'substitute', 'reserve')),
  constraint match_lineups_coordinates_check check (
    (x is null or (x >= 0 and x <= 100)) and
    (y is null or (y >= 0 and y <= 100))
  )
);

create index if not exists match_lineups_tournament_id_idx on public.match_lineups(tournament_id);
create index if not exists match_lineups_match_team_idx on public.match_lineups(match_id, team_id);
create index if not exists match_lineups_player_id_idx on public.match_lineups(player_id);

drop trigger if exists match_lineups_touch_updated_at on public.match_lineups;
create trigger match_lineups_touch_updated_at before update on public.match_lineups for each row execute function public.touch_updated_at();

create or replace function public.set_match_lineup_tournament_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_tournament_id text;
  player_team_id text;
begin
  select tournament_id into match_tournament_id from public.matches where id = new.match_id;
  select team_id into player_team_id from public.players where id = new.player_id;

  if match_tournament_id is null then
    raise exception 'Match must exist.';
  end if;

  if player_team_id is null or player_team_id <> new.team_id then
    raise exception 'Lineup player must belong to the selected team.';
  end if;

  new.tournament_id = match_tournament_id;
  return new;
end;
$$;

drop trigger if exists match_lineups_set_tournament_id on public.match_lineups;
create trigger match_lineups_set_tournament_id
before insert or update of match_id, team_id, player_id, tournament_id on public.match_lineups
for each row execute function public.set_match_lineup_tournament_id();

alter table public.match_lineups enable row level security;

drop policy if exists "public read match lineups" on public.match_lineups;
drop policy if exists "admins write match lineups" on public.match_lineups;
drop policy if exists "admins update match lineups" on public.match_lineups;
drop policy if exists "admins delete match lineups" on public.match_lineups;
drop policy if exists "scorers write match lineups" on public.match_lineups;
drop policy if exists "scorers update match lineups" on public.match_lineups;
drop policy if exists "scorers delete match lineups" on public.match_lineups;

create policy "public read match lineups" on public.match_lineups for select using (true);
create policy "scorers write match lineups" on public.match_lineups for insert with check (public.can_score());
create policy "scorers update match lineups" on public.match_lineups for update using (public.can_score()) with check (public.can_score());
create policy "scorers delete match lineups" on public.match_lineups for delete using (public.can_score());

grant select on public.match_lineups to anon, authenticated;
grant insert, update, delete on public.match_lineups to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.match_lineups;
exception
  when duplicate_object then null;
end;
$$;
