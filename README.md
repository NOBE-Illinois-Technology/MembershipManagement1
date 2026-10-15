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