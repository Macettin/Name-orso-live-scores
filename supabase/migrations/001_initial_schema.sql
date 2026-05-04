create type public.app_role as enum ('admin', 'scorer', 'viewer');
create type public.sport_type as enum ('Volleyball', 'Basketball');
create type public.match_status as enum ('Scheduled', 'Live', 'Final');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id text primary key,
  name text not null,
  sport public.sport_type not null,
  group_name text not null,
  city text,
  coach text,
  colors text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  number integer not null default 0,
  position text,
  points integer not null default 0,
  assists integer not null default 0,
  rebounds integer not null default 0,
  blocks integer not null default 0,
  aces integer not null default 0,
  digs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id text primary key,
  home_team_id text not null references public.teams(id) on delete cascade,
  away_team_id text not null references public.teams(id) on delete cascade,
  date date not null,
  time time not null,
  court text not null,
  hall_slug text not null,
  status public.match_status not null default 'Scheduled',
  home_score integer not null default 0,
  away_score integer not null default 0,
  period_label text not null default 'Pregame',
  report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_match_teams check (home_team_id <> away_team_id)
);

create table public.match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  team_id text references public.teams(id) on delete cascade,
  player_id text references public.players(id) on delete cascade,
  stat_key text not null,
  stat_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_team_id_idx on public.players(team_id);
create index matches_date_time_idx on public.matches(date, time);
create index matches_status_idx on public.matches(status);
create index match_stats_match_id_idx on public.match_stats(match_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger teams_touch_updated_at before update on public.teams for each row execute function public.touch_updated_at();
create trigger players_touch_updated_at before update on public.players for each row execute function public.touch_updated_at();
create trigger matches_touch_updated_at before update on public.matches for each row execute function public.touch_updated_at();
create trigger match_stats_touch_updated_at before update on public.match_stats for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'viewer'::public.app_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() = 'admin'::public.app_role;
$$;

create or replace function public.prevent_scorer_match_identity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() = 'scorer'::public.app_role then
    if old.home_team_id <> new.home_team_id
      or old.away_team_id <> new.away_team_id
      or old.date <> new.date
      or old.time <> new.time
      or old.court <> new.court
      or old.hall_slug <> new.hall_slug
      or coalesce(old.report, '') <> coalesce(new.report, '') then
      raise exception 'Scorers can only update score, status, and period label.';
    end if;
  end if;

  return new;
end;
$$;

create trigger scorer_match_update_guard
before update on public.matches
for each row execute function public.prevent_scorer_match_identity_changes();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_stats enable row level security;

create policy "profiles read own or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read teams" on public.teams for select using (true);
create policy "admins manage teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());

create policy "public read players" on public.players for select using (true);
create policy "admins manage players" on public.players for all using (public.is_admin()) with check (public.is_admin());

create policy "public read matches" on public.matches for select using (true);
create policy "admins manage matches" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "scorers update match scores" on public.matches
  for update
  using (public.current_role() = 'scorer'::public.app_role)
  with check (public.current_role() = 'scorer'::public.app_role);

create policy "public read match stats" on public.match_stats for select using (true);
create policy "admins manage match stats" on public.match_stats for all using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_stats;
