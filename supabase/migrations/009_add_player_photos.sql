alter table public.players add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read player photos" on storage.objects;
drop policy if exists "admins upload player photos" on storage.objects;
drop policy if exists "admins update player photos" on storage.objects;
drop policy if exists "admins delete player photos" on storage.objects;

create policy "public read player photos" on storage.objects
for select using (bucket_id = 'player-photos');

create policy "admins upload player photos" on storage.objects
for insert with check (bucket_id = 'player-photos' and public.is_admin());

create policy "admins update player photos" on storage.objects
for update using (bucket_id = 'player-photos' and public.is_admin()) with check (bucket_id = 'player-photos' and public.is_admin());

create policy "admins delete player photos" on storage.objects
for delete using (bucket_id = 'player-photos' and public.is_admin());
