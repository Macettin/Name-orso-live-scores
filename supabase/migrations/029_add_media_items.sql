create table if not exists public.media_items (
  id text primary key,
  tournament_id text references public.tournaments(id) on delete set null,
  title text not null,
  media_type text not null,
  image_url text,
  video_url text,
  caption text,
  published_at timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_items_type_check check (media_type in ('photo', 'video', 'youtube')),
  constraint media_items_url_check check (
    (media_type = 'photo' and image_url is not null and length(trim(image_url)) > 0)
    or (media_type in ('video', 'youtube') and video_url is not null and length(trim(video_url)) > 0)
  )
);

drop trigger if exists media_items_touch_updated_at on public.media_items;
create trigger media_items_touch_updated_at before update on public.media_items for each row execute function public.touch_updated_at();

create index if not exists media_items_published_idx on public.media_items (is_published, published_at desc);
create index if not exists media_items_tournament_published_idx on public.media_items (tournament_id, is_published, published_at desc);
create index if not exists media_items_type_idx on public.media_items (media_type);

alter table public.media_items enable row level security;

drop policy if exists "public read published media items" on public.media_items;
drop policy if exists "admins write media items" on public.media_items;
drop policy if exists "admins update media items" on public.media_items;
drop policy if exists "admins delete media items" on public.media_items;

create policy "public read published media items" on public.media_items
  for select using (is_published = true or public.is_admin());

create policy "admins write media items" on public.media_items
  for insert with check (public.is_admin());

create policy "admins update media items" on public.media_items
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins delete media items" on public.media_items
  for delete using (public.is_admin());

grant select on public.media_items to anon, authenticated;
grant insert, update, delete on public.media_items to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.media_items;
exception
  when duplicate_object then null;
end;
$$;
