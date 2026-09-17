# Elladria Supabase backend

Project: `qaoihforpilrmrjdzbjr`.

## Current setup

Both migrations have been applied by the project owner. The public catalog RPC was
verified against the hosted project. Anonymous profile access returns HTTP 401.
`mobile/.env.local` selects Supabase and contains only the project URL and publishable
key. Never put database passwords, secret keys or service-role keys in EXPO_PUBLIC variables.

The candidate app now uses Supabase Auth, catalog reads, applications, appointments
and private document uploads. The existing staff dashboard uses a separate staff
session for job publishing, app content, activity review and document downloads.
The local JSON server remains available in local mode; local data was not imported.

## Use locally

Open http://localhost:8093/?admin=1 and sign in using the account created in Supabase.
The owner reports assigning admin to `9595a134-f904-4ad4-aaf0-0c56121df642`.
Create a job, enter its details, select Published and save. Open
http://localhost:8093/mobile-preview.html to see published vacancies.
The cloud catalog starts empty. Old local logins do not work as Supabase accounts.

Candidate signup displays a confirmation instruction when email confirmation is
required. Confirm the email, then return to the app and sign in. Staff and candidate
browser sessions are separate. Signing out of one does not sign out of the other.
Uploaded job images are public; candidate documents use private storage and short-lived
signed download URLs. Candidate documents are limited to 5 MB by the current UI.

## Fresh project setup

Run these migrations once, in order, in Supabase SQL Editor:

1. `migrations/202609160001_initial.sql`
2. `migrations/202609160002_app_operations.sql`
3. `migrations/202609160003_upload_limits.sql` (5 MB per candidate file; PDF/JPG/PNG only)
4. `migrations/202609160004_categories.sql` (managed category choices and catalog feed)

Create a user in Authentication > Users, then grant the role through trusted SQL:

```sql
insert into public.staff_roles(user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict(user_id) do update set role = excluded.role;
```

Both staff roles currently have recruitment permissions. The app cannot assign
staff roles. Profile emails are synchronized from Auth by a trigger; profile metadata
cannot grant staff access. Catalog writes use a transaction and revision check.
Bookings reject duplicate office/time slots, with cancellation freeing the slot.

## Verification

From `mobile` run `npm run typecheck`, `npm test`, and `npm run test:database`.
Database tests use an isolated PGlite PostgreSQL instance with minimal Auth/Storage
schemas; they do not claim to test Supabase's hosted Auth or file service itself.
They verify access policies, role escalation prevention, public draft filtering,
stale catalog saves, featured replacement, application ownership/snapshots,
booking collisions/cancellation and document metadata isolation.

The live browser preview was checked against the public cloud catalog and staff
login gate. Staff publish -> candidate login/apply -> staff review passed in a browser
with mocked Supabase responses. No remote test users or job records were created.
Real signed-in acceptance and physical Android/iOS testing are still required.

## Before production

Configure Auth Site URL and allowed redirect URLs for the final HTTPS website.
For local confirmation links use http://localhost:8093 as the Site URL. Configure
reliable SMTP/email delivery, password recovery, account deletion, privacy policy,
abuse controls, backup policy and monitoring before releasing to real candidates.
Review the current demo office addresses and booking rules before accepting bookings.
The table reads currently use Supabase's default response limits; add pagination
before scaling the dashboard beyond those limits.

Host the web export separately from the legacy local Node server. That server's
local-only admin bypass is intended for development and must not be deployed as the
cloud API. Cloud clients access Supabase directly using RLS and authenticated RPCs.
Only publishable keys belong in the client build.

To use the original local backend, set EXPO_PUBLIC_BACKEND=local and rebuild.
Changing environment variables requires rebuilding the static export/restarting Expo.

The upload-limit migration is prepared but requires the owner to apply it in SQL Editor.
Until then the app rejects files over 5 MB, but the hosted bucket retains its previous limit.
There is no per-candidate total-storage quota or automatic retention/deletion policy yet.

## Categories, announcements and notifications

After applying migration 004, staff can create, rename and remove unused categories
under Jobs & vacancies. Vacancy forms offer those choices, and customers filter by
the same list. Existing job category names are preserved (case variants are unified).
Renaming cascades to jobs; categories used by any job cannot be removed. Changes use
revision checks and staff-only database functions. The migration is pending until
the project owner applies it.

Announcements need a title, message, the visibility checkbox, and Publish app content.
The current saved announcement was hidden with an empty message; no announcement was
published by the assistant. The admin now distinguishes hidden, published and unsaved
states. The candidate Home screen and Notifications screen show enabled announcements.

The bell counts unread current announcements and latest application statuses. Opening
a notification or Mark all as read clears its unread flag. Changes to announcement
text or application status create a new notification identity. Read flags are stored
per account on the current device; they are not synchronized across devices. Reminders
remain available separately. These are in-app notices, not OS push notifications.


## Account management release work (2026-09-17)

Password recovery and account-deletion UI are now implemented. The delete-account Edge Function is prepared locally with password verification, staff protection, paginated private-document cleanup and Auth deletion. It has NOT been deployed. See [Android release setup](../mobile/docs/ANDROID-RELEASE.md) for deployment, recovery redirect configuration and current verification. Real email delivery, hosted deletion and device acceptance are still required.
