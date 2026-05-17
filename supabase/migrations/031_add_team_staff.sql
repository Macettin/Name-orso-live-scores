create table if not exists public.team_staff (
  id text primary key,
  tournament_id text not null default 'main-tournament' references public.tournaments(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  role text not null,
  phone text,
  email text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_staff_role_check check (role in ('Head Coach', 'Assistant Coach', 'Doctor', 'Physio', 'Team Manager', 'Media Officer'))
);

create index if not exists team_staff_tournament_idx on public.team_staff (tournament_id);
create index if not exists team_staff_team_idx on public.team_staff (team_id);
create index if not exists team_staff_team_role_idx on public.team_staff (team_id, role, name);

create or replace function public.set_team_staff_tournament_id()
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
    raise exception 'Staff team does not exist.';
  end if;

  new.tournament_id = team_tournament_id;
  return new;
end;
$$;

drop trigger if exists team_staff_set_tournament_id on public.team_staff;
create trigger team_staff_set_tournament_id
before insert or update of team_id, tournament_id on public.team_staff
for each row execute function public.set_team_staff_tournament_id();

drop trigger if exists team_staff_touch_updated_at on public.team_staff;
create trigger team_staff_touch_updated_at before update on public.team_staff for each row execute function public.touch_updated_at();

alter table public.team_staff enable row level security;

drop policy if exists "public read team staff" on public.team_staff;
drop policy if exists "admins write team staff" on public.team_staff;
drop policy if exists "admins update team staff" on public.team_staff;
drop policy if exists "admins delete team staff" on public.team_staff;
drop policy if exists "club admins write assigned team staff" on public.team_staff;
drop policy if exists "club admins update assigned team staff" on public.team_staff;
drop policy if exists "club admins delete assigned team staff" on public.team_staff;

create policy "public read team staff" on public.team_staff for select using (true);

create policy "admins write team staff" on public.team_staff
  for insert with check (public.is_admin());

create policy "admins update team staff" on public.team_staff
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins delete team staff" on public.team_staff
  for delete using (public.is_admin());

create policy "club admins write assigned team staff" on public.team_staff
  for insert with check (
    exists (
      select 1 from public.team_admins
      where team_admins.user_id = auth.uid()
        and team_admins.team_id = team_staff.team_id
    )
  );

create policy "club admins update assigned team staff" on public.team_staff
  for update using (
    exists (
      select 1 from public.team_admins
      where team_admins.user_id = auth.uid()
        and team_admins.team_id = team_staff.team_id
    )
  )
  with check (
    exists (
      select 1 from public.team_admins
      where team_admins.user_id = auth.uid()
        and team_admins.team_id = team_staff.team_id
    )
  );

create policy "club admins delete assigned team staff" on public.team_staff
  for delete using (
    exists (
      select 1 from public.team_admins
      where team_admins.user_id = auth.uid()
        and team_admins.team_id = team_staff.team_id
    )
  );

grant select on public.team_staff to anon, authenticated;
grant insert, update, delete on public.team_staff to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.team_staff;
exception
  when duplicate_object then null;
end;
$$;
