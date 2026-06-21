alter type public.sport_type add value if not exists 'Futsal';

alter table public.tournaments
drop constraint if exists tournaments_sport_type_check;

alter table public.tournaments
add constraint tournaments_sport_type_check
check (sport_type in ('Mixed', 'Volleyball', 'Basketball', 'Football', 'Futsal'));
