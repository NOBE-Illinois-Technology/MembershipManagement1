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
