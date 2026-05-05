do $$
begin
  create type public.app_role as enum ('admin', 'scorer', 'viewer', 'club_admin');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'viewer')
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
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

create or replace function public.can_score()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() in ('admin'::public.app_role, 'scorer'::public.app_role);
$$;

create or replace function public.prevent_scorer_match_identity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() = 'scorer'::public.app_role then
    if old.home_team_id is distinct from new.home_team_id
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

drop trigger if exists scorer_match_update_guard on public.matches;
create trigger scorer_match_update_guard
before update on public.matches
for each row execute function public.prevent_scorer_match_identity_changes();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_stats enable row level security;

drop policy if exists "anonymous write teams" on public.teams;
drop policy if exists "anonymous read teams" on public.teams;
drop policy if exists "anonymous update teams" on public.teams;
drop policy if exists "anonymous delete teams" on public.teams;
drop policy if exists "public read teams" on public.teams;
drop policy if exists "admins manage teams" on public.teams;
drop policy if exists "anonymous write players" on public.players;
drop policy if exists "anonymous read players" on public.players;
drop policy if exists "anonymous update players" on public.players;
drop policy if exists "anonymous delete players" on public.players;
drop policy if exists "public read players" on public.players;
drop policy if exists "admins manage players" on public.players;
drop policy if exists "anonymous write matches" on public.matches;
drop policy if exists "anonymous read matches" on public.matches;
drop policy if exists "anonymous update matches" on public.matches;
drop policy if exists "anonymous delete matches" on public.matches;
drop policy if exists "public read matches" on public.matches;
drop policy if exists "admins manage matches" on public.matches;
drop policy if exists "scorers update match scores" on public.matches;
drop policy if exists "anonymous write match stats" on public.match_stats;
drop policy if exists "anonymous read match stats" on public.match_stats;
drop policy if exists "anonymous update match stats" on public.match_stats;
drop policy if exists "anonymous delete match stats" on public.match_stats;
drop policy if exists "public read match stats" on public.match_stats;
drop policy if exists "admins manage match stats" on public.match_stats;

drop policy if exists "profiles read own or admin" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "admins write teams" on public.teams;
drop policy if exists "admins update teams" on public.teams;
drop policy if exists "admins delete teams" on public.teams;
drop policy if exists "admins write players" on public.players;
drop policy if exists "admins update players" on public.players;
drop policy if exists "admins delete players" on public.players;
drop policy if exists "admins write matches" on public.matches;
drop policy if exists "admins and scorers update matches" on public.matches;
drop policy if exists "admins delete matches" on public.matches;
drop policy if exists "admins write match stats" on public.match_stats;
drop policy if exists "admins update match stats" on public.match_stats;
drop policy if exists "admins delete match stats" on public.match_stats;

create policy "profiles read own or admin" on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

create policy "admins manage profiles" on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public read teams" on public.teams for select using (true);
create policy "admins write teams" on public.teams for insert with check (public.is_admin());
create policy "admins update teams" on public.teams for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete teams" on public.teams for delete using (public.is_admin());

create policy "public read players" on public.players for select using (true);
create policy "admins write players" on public.players for insert with check (public.is_admin());
create policy "admins update players" on public.players for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete players" on public.players for delete using (public.is_admin());

create policy "public read matches" on public.matches for select using (true);
create policy "admins write matches" on public.matches for insert with check (public.is_admin());
create policy "admins and scorers update matches" on public.matches for update using (public.can_score()) with check (public.can_score());
create policy "admins delete matches" on public.matches for delete using (public.is_admin());

create policy "public read match stats" on public.match_stats for select using (true);
create policy "admins write match stats" on public.match_stats for insert with check (public.is_admin());
create policy "admins update match stats" on public.match_stats for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete match stats" on public.match_stats for delete using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.teams, public.players, public.matches, public.match_stats to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.teams, public.players, public.matches, public.match_stats to authenticated;
grant insert, update, delete on public.profiles to authenticated;
