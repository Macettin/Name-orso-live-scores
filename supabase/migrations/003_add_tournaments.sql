create table if not exists public.tournaments (
  id text primary key,
  name text not null,
  sport_type text not null default 'Mixed',
  location text,
  start_date date,
  end_date date,
  status text not null default 'Live',
  logo_url text,
  primary_color text,
  sponsor_name text,
  sponsor_logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_sport_type_check check (sport_type in ('Mixed', 'Volleyball', 'Basketball', 'Football')),
  constraint tournaments_status_check check (status in ('Scheduled', 'Live', 'Final', 'Archived')),
  constraint tournaments_date_order_check check (start_date is null or end_date is null or start_date <= end_date)
);

insert into public.tournaments (id, name, sport_type, location, start_date, end_date, status)
values ('main-tournament', 'Main Tournament', 'Mixed', null, null, null, 'Live')
on conflict (id) do update
set name = excluded.name,
    sport_type = excluded.sport_type,
    updated_at = now();

alter table public.tournaments add column if not exists logo_url text;
alter table public.tournaments add column if not exists primary_color text;
alter table public.tournaments add column if not exists sponsor_name text;
alter table public.tournaments add column if not exists sponsor_logo_url text;

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at before update on public.tournaments for each row execute function public.touch_updated_at();

alter table public.teams add column if not exists tournament_id text;
alter table public.players add column if not exists tournament_id text;
alter table public.matches add column if not exists tournament_id text;
alter table public.match_stats add column if not exists tournament_id text;
alter table public.teams add column if not exists logo_url text;
alter table public.matches add column if not exists clock_label text;
alter table public.matches add column if not exists clock_running boolean not null default false;

update public.teams
set tournament_id = 'main-tournament'
where tournament_id is null;

update public.players
set tournament_id = coalesce(
  (select teams.tournament_id from public.teams where teams.id = players.team_id),
  'main-tournament'
)
where tournament_id is null;

update public.matches
set tournament_id = coalesce(
  (select teams.tournament_id from public.teams where teams.id = matches.home_team_id),
  'main-tournament'
)
where tournament_id is null;

update public.match_stats
set tournament_id = coalesce(
  (select matches.tournament_id from public.matches where matches.id = match_stats.match_id),
  (select teams.tournament_id from public.teams where teams.id = match_stats.team_id),
  (select players.tournament_id from public.players where players.id = match_stats.player_id),
  'main-tournament'
)
where tournament_id is null;

alter table public.teams alter column tournament_id set default 'main-tournament';
alter table public.players alter column tournament_id set default 'main-tournament';
alter table public.matches alter column tournament_id set default 'main-tournament';
alter table public.match_stats alter column tournament_id set default 'main-tournament';

alter table public.teams alter column tournament_id set not null;
alter table public.players alter column tournament_id set not null;
alter table public.matches alter column tournament_id set not null;
alter table public.match_stats alter column tournament_id set not null;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'teams'
      and constraint_name = 'teams_tournament_id_fkey'
  ) then
    alter table public.teams
      add constraint teams_tournament_id_fkey
      foreign key (tournament_id) references public.tournaments(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'players'
      and constraint_name = 'players_tournament_id_fkey'
  ) then
    alter table public.players
      add constraint players_tournament_id_fkey
      foreign key (tournament_id) references public.tournaments(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'matches'
      and constraint_name = 'matches_tournament_id_fkey'
  ) then
    alter table public.matches
      add constraint matches_tournament_id_fkey
      foreign key (tournament_id) references public.tournaments(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'match_stats'
      and constraint_name = 'match_stats_tournament_id_fkey'
  ) then
    alter table public.match_stats
      add constraint match_stats_tournament_id_fkey
      foreign key (tournament_id) references public.tournaments(id) on delete cascade;
  end if;
end;
$$;

create index if not exists teams_tournament_id_idx on public.teams(tournament_id);
create index if not exists players_tournament_id_idx on public.players(tournament_id);
create index if not exists players_tournament_team_idx on public.players(tournament_id, team_id);
create index if not exists matches_tournament_id_idx on public.matches(tournament_id);
create index if not exists matches_tournament_date_time_idx on public.matches(tournament_id, date, time);
create index if not exists match_stats_tournament_id_idx on public.match_stats(tournament_id);
create index if not exists match_stats_tournament_match_idx on public.match_stats(tournament_id, match_id);

