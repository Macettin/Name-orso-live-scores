alter table public.matches add column if not exists clock_started_at timestamptz;
alter table public.matches add column if not exists clock_base_seconds integer;
alter table public.matches add column if not exists clock_countdown_seconds integer;
