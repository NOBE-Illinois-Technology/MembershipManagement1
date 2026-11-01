-- Org settings (ticket #15): logo, primary/secondary colors, total points, point categories,
-- strikes, and committees. Builds on the organizations table from #11.
--
--   organizations       gains secondary_color, total_points_required, strikes_enabled, max_strikes
--                       (logo_url and primary_color already exist)
--   point_categories    0..n point types per org (Professional, Service, ...), each optional/mandatory
--   committees          0..n committees per org
--   storage: org-logos  public bucket for uploaded logos; organizations.logo_url points at the file
--
-- Additive only: nothing is renamed or dropped. Safe to run more than once.
-- Run in the Supabase dashboard: SQL Editor -> paste this file -> Run.

begin;

-- 1. Org-wide settings live on the org itself.
alter table public.organizations
  add column if not exists secondary_color       text,
  add column if not exists total_points_required integer not null default 0,
  add column if not exists strikes_enabled       boolean not null default false,
  add column if not exists max_strikes           integer;

alter table public.organizations drop constraint if exists organizations_total_points_required_check;
alter table public.organizations
  add constraint organizations_total_points_required_check check (total_points_required >= 0);

alter table public.organizations drop constraint if exists organizations_max_strikes_check;
alter table public.organizations
  add constraint organizations_max_strikes_check check (max_strikes is null or max_strikes > 0);

-- 2. Point categories: optional, any number per org. Names are checked for duplicates in the app
--    (a unique index here would reject swapping two names in one save).
create table if not exists public.point_categories (
  id              bigint generated always as identity primary key,
  org_id          bigint  not null references public.organizations (id) on delete cascade,
  name            text    not null check (length(trim(name)) between 1 and 40),
  points_required integer not null default 0 check (points_required >= 0),
  is_mandatory    boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists point_categories_org_id_idx on public.point_categories (org_id);

-- 3. Committees: optional, any number per org.
create table if not exists public.committees (
  id         bigint generated always as identity primary key,
  org_id     bigint not null references public.organizations (id) on delete cascade,
  name       text   not null check (length(trim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists committees_org_id_idx on public.committees (org_id);

-- 4. Security, same approach as memberships: signed-in users can read rows for orgs they belong
--    to; there are no write policies, so all changes go through server routes that use the
--    service role and check the caller is an ADMIN of the org.
alter table public.point_categories enable row level security;
alter table public.committees enable row level security;

drop policy if exists "Members can read their orgs' point categories" on public.point_categories;
create policy "Members can read their orgs' point categories"
  on public.point_categories
  for select
  to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.org_id = point_categories.org_id and m.person_id = private.current_person_id()
  ));

drop policy if exists "Members can read their orgs' committees" on public.committees;
create policy "Members can read their orgs' committees"
  on public.committees
  for select
  to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.org_id = committees.org_id and m.person_id = private.current_person_id()
  ));

-- 5. Logo uploads. Public so logos load anywhere without signed URLs; uploads go through the
--    server (service role), so no storage policies are needed. 2 MB, PNG/JPEG/WebP/GIF only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-logos', 'org-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

commit;
