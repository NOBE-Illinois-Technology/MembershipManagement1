-- Committee-specific events: which committees an org event is for.
--
--   event_committees   one row per (event, committee). An event with no rows is for all members.
--
-- Members see "all members" events plus events for their own committee (memberships.committee_id,
-- added by 20261122000000_member_committees.sql, which must be run first). Strikes for a
-- committee-only mandatory event only go to that committee's members.
--
-- If a committee is deleted in org settings, its rows here are deleted too; an event left with no
-- committees becomes an all-members event.
--
-- Only server routes (service role) read or write this table, so RLS is on with no policies.
-- Additive only and safe to run more than once: Supabase dashboard -> SQL Editor -> Run.

begin;

create table if not exists public.event_committees (
  event_id     uuid   not null references public.events (id) on delete cascade,
  committee_id bigint not null references public.committees (id) on delete cascade,
  primary key (event_id, committee_id)
);

create index if not exists event_committees_committee_id_idx on public.event_committees (committee_id);

alter table public.event_committees enable row level security;

commit;
