create or replace function public.add_player_match_stat(
  p_match_id text,
  p_player_id text,
  p_stat_key text,
  p_stat_value integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_team_id text;
  match_home_team_id text;
  match_away_team_id text;
  match_tournament_id text;
  current_stat_total integer;
begin
  if not public.can_score() then
    raise exception 'Only admins and scorers can add live player stats.';
  end if;

  if p_stat_value is null or p_stat_value = 0 then
    raise exception 'Stat value must be non-zero.';
  end if;

  if p_stat_key not in ('points', 'goals', 'assists', 'rebounds', 'blocks', 'aces', 'digs', 'yellow_cards', 'red_cards') then
    raise exception 'Unsupported player stat key: %', p_stat_key;
  end if;

  select players.team_id into player_team_id
  from public.players
  where players.id = p_player_id;

  select matches.home_team_id, matches.away_team_id, matches.tournament_id
  into match_home_team_id, match_away_team_id, match_tournament_id
  from public.matches
  where matches.id = p_match_id;

  if player_team_id is null then
    raise exception 'Player does not exist.';
  end if;

  if match_tournament_id is null then
    raise exception 'Match does not exist.';
  end if;

  if player_team_id <> match_home_team_id and player_team_id <> match_away_team_id then
    raise exception 'Player must belong to one of the match teams.';
  end if;

  select coalesce(sum(stat_value), 0)
  into current_stat_total
  from public.match_stats
  where match_id = p_match_id
    and player_id = p_player_id
    and stat_key = p_stat_key;

  if current_stat_total + p_stat_value < 0 then
    raise exception 'Correction would make stat negative.';
  end if;

  insert into public.match_stats (match_id, team_id, player_id, stat_key, stat_value, tournament_id)
  values (p_match_id, player_team_id, p_player_id, p_stat_key, p_stat_value, match_tournament_id);

  if p_stat_key in ('points', 'goals') then
    update public.matches
    set home_score = greatest(0, home_score + case when player_team_id = match_home_team_id then p_stat_value else 0 end),
        away_score = greatest(0, away_score + case when player_team_id = match_away_team_id then p_stat_value else 0 end)
    where id = p_match_id;
  end if;
end;
$$;

grant execute on function public.add_player_match_stat(text, text, text, integer) to authenticated;
