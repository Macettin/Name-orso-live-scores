alter table public.tournament_applications add column if not exists admin_note text;
alter table public.tournament_applications add column if not exists last_contacted_at timestamptz;

alter table public.tournament_applications drop constraint if exists tournament_applications_status_check;
alter table public.tournament_applications
  add constraint tournament_applications_status_check
  check (status in ('new', 'contacted', 'waiting_for_confirmation', 'accepted', 'rejected'));

create index if not exists tournament_applications_follow_up_idx
  on public.tournament_applications (tournament_id, status, age_group, last_contacted_at desc);
