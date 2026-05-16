alter table public.teams add column if not exists roster_status text not null default 'Draft';
alter table public.teams add column if not exists roster_note text;
alter table public.teams add column if not exists roster_locked boolean not null default false;
alter table public.teams add column if not exists roster_submitted_at timestamptz;
alter table public.teams add column if not exists roster_approved_at timestamptz;

alter table public.teams drop constraint if exists teams_roster_status_check;
alter table public.teams
  add constraint teams_roster_status_check
  check (roster_status in ('Draft', 'Submitted', 'Approved', 'Needs changes'));

create index if not exists teams_tournament_roster_status_idx
  on public.teams (tournament_id, roster_status, name);
