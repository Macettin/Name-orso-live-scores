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

do $$
begin
  if to_regclass('public.events') is not null then
    insert into public.match_events (id, tournament_id, match_id, team_id, player_id, event_type, minute, description, created_at, updated_at)
    select
      id,
      tournament_id,
      match_id,
      team_id,
      player_id,
      case event_type
        when 'yellow_card' then 'yellow'
        when 'red_card' then 'red'
        else event_type
      end,
      minute,
      description,
      created_at,
      updated_at
    from public.events
    where event_type in ('goal', 'yellow_card', 'red_card', 'yellow', 'red', 'substitution')
    on conflict (id) do update
    set tournament_id = excluded.tournament_id,
        match_id = excluded.match_id,
        team_id = excluded.team_id,
        player_id = excluded.player_id,
        event_type = excluded.event_type,
        minute = excluded.minute,
        description = excluded.description,
        updated_at = excluded.updated_at;
  end if;
end;
$$;

create index if not exists match_events_tournament_id_idx on public.match_events(tournament_id);
create index if not exists match_events_match_id_idx on public.match_events(match_id);
create index if not exists match_events_tournament_match_idx on public.match_events(tournament_id, match_id);

drop trigger if exists match_events_touch_updated_at on public.match_events;
create trigger match_events_touch_updated_at before update on public.match_events for each row execute function public.touch_updated_at();

drop trigger if exists match_events_set_tournament_id on public.match_events;
create trigger match_events_set_tournament_id
before insert or update of match_id, team_id, player_id, tournament_id on public.match_events
for each row execute function public.set_event_tournament_id();

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
