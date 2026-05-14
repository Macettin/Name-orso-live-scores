alter table public.match_lineups add column if not exists x numeric;
alter table public.match_lineups add column if not exists y numeric;
alter table public.match_lineups add column if not exists formation text;

alter table public.match_lineups drop constraint if exists match_lineups_coordinates_check;
alter table public.match_lineups
  add constraint match_lineups_coordinates_check
  check (
    (x is null or (x >= 0 and x <= 100)) and
    (y is null or (y >= 0 and y <= 100))
  );

drop policy if exists "admins write match lineups" on public.match_lineups;
drop policy if exists "admins update match lineups" on public.match_lineups;
drop policy if exists "admins delete match lineups" on public.match_lineups;
drop policy if exists "scorers write match lineups" on public.match_lineups;
drop policy if exists "scorers update match lineups" on public.match_lineups;
drop policy if exists "scorers delete match lineups" on public.match_lineups;

create policy "scorers write match lineups" on public.match_lineups for insert with check (public.can_score());
create policy "scorers update match lineups" on public.match_lineups for update using (public.can_score()) with check (public.can_score());
create policy "scorers delete match lineups" on public.match_lineups for delete using (public.can_score());
