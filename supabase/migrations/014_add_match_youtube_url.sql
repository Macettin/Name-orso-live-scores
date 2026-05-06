alter table public.matches add column if not exists youtube_url text;

create or replace function public.prevent_scorer_match_identity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() = 'scorer'::public.app_role then
    if old.home_team_id is distinct from new.home_team_id
      or old.away_team_id is distinct from new.away_team_id
      or old.date is distinct from new.date
      or old.time is distinct from new.time
      or old.court is distinct from new.court
      or old.hall_slug is distinct from new.hall_slug
      or old.report is distinct from new.report
      or old.youtube_url is distinct from new.youtube_url then
      raise exception 'Scorers can only update score, status, and period label.';
    end if;
  end if;

  return new;
end;
$$;
