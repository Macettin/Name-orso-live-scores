# Orso Sports Hub

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
4. Paste and run `supabase/migrations/002_add_auth_roles_policies.sql`.
5. Copy `.env.example` to `.env.local`.
6. Fill in your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

To email Orso Sports Events when a public tournament application is submitted, add Resend server-side email settings:

```bash
RESEND_API_KEY=your-resend-api-key
APPLICATION_NOTIFICATION_TO_EMAIL=eren.yildirim@outlook.com
APPLICATION_NOTIFICATION_FROM_EMAIL="Orso Sports Events <notifications@your-domain.com>"
```

`RESEND_API_KEY` and `APPLICATION_NOTIFICATION_FROM_EMAIL` must stay server-only. Do not prefix them with `NEXT_PUBLIC_`. If email is not configured or delivery fails, tournament applications are still saved and applicants still see the success message.

7. Restart the dev server:

```bash
npm run dev
```

8. Create users in Supabase Authentication.
9. Assign roles in SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';

update public.profiles
set role = 'scorer'
where email = 'scorer@example.com';
```

10. Open `/login` and sign in. Admin users can manage teams, players, matches, and scores. Scorers can update scores only.

## Data Model

The Supabase migration creates:

- `profiles`
- `teams`
- `players`
- `matches`
- `match_stats`

The public pages read through Supabase. If Supabase env vars are missing, the app shows an empty dataset and does not save changes.

## Auth

Supabase Auth is used for admin access.

- `admin`: full create, edit, and delete access for teams, players, matches, match stats, and scores.
- `scorer`: can update `home_score`, `away_score`, `status`, and `period_label` on matches only.
- `viewer`: read-only.

Public pages remain readable without login. The `/admin` route redirects unauthenticated users and viewers to `/login`.
