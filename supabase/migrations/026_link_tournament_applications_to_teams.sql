alter table public.tournament_applications add column if not exists team_id text references public.teams(id) on delete set null;

create index if not exists tournament_applications_team_idx
  on public.tournament_applications (team_id);
