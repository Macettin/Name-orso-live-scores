alter type public.app_role add value if not exists 'club_admin';

create table if not exists public.team_admins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create index if not exists team_admins_user_id_idx on public.team_admins(user_id);
create index if not exists team_admins_team_id_idx on public.team_admins(team_id);
create index if not exists team_admins_tournament_id_idx on public.team_admins(tournament_id);

alter table public.team_admins enable row level security;

create or replace function public.is_club_admin_for_team(p_team_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_admins
    where user_id = auth.uid()
      and team_id = p_team_id
  );
$$;

create or replace function public.assign_club_admin(p_email text, p_team_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_tournament_id text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can assign club admins.';
  end if;

  select id
    into target_user_id
  from public.profiles
  where lower(email) = lower(trim(p_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No profile found for email %.', p_email;
  end if;

  select tournament_id
    into target_tournament_id
  from public.teams
  where id = p_team_id;

  if target_tournament_id is null then
    raise exception 'No team found for id %.', p_team_id;
  end if;

  update public.profiles
  set role = 'club_admin'::public.app_role
  where id = target_user_id;

  insert into public.team_admins (user_id, team_id, tournament_id)
  values (target_user_id, p_team_id, target_tournament_id)
  on conflict (user_id, team_id) do update
  set tournament_id = excluded.tournament_id;
end;
$$;

drop policy if exists "team admins read own assignments" on public.team_admins;
drop policy if exists "admins manage team admins" on public.team_admins;
drop policy if exists "club admins update assigned teams" on public.teams;
drop policy if exists "club admins write assigned players" on public.players;
drop policy if exists "club admins update assigned players" on public.players;
drop policy if exists "club admins delete assigned players" on public.players;
drop policy if exists "club admins upload team logos" on storage.objects;
drop policy if exists "club admins update team logos" on storage.objects;
drop policy if exists "club admins delete team logos" on storage.objects;
drop policy if exists "club admins upload player photos" on storage.objects;
drop policy if exists "club admins update player photos" on storage.objects;
drop policy if exists "club admins delete player photos" on storage.objects;

create policy "team admins read own assignments" on public.team_admins
  for select
  using (user_id = auth.uid() or public.is_admin());

create policy "admins manage team admins" on public.team_admins
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "club admins update assigned teams" on public.teams
  for update
  using (public.is_club_admin_for_team(id))
  with check (public.is_club_admin_for_team(id));

create policy "club admins write assigned players" on public.players
  for insert
  with check (public.is_club_admin_for_team(team_id));

create policy "club admins update assigned players" on public.players
  for update
  using (public.is_club_admin_for_team(team_id))
  with check (public.is_club_admin_for_team(team_id));

create policy "club admins delete assigned players" on public.players
  for delete
  using (public.is_club_admin_for_team(team_id));

create policy "club admins upload team logos" on storage.objects
  for insert
  with check (
    bucket_id = 'team-logos'
    and public.is_club_admin_for_team((storage.foldername(name))[1])
  );

create policy "club admins update team logos" on storage.objects
  for update
  using (
    bucket_id = 'team-logos'
    and public.is_club_admin_for_team((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'team-logos'
    and public.is_club_admin_for_team((storage.foldername(name))[1])
  );

create policy "club admins delete team logos" on storage.objects
  for delete
  using (
    bucket_id = 'team-logos'
    and public.is_club_admin_for_team((storage.foldername(name))[1])
  );

create policy "club admins upload player photos" on storage.objects
  for insert
  with check (
    bucket_id = 'player-photos'
    and exists (
      select 1
      from public.players
      where id = (storage.foldername(name))[1]
        and public.is_club_admin_for_team(team_id)
    )
  );

create policy "club admins update player photos" on storage.objects
  for update
  using (
    bucket_id = 'player-photos'
    and exists (
      select 1
      from public.players
      where id = (storage.foldername(name))[1]
        and public.is_club_admin_for_team(team_id)
    )
  )
  with check (
    bucket_id = 'player-photos'
    and exists (
      select 1
      from public.players
      where id = (storage.foldername(name))[1]
        and public.is_club_admin_for_team(team_id)
    )
  );

create policy "club admins delete player photos" on storage.objects
  for delete
  using (
    bucket_id = 'player-photos'
    and exists (
      select 1
      from public.players
      where id = (storage.foldername(name))[1]
        and public.is_club_admin_for_team(team_id)
    )
  );

grant select, insert, update, delete on public.team_admins to authenticated;
grant execute on function public.assign_club_admin(text, text) to authenticated;
grant execute on function public.is_club_admin_for_team(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.team_admins;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
