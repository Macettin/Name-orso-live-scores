alter table public.matches add column if not exists phase text;
alter table public.matches add column if not exists round_label text;

alter table public.matches drop constraint if exists matches_phase_check;
alter table public.matches
  add constraint matches_phase_check
  check (
    phase is null or phase in (
      'Group Stage',
      'Quarter Final',
      'Semi Final',
      'Final',
      '3rd Place Match',
      'Placement Matches'
    )
  );

create index if not exists matches_tournament_phase_idx
  on public.matches (tournament_id, phase, date, time);
