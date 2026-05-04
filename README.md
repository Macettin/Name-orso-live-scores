# Orso Live Scores

A Next.js TypeScript app for volleyball and basketball tournament fixtures, live scores, teams, players, match reports, admin management, and QR-ready court pages.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Paste and run `supabase/migrations/001_initial_schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Fill in your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

6. Restart the dev server:

```bash
npm run dev
```

7. Create users in Supabase Authentication.
8. Assign roles in SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';

update public.profiles
set role = 'scorer'
where email = 'scorer@example.com';
```

9. Open `/login` and sign in. Admin users can manage teams, players, matches, and scores. Scorers can update scores only.

## Data Model

The Supabase migration creates:

- `profiles`
- `teams`
- `players`
- `matches`
- `match_stats`

The public pages read through Supabase. If Supabase env vars are missing, the app shows seed data but does not save changes.

## Auth

Supabase Auth is used for admin access.

- `admin`: full create, edit, and delete access.
- `scorer`: can update `home_score`, `away_score`, `status`, and `period_label` on matches only.
- `viewer`: read-only.

Public pages remain readable without login. The `/admin` route redirects unauthenticated users and viewers to `/login`.