create or replace function public.set_player_tournament_id()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  team_tournament_id text;
begin
  select teams.tournament_id into team_tournament_id
  from public.teams
  where teams.id = new.team_id;

  if team_tournament_id is null then
    raise exception 'Player team does not exist.';
  end if;

  new.tournament_id = team_tournament_id;
  return new;
end;
$$;

drop trigger if exists players_set_tournament_id on public.players;
create trigger players_set_tournament_id
before insert or update of team_id, tournament_id on public.players
for each row execute function public.set_player_tournament_id();

create or replace function public.set_match_tournament_id()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  home_tournament_id text;
  away_tournament_id text;
begin
  select teams.tournament_id into home_tournament_id
  from public.teams
  where teams.id = new.home_team_id;

  select teams.tournament_id into away_tournament_id
  from public.teams
  where teams.id = new.away_team_id;

  if home_tournament_id is null or away_tournament_id is null then
    raise exception 'Match teams must exist.';
  end if;

  if home_tournament_id <> away_tournament_id then
    raise exception 'Match teams must belong to the same tournament.';
  end if;

  new.tournament_id = home_tournament_id;
  return new;
end;
$$;

drop trigger if exists matches_set_tournament_id on public.matches;
create trigger matches_set_tournament_id
before insert or update of home_team_id, away_team_id, tournament_id on public.matches
for each row execute function public.set_match_tournament_id();

create or replace function public.set_match_stat_tournament_id()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  match_tournament_id text;
  team_tournament_id text;
  player_tournament_id text;
begin
  select matches.tournament_id into match_tournament_id
  from public.matches
  where matches.id = new.match_id;

  if match_tournament_id is null then
    raise exception 'Match stat match does not exist.';
  end if;

  if new.team_id is not null then
    select teams.tournament_id into team_tournament_id
    from public.teams
    where teams.id = new.team_id;

    if team_tournament_id is distinct from match_tournament_id then
      raise exception 'Match stat team must belong to the same tournament as the match.';
    end if;
  end if;

  if new.player_id is not null then
    select players.tournament_id into player_tournament_id
    from public.players
    where players.id = new.player_id;

    if player_tournament_id is distinct from match_tournament_id then
      raise exception 'Match stat player must belong to the same tournament as the match.';
    end if;
  end if;

  new.tournament_id = match_tournament_id;
  return new;
end;
$$;

drop trigger if exists match_stats_set_tournament_id on public.match_stats;
create trigger match_stats_set_tournament_id
before insert or update of match_id, team_id, player_id, tournament_id on public.match_stats
for each row execute function public.set_match_stat_tournament_id();

create or replace function public.prevent_scorer_match_identity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() = 'scorer'::public.app_role then
    if old.tournament_id is distinct from new.tournament_id
      or old.home_team_id is distinct from new.home_team_id
      or old.away_team_id is distinct from new.away_team_id
      or old.date is distinct from new.date
      or old.time is distinct from new.time
      or old.court is distinct from new.court
      or old.hall_slug is distinct from new.hall_slug
      or old.report is distinct from new.report then
      raise exception 'Scorers can only update score, status, and period label.';
    end if;
  end if;

  return new;
end;
$$;

alter table public.tournaments enable row level security;

drop policy if exists "public read tournaments" on public.tournaments;
drop policy if exists "admins write tournaments" on public.tournaments;
drop policy if exists "admins update tournaments" on public.tournaments;
drop policy if exists "admins delete tournaments" on public.tournaments;

create policy "public read tournaments" on public.tournaments for select using (true);
create policy "admins write tournaments" on public.tournaments for insert with check (public.is_admin());
create policy "admins update tournaments" on public.tournaments for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete tournaments" on public.tournaments for delete using (public.is_admin());

grant select on public.tournaments to anon, authenticated;
grant insert, update, delete on public.tournaments to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception
  when duplicate_object then null;
end;
$$;
