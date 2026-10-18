-- Repurpose `people` as the portal-wide user table and add per-org membership.
--
--   people          who someone is (one row per login, linked by auth_id)
--   memberships     which orgs they belong to, and their role in each org
--   organizations   the orgs themselves (NOBE DevOps is added below)
--
-- Additive only: nothing is renamed or dropped, and people.role is left in place
-- until the NOBE code has moved to reading roles from memberships.
-- Safe to run more than once.
--
-- Run in the Supabase dashboard: SQL Editor -> paste this file -> Run.

begin;

-- 1. memberships: one row per (person, org), holding that person's role in that org.
create table if not exists public.memberships (
  id         bigint generated always as identity primary key,
  person_id  bigint not null references public.people (id) on delete cascade,
  org_id     bigint not null references public.organizations (id) on delete cascade,
  role       text   not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  created_at timestamptz not null default now(),
  unique (person_id, org_id)
);

create index if not exists memberships_org_id_idx on public.memberships (org_id);

-- 2. One person per login, so "the person for this login" is never ambiguous.
--    (Several NULLs are still allowed, e.g. people invited but not signed up yet.)
create unique index if not exists people_auth_id_unique on public.people (auth_id);

-- 3. Security: a signed-in user can read only their own memberships.
--
--    The helper runs as its owner (SECURITY DEFINER) so the policy can look up the caller's
--    person id even if RLS on people would hide that row. It only ever returns the caller's
--    own id, lives in a `private` schema the Supabase API does not expose, and only
--    signed-in users may execute it.
--
--    Only SELECT has a policy, so with RLS on, browsers cannot insert/update/delete
--    memberships at all. Those writes must go through server routes using the service
--    role key (which bypasses RLS), and each such route must check that the caller is an
--    ADMIN of that org before changing anything.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_person_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.people p where p.auth_id = auth.uid()
$$;

revoke all on function private.current_person_id() from public, anon;
grant execute on function private.current_person_id() to authenticated;

alter table public.memberships enable row level security;

drop policy if exists "Users can read their own memberships" on public.memberships;
create policy "Users can read their own memberships"
  on public.memberships
  for select
  to authenticated
  using (person_id = private.current_person_id());

-- 4. Add NOBE DevOps to organizations.
insert into public.organizations (name, slug, logo_url, primary_color, allowed_email_domain, plan, status)
values (
  'National Organization for Business and Engineering',
  'nobe',
  '/nobe_logo_f.svg',
  '#E58A27',
  'illinois.edu',
  'free',
  'active'
)
on conflict (slug) do nothing;

-- 5. Everyone already in people is a NOBE member; carry their current role over.
--    Case and spacing are normalized ('admin ' -> 'ADMIN'). Any other value fails the
--    role check and rolls back the whole script, so nothing is half-applied.
insert into public.memberships (person_id, org_id, role)
select p.id, o.id, coalesce(nullif(upper(trim(p.role)), ''), 'MEMBER')
from public.people p
cross join public.organizations o
where o.slug = 'nobe'
on conflict (person_id, org_id) do nothing;

commit;

-- Optional: make someone a NOBE admin (no one in people is ADMIN today).
-- Replace the email, then run this on its own:
--
-- update public.memberships m
-- set role = 'ADMIN'
-- from public.people p, public.organizations o
-- where m.person_id = p.id and m.org_id = o.id
--   and o.slug = 'nobe' and p.illinois_email = 'you@illinois.edu';
