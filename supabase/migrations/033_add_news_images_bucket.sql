alter table public.news_posts alter column image_url drop not null;

insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read news images" on storage.objects;
drop policy if exists "admins upload news images" on storage.objects;
drop policy if exists "admins update news images" on storage.objects;
drop policy if exists "admins delete news images" on storage.objects;

create policy "public read news images" on storage.objects
for select using (bucket_id = 'news-images');

create policy "admins upload news images" on storage.objects
for insert with check (bucket_id = 'news-images' and public.is_admin());

create policy "admins update news images" on storage.objects
for update using (bucket_id = 'news-images' and public.is_admin()) with check (bucket_id = 'news-images' and public.is_admin());

create policy "admins delete news images" on storage.objects
for delete using (bucket_id = 'news-images' and public.is_admin());
