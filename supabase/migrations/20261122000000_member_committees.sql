begin;

alter table public.memberships
  add column if not exists committee_id bigint
  references public.committees (id) on delete set null;

create index if not exists memberships_committee_id_idx
  on public.memberships (committee_id);

commit;
