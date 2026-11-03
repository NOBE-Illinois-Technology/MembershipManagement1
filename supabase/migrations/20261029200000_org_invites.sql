create table public.org_invites (
  id bigint generated always as identity primary key,
  org_id bigint not null references public.organizations (id) on delete cascade,
  token_hash text not null unique,
  created_by bigint not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by bigint references public.people (id) on delete set null
);

create index org_invites_org_id_idx on public.org_invites (org_id);

alter table public.org_invites enable row level security;
revoke all on public.org_invites from public, anon, authenticated;
grant all on public.org_invites to service_role;
grant usage, select on sequence public.org_invites_id_seq to service_role;

create or replace function public.accept_org_invite(p_token_hash text, p_person_id bigint)
returns table (org_id bigint, org_name text, org_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.org_invites%rowtype;
  organization_row public.organizations%rowtype;
begin
  select *
    into invite_row
    from public.org_invites
   where token_hash = p_token_hash
   for update;

  if not found then
    return;
  end if;

  insert into public.memberships (person_id, org_id)
  values (p_person_id, invite_row.org_id)
  on conflict on constraint memberships_person_id_org_id_key do nothing;

  select *
    into organization_row
    from public.organizations
   where id = invite_row.org_id;

  return query
    select organization_row.id, organization_row.name, organization_row.slug;
end;
$$;

revoke all on function public.accept_org_invite(text, bigint) from public, anon, authenticated;
grant execute on function public.accept_org_invite(text, bigint) to service_role;
