create table if not exists public.news_posts (
  id text primary key,
  title text not null,
  summary text not null,
  content text not null,
  image_url text not null,
  category text not null default 'News',
  tournament_id text references public.tournaments(id) on delete set null,
  published_at timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_posts_category_check check (category in ('News', 'Announcement', 'Result', 'Media'))
);

drop trigger if exists news_posts_touch_updated_at on public.news_posts;
create trigger news_posts_touch_updated_at before update on public.news_posts for each row execute function public.touch_updated_at();

create index if not exists news_posts_published_idx on public.news_posts (is_published, published_at desc);
create index if not exists news_posts_tournament_published_idx on public.news_posts (tournament_id, is_published, published_at desc);
create index if not exists news_posts_category_idx on public.news_posts (category);

alter table public.news_posts enable row level security;

drop policy if exists "public read published news posts" on public.news_posts;
drop policy if exists "admins write news posts" on public.news_posts;
drop policy if exists "admins update news posts" on public.news_posts;
drop policy if exists "admins delete news posts" on public.news_posts;

create policy "public read published news posts" on public.news_posts
  for select using (is_published = true or public.is_admin());

create policy "admins write news posts" on public.news_posts
  for insert with check (public.is_admin());

create policy "admins update news posts" on public.news_posts
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins delete news posts" on public.news_posts
  for delete using (public.is_admin());

grant select on public.news_posts to anon, authenticated;
grant insert, update, delete on public.news_posts to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.news_posts;
exception
  when duplicate_object then null;
end;
$$;
