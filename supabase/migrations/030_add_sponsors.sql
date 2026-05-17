create table if not exists public.sponsors (
  id text primary key,
  name text not null,
  logo_url text not null,
  website_url text,
  tier text not null default 'Partner',
  tournament_id text references public.tournaments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_tier_check check (tier in ('Main Sponsor', 'Gold', 'Silver', 'Partner'))
);

drop trigger if exists sponsors_touch_updated_at on public.sponsors;
create trigger sponsors_touch_updated_at before update on public.sponsors for each row execute function public.touch_updated_at();

create index if not exists sponsors_active_idx on public.sponsors (is_active, tier, name);
create index if not exists sponsors_tournament_active_idx on public.sponsors (tournament_id, is_active, tier, name);

alter table public.sponsors enable row level security;

drop policy if exists "public read active sponsors" on public.sponsors;
drop policy if exists "admins write sponsors" on public.sponsors;
drop policy if exists "admins update sponsors" on public.sponsors;
drop policy if exists "admins delete sponsors" on public.sponsors;

create policy "public read active sponsors" on public.sponsors
  for select using (is_active = true or public.is_admin());

create policy "admins write sponsors" on public.sponsors
  for insert with check (public.is_admin());

create policy "admins update sponsors" on public.sponsors
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins delete sponsors" on public.sponsors
  for delete using (public.is_admin());

grant select on public.sponsors to anon, authenticated;
grant insert, update, delete on public.sponsors to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.sponsors;
exception
  when duplicate_object then null;
end;
$$;
