# Membership Management

### Overview:
#This is NOBE's original internal attendance tool, made for both exec and members for many different uses like making event, tracking attendance and being informed on future events. The purpose is to make the organization of events and points more streamlined as opposed to relying on google sheets to track everyones attendance and points. We will be working on expanding this idea as an independent project that can be sold to other organizations.

### Project Tech Stack:

Testing testing

### Google sign-in:

Enable the Google provider in **Supabase Dashboard → Authentication → Sign In / Providers** and add the Google OAuth client ID and secret. In **Authentication → URL Configuration**, allow the application callback URL:

- `http://localhost:3000/PortalLoginPage/google/callback` for local development
- `https://<your-domain>/PortalLoginPage/google/callback` for production

Use the Supabase-provided callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) as the authorized redirect URI in the Google OAuth client. Google sign-in and account creation accept any valid email address.

### Supabase `people` table:

The application uses the lowercase `public.people` table. Apply the SQL in `supabase/migrations/20261011213800_fix_people_auth_trigger.sql` to your Supabase project (for example, in the Supabase SQL Editor) so the `auth.users` trigger writes to the existing table when accounts are created.

### Organization invites:

Organization invites use the existing `public.memberships` table (with a unique constraint on `(person_id, org_id)`) and `public.people.auth_id` to associate signed-in accounts with memberships. Apply `supabase/migrations/20261029200000_org_invites.sql` in the Supabase SQL Editor after those tables exist. If that migration was already applied, also apply `supabase/migrations/20261029222000_fix_org_invite_accept_ambiguity.sql` and `supabase/migrations/20261101220000_reusable_admin_org_invites.sql`. Organization admins can create reusable invite links with no expiration; accepting a link requires signing in and adds the account as a `MEMBER`. To email an invite from the dashboard, configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` with a verified sender address in Resend.