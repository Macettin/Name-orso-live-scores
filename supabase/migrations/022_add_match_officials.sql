create table if not exists public.officials (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null,
  role text not null,
  country text,
  city text,
  photo_url text,
  created_at timestamptz default now(),
  constraint officials_role_check check (
    role in ('referee', 'assistant referee', 'fourth official', 'table official', 'commissioner')
  )
);

create table if not exists public.match_officials (
  tournament_id text not null references public.tournaments(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  official_id text not null references public.officials(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (match_id, official_id)
);

alter table public.officials enable row level security;
alter table public.match_officials enable row level security;

drop policy if exists "public read officials" on public.officials;
drop policy if exists "admins write officials" on public.officials;
drop policy if exists "public read match officials" on public.match_officials;
drop policy if exists "admins write match officials" on public.match_officials;

create policy "public read officials" on public.officials for select using (true);
create policy "admins write officials" on public.officials for all using (public.is_admin()) with check (public.is_admin());
create policy "public read match officials" on public.match_officials for select using (true);
create policy "admins write match officials" on public.match_officials for all using (public.is_admin()) with check (public.is_admin());

create index if not exists officials_tournament_role_idx on public.officials (tournament_id, role, name);
create index if not exists match_officials_tournament_match_idx on public.match_officials (tournament_id, match_id);
