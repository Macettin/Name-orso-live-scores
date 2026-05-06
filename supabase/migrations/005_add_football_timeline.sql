alter table public.matches add column if not exists match_minute text;

create table if not exists public.match_events (
  id text primary key,
  tournament_id text not null default 'main-tournament',
  match_id text not null references public.matches(id) on delete cascade,
  team_id text references public.teams(id) on delete set null,
  player_id text references public.players(id) on delete set null,
  event_type text not null,
  minute text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_events_type_check check (event_type in ('goal', 'yellow', 'red', 'substitution')),
  constraint match_events_tournament_id_fkey foreign key (tournament_id) references public.tournaments(id) on delete cascade
);

create index if not exists match_events_tournament_id_idx on public.match_events(tournament_id);
create index if not exists match_events_match_id_idx on public.match_events(match_id);
create index if not exists match_events_tournament_match_idx on public.match_events(tournament_id, match_id);

drop trigger if exists match_events_touch_updated_at on public.match_events;
create trigger match_events_touch_updated_at before update on public.match_events for each row execute function public.touch_updated_at();

create or replace function public.set_event_tournament_id()
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
    raise exception 'Event match does not exist.';
  end if;

  if new.team_id is not null then
    select teams.tournament_id into team_tournament_id
    from public.teams
    where teams.id = new.team_id;

    if team_tournament_id is distinct from match_tournament_id then
      raise exception 'Event team must belong to the same tournament as the match.';
    end if;
  end if;

  if new.player_id is not null then
    select players.tournament_id into player_tournament_id
    from public.players
    where players.id = new.player_id;

    if player_tournament_id is distinct from match_tournament_id then
      raise exception 'Event player must belong to the same tournament as the match.';
    end if;
  end if;

  new.tournament_id = match_tournament_id;
  return new;
end;
$$;

drop trigger if exists match_events_set_tournament_id on public.match_events;
create trigger match_events_set_tournament_id
before insert or update of match_id, team_id, player_id, tournament_id on public.match_events
for each row execute function public.set_event_tournament_id();

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
      or old.report is distinct from new.report
      or old.youtube_url is distinct from new.youtube_url then
      raise exception 'Scorers can only update score, status, period label, and match minute.';
    end if;
  end if;

  return new;
end;
$$;

alter table public.match_events enable row level security;

drop policy if exists "public read match events" on public.match_events;
drop policy if exists "admins write match events" on public.match_events;
drop policy if exists "admins update match events" on public.match_events;
drop policy if exists "admins delete match events" on public.match_events;

create policy "public read match events" on public.match_events for select using (true);
create policy "admins write match events" on public.match_events for insert with check (public.is_admin());
create policy "admins update match events" on public.match_events for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete match events" on public.match_events for delete using (public.is_admin());

grant select on public.match_events to anon, authenticated;
grant insert, update, delete on public.match_events to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.match_events;
exception
  when duplicate_object then null;
end;
$$;
