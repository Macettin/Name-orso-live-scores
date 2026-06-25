create table if not exists public.camp_applications (
  id text primary key,
  club_name text not null,
  country text,
  city text,
  contact_person_name text not null,
  email text not null,
  phone text not null,
  sport text not null,
  age_group text,
  estimated_players integer not null,
  estimated_staff integer,
  preferred_arrival_date date not null,
  preferred_departure_date date not null,
  number_of_nights integer,
  destination_preference text,
  hotel_level_preference text,
  training_facility_requirement text,
  friendly_games_needed boolean,
  airport_transfer_needed boolean,
  special_notes text,
  status text not null default 'new',
  admin_notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint camp_applications_status_check
    check (status in ('new', 'contacted', 'offer_sent', 'confirmed', 'cancelled')),
  constraint camp_applications_estimated_players_check
    check (estimated_players >= 0),
  constraint camp_applications_estimated_staff_check
    check (estimated_staff is null or estimated_staff >= 0),
  constraint camp_applications_number_of_nights_check
    check (number_of_nights is null or number_of_nights >= 0),
  constraint camp_applications_dates_check
    check (preferred_departure_date >= preferred_arrival_date)
);

alter table public.camp_applications enable row level security;

drop policy if exists "public insert camp applications" on public.camp_applications;
drop policy if exists "admins read camp applications" on public.camp_applications;
drop policy if exists "admins update camp applications" on public.camp_applications;
drop policy if exists "admins delete camp applications" on public.camp_applications;

create policy "public insert camp applications"
  on public.camp_applications
  for insert
  with check (true);

create policy "admins read camp applications"
  on public.camp_applications
  for select
  using (public.is_admin());

create policy "admins update camp applications"
  on public.camp_applications
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete camp applications"
  on public.camp_applications
  for delete
  using (public.is_admin());

create index if not exists camp_applications_status_created_idx
  on public.camp_applications (status, created_at desc);

create index if not exists camp_applications_arrival_idx
  on public.camp_applications (preferred_arrival_date, preferred_departure_date);
