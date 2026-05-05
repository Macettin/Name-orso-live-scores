alter table public.teams add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read team logos" on storage.objects;
drop policy if exists "admins upload team logos" on storage.objects;
drop policy if exists "admins update team logos" on storage.objects;
drop policy if exists "admins delete team logos" on storage.objects;

create policy "public read team logos" on storage.objects
for select using (bucket_id = 'team-logos');

create policy "admins upload team logos" on storage.objects
for insert with check (bucket_id = 'team-logos' and public.is_admin());

create policy "admins update team logos" on storage.objects
for update using (bucket_id = 'team-logos' and public.is_admin()) with check (bucket_id = 'team-logos' and public.is_admin());

create policy "admins delete team logos" on storage.objects
for delete using (bucket_id = 'team-logos' and public.is_admin());
