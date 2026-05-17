alter table public.tournament_applications
  add column if not exists created_team_id text references public.teams(id) on delete set null;

update public.tournament_applications
set created_team_id = team_id
where created_team_id is null
  and team_id is not null;

create index if not exists tournament_applications_created_team_idx
  on public.tournament_applications (created_team_id);
