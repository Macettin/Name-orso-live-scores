create table if not exists public.admin_notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

create index if not exists admin_notification_reads_user_read_idx
  on public.admin_notification_reads (user_id, read_at desc);

alter table public.admin_notification_reads enable row level security;

drop policy if exists "users read own admin notification reads" on public.admin_notification_reads;
drop policy if exists "users insert own admin notification reads" on public.admin_notification_reads;
drop policy if exists "users update own admin notification reads" on public.admin_notification_reads;

create policy "users read own admin notification reads" on public.admin_notification_reads
  for select using (auth.uid() = user_id);

create policy "users insert own admin notification reads" on public.admin_notification_reads
  for insert with check (auth.uid() = user_id);

create policy "users update own admin notification reads" on public.admin_notification_reads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.admin_notification_reads to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.admin_notification_reads;
exception
  when duplicate_object then null;
end;
$$;
