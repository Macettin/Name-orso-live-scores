alter table public.matches add column if not exists clock_label text;
alter table public.matches add column if not exists clock_running boolean not null default false;
