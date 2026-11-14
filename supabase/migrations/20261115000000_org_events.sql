
begin;

-- 1. events.org_id
alter table public.events
  add column if not exists org_id bigint references public.organizations (id) on delete cascade;

comment on column public.events.org_id is
  'Organization that owns the event. NULL = NOBE DevOps event.';

create index if not exists events_org_id_date_idx on public.events (org_id, date);

-- 2. org_id on attendance, excused_absences and strikes
alter table public.attendance
  add column if not exists org_id bigint references public.organizations (id) on delete cascade;
alter table public.excused_absences
  add column if not exists org_id bigint references public.organizations (id) on delete cascade;
alter table public.strikes
  add column if not exists org_id bigint references public.organizations (id) on delete cascade;

comment on column public.attendance.org_id is 'Copied from the event. NULL = NOBE DevOps.';
comment on column public.excused_absences.org_id is 'Copied from the event. NULL = NOBE DevOps.';
comment on column public.strikes.org_id is 'Copied from the event (or set directly when there is no event). NULL = NOBE DevOps.';

create index if not exists attendance_event_id_idx on public.attendance (event_id);
create index if not exists excused_absences_event_id_idx on public.excused_absences (event_id);
create index if not exists strikes_event_id_idx on public.strikes (event_id);
create index if not exists strikes_org_id_user_id_idx on public.strikes (org_id, user_id);

-- 3. Keep org_id in step with the event: whenever a row points at an event, it belongs to that
--    event's org. Rows without an event keep whatever org_id they were given.
create or replace function public.set_org_id_from_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.event_id is not null then
    select e.org_id into new.org_id from public.events e where e.id = new.event_id;
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_set_org_id on public.attendance;
create trigger attendance_set_org_id
  before insert or update of event_id on public.attendance
  for each row execute function public.set_org_id_from_event();

drop trigger if exists excused_absences_set_org_id on public.excused_absences;
create trigger excused_absences_set_org_id
  before insert or update of event_id on public.excused_absences
  for each row execute function public.set_org_id_from_event();

drop trigger if exists strikes_set_org_id on public.strikes;
create trigger strikes_set_org_id
  before insert or update of event_id on public.strikes
  for each row execute function public.set_org_id_from_event();

commit;
