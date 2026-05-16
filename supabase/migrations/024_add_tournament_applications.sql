create table if not exists public.tournament_applications (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name_surname text not null,
  club text not null,
  phone text not null,
  email text not null,
  estimated_players integer not null,
  age_group text not null,
  estimated_staff integer not null,
  country text,
  city text,
  sport text,
  notes text,
  status text not null default 'new',
  created_at timestamptz default now(),
  constraint tournament_applications_status_check check (status in ('new', 'contacted', 'accepted', 'rejected')),
  constraint tournament_applications_estimated_players_check check (estimated_players >= 0),
  constraint tournament_applications_estimated_staff_check check (estimated_staff >= 0)
);

alter table public.tournament_applications enable row level security;

drop policy if exists "public insert tournament applications" on public.tournament_applications;
drop policy if exists "admins read tournament applications" on public.tournament_applications;
drop policy if exists "admins update tournament applications" on public.tournament_applications;
drop policy if exists "admins delete tournament applications" on public.tournament_applications;

create policy "public insert tournament applications"
  on public.tournament_applications
  for insert
  with check (true);

create policy "admins read tournament applications"
  on public.tournament_applications
  for select
  using (public.is_admin());

create policy "admins update tournament applications"
  on public.tournament_applications
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete tournament applications"
  on public.tournament_applications
  for delete
  using (public.is_admin());

create index if not exists tournament_applications_tournament_status_idx
  on public.tournament_applications (tournament_id, status, created_at desc);
