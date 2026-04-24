-- Applications rollout: trigger + RLS + RPC
-- Date: 2026-04-24
-- Run in Supabase SQL Editor (authenticated role model)

begin;

-- =====================================================
-- 0) Safety columns
-- =====================================================
alter table if exists public.teams
  add column if not exists application_count int not null default 0;

alter table if exists public.applications
  add column if not exists updated_at timestamptz not null default now();

-- =====================================================
-- 1) Helper: recalc one team's active application count
-- =====================================================
create or replace function public.sync_team_application_count(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_team_id is null then
    return;
  end if;

  update public.teams t
  set application_count = (
    select count(*)::int
    from public.applications a
    where a.team_id = p_team_id
      and a.status = 'active'
  )
  where t.id = p_team_id;
end;
$$;

-- =====================================================
-- 2) Trigger: keep teams.application_count in sync
-- =====================================================
create or replace function public.trg_applications_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.sync_team_application_count(new.team_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.sync_team_application_count(old.team_id);
    return old;
  else
    -- UPDATE
    if new.team_id is distinct from old.team_id then
      perform public.sync_team_application_count(old.team_id);
      perform public.sync_team_application_count(new.team_id);
    elsif new.status is distinct from old.status then
      perform public.sync_team_application_count(new.team_id);
    end if;

    return new;
  end if;
end;
$$;

drop trigger if exists applications_sync_count on public.applications;
create trigger applications_sync_count
after insert or update or delete on public.applications
for each row
execute function public.trg_applications_sync_count();

-- Backfill current data once
update public.teams t
set application_count = (
  select count(*)::int
  from public.applications a
  where a.team_id = t.id
    and a.status = 'active'
);

-- =====================================================
-- 3) RLS for applications
-- =====================================================
alter table if exists public.applications enable row level security;

-- Applicant can read own applications
drop policy if exists "applications_select_self" on public.applications;
create policy "applications_select_self"
on public.applications
for select
to authenticated
using (applicant_user_id = auth.uid());

-- Owner can read applications for their own team
drop policy if exists "applications_select_owner" on public.applications;
create policy "applications_select_owner"
on public.applications
for select
to authenticated
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = applications.team_id
      and tm.user_id = auth.uid()
      and tm.is_owner = true
  )
);

-- Applicant can create own application (basic gate; deep validation in RPC)
drop policy if exists "applications_insert_self" on public.applications;
create policy "applications_insert_self"
on public.applications
for insert
to authenticated
with check (applicant_user_id = auth.uid());

-- Applicant can cancel own active application
drop policy if exists "applications_update_self_cancel" on public.applications;
create policy "applications_update_self_cancel"
on public.applications
for update
to authenticated
using (applicant_user_id = auth.uid())
with check (
  applicant_user_id = auth.uid()
  and status in ('active', 'cancelled')
);

-- =====================================================
-- 4) RPC: create application
-- =====================================================
create or replace function public.create_application(
  p_team_id uuid,
  p_applicant_nickname text,
  p_applicant_qq text default null
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_team_status text;
  v_team_date date;
  v_owner_user_id uuid;
  v_active_count int;
  v_has_open_owned_team boolean;
  v_has_same_day_participation boolean;
  v_row public.applications;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_applicant_nickname is null or btrim(p_applicant_nickname) = '' then
    raise exception 'NICKNAME_REQUIRED';
  end if;

  -- Lock team row for consistency
  select t.status, t.date
    into v_team_status, v_team_date
  from public.teams t
  where t.id = p_team_id
  for update;

  if not found then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if v_team_status <> 'open' then
    raise exception 'TEAM_NOT_OPEN';
  end if;

  -- One user can only participate in one team per date
  select exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = v_uid
      and t.date = v_team_date
  ) into v_has_same_day_participation;

  if v_has_same_day_participation then
    raise exception 'ALREADY_PARTICIPATED_ON_DATE';
  end if;

  -- User with any open owned team cannot apply to other teams
  select exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = v_uid
      and tm.is_owner = true
      and t.status = 'open'
      and t.id <> p_team_id
  ) into v_has_open_owned_team;

  if v_has_open_owned_team then
    raise exception 'OWNER_HAS_OPEN_TEAM_CANNOT_APPLY';
  end if;

  -- Owner cannot apply to own room
  select tm.user_id
    into v_owner_user_id
  from public.team_members tm
  where tm.team_id = p_team_id
    and tm.is_owner = true
  limit 1;

  if v_owner_user_id = v_uid then
    raise exception 'CANNOT_APPLY_OWN_TEAM';
  end if;

  -- Member of same team cannot apply again
  if exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = v_uid
  ) then
    raise exception 'ALREADY_TEAM_MEMBER';
  end if;

  -- At most 3 active applications globally
  select count(*)::int
    into v_active_count
  from public.applications a
  where a.applicant_user_id = v_uid
    and a.status = 'active';

  if v_active_count >= 3 then
    raise exception 'ACTIVE_APPLICATION_LIMIT_REACHED';
  end if;

  insert into public.applications (
    team_id,
    applicant_user_id,
    applicant_nickname,
    applicant_qq,
    status,
    created_at,
    updated_at
  )
  values (
    p_team_id,
    v_uid,
    btrim(p_applicant_nickname),
    nullif(btrim(coalesce(p_applicant_qq, '')), ''),
    'active',
    now(),
    now()
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'DUPLICATE_ACTIVE_APPLICATION';
end;
$$;

-- =====================================================
-- 5) RPC: cancel application (self)
-- =====================================================
create or replace function public.cancel_application(
  p_application_id uuid
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.applications;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.applications a
  set status = 'cancelled',
      updated_at = now()
  where a.id = p_application_id
    and a.applicant_user_id = v_uid
    and a.status = 'active'
  returning * into v_row;

  if not found then
    raise exception 'APPLICATION_NOT_ACTIVE_OR_NOT_OWNED';
  end if;

  return v_row;
end;
$$;

-- =====================================================
-- 6) RPC: list active applications for owner's open team
-- =====================================================
create or replace function public.list_team_active_applications(
  p_team_id uuid
)
returns table (
  id uuid,
  team_id uuid,
  applicant_user_id uuid,
  applicant_nickname text,
  applicant_qq text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_is_owner boolean;
  v_team_open boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = v_uid
      and tm.is_owner = true
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'FORBIDDEN_NOT_OWNER';
  end if;

  select exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.status = 'open'
  ) into v_team_open;

  if not v_team_open then
    raise exception 'TEAM_NOT_OPEN';
  end if;

  return query
  select a.id,
         a.team_id,
         a.applicant_user_id,
         a.applicant_nickname,
         a.applicant_qq,
         a.status,
         a.created_at,
         a.updated_at
  from public.applications a
  where a.team_id = p_team_id
    and a.status = 'active'
  order by a.created_at asc;
end;
$$;

-- =====================================================
-- 7) RPC: owner accepts one application -> team matched
-- =====================================================
create or replace function public.accept_application(
  p_application_id uuid
)
returns table (
  team_id uuid,
  accepted_application_id uuid,
  joiner_user_id uuid,
  joiner_nickname text,
  team_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_target_team_id uuid;
  v_app public.applications;
  v_target_team_status text;
  v_target_team_date date;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  -- Lock target application
  select *
    into v_app
  from public.applications a
  where a.id = p_application_id
  for update;

  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;

  if v_app.status <> 'active' then
    raise exception 'APPLICATION_NOT_ACTIVE';
  end if;

  v_target_team_id := v_app.team_id;

  -- Owner check
  if not exists (
    select 1
    from public.team_members tm
    where tm.team_id = v_target_team_id
      and tm.user_id = v_uid
      and tm.is_owner = true
  ) then
    raise exception 'FORBIDDEN_NOT_OWNER';
  end if;

  -- Lock team row and ensure open
  select t.status, t.date
    into v_target_team_status, v_target_team_date
  from public.teams t
  where t.id = v_target_team_id
  for update;

  if not found then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if v_target_team_status <> 'open' then
    raise exception 'TEAM_NOT_OPEN';
  end if;

  -- Safety check: applicant cannot already be in another team on same date
  if exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = v_app.applicant_user_id
      and t.date = v_target_team_date
      and tm.team_id <> v_target_team_id
  ) then
    raise exception 'APPLICANT_ALREADY_PARTICIPATED_ON_DATE';
  end if;

  -- Accept selected application
  update public.applications
  set status = 'accepted',
      updated_at = now()
  where id = p_application_id;

  -- Reject other active applications in same team
  update public.applications a
  set status = 'rejected',
      updated_at = now()
  where a.team_id = v_target_team_id
    and a.id <> p_application_id
    and a.status = 'active';

  -- If the accepted user has active applications in other teams, invalidate them
  update public.applications a
  set status = 'rejected',
      updated_at = now()
  where a.applicant_user_id = v_app.applicant_user_id
    and a.id <> p_application_id
    and a.status = 'active';

  -- Update team to matched and write joiner snapshot
  update public.teams
  set status = 'matched',
      joiner_nickname = v_app.applicant_nickname,
      joiner_qq_number = v_app.applicant_qq
  where id = v_target_team_id;

  -- Ensure joiner is in team_members
  insert into public.team_members (
    team_id,
    user_id,
    nickname,
    qq_number,
    is_owner,
    created_at
  )
  values (
    v_target_team_id,
    v_app.applicant_user_id,
    v_app.applicant_nickname,
    v_app.applicant_qq,
    false,
    now()
  )
  on conflict (team_id, user_id)
  do update
    set nickname = excluded.nickname,
        qq_number = excluded.qq_number,
        is_owner = false;

  team_id := v_target_team_id;
  accepted_application_id := p_application_id;
  joiner_user_id := v_app.applicant_user_id;
  joiner_nickname := v_app.applicant_nickname;
  team_status := 'matched';
  return next;
  return;
end;
$$;

-- =====================================================
-- 8) RPC: owner deletes own open team
-- =====================================================
create or replace function public.delete_open_team(
  p_team_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = v_uid
      and tm.is_owner = true
  ) then
    raise exception 'FORBIDDEN_NOT_OWNER';
  end if;

  if not exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.status = 'open'
  ) then
    raise exception 'TEAM_NOT_OPEN';
  end if;

  delete from public.teams
  where id = p_team_id;

  return p_team_id;
end;
$$;

-- =====================================================
-- 9) Grants for RPC
-- =====================================================
revoke all on function public.create_application(uuid, text, text) from public;
revoke all on function public.cancel_application(uuid) from public;
revoke all on function public.list_team_active_applications(uuid) from public;
revoke all on function public.accept_application(uuid) from public;
revoke all on function public.delete_open_team(uuid) from public;

grant execute on function public.create_application(uuid, text, text) to authenticated;
grant execute on function public.cancel_application(uuid) to authenticated;
grant execute on function public.list_team_active_applications(uuid) to authenticated;
grant execute on function public.accept_application(uuid) to authenticated;
grant execute on function public.delete_open_team(uuid) to authenticated;

commit;

-- =====================================================
-- Quick checks you can run after migration
-- =====================================================
-- 1) Ensure trigger exists
-- select tgname from pg_trigger where tgname = 'applications_sync_count';

-- 2) Compare derived count vs stored count (should all match)
-- select t.id,
--        t.application_count as stored_count,
--        coalesce(x.active_count, 0) as derived_count
-- from public.teams t
-- left join (
--   select team_id, count(*)::int as active_count
--   from public.applications
--   where status = 'active'
--   group by team_id
-- ) x on x.team_id = t.id
-- where t.application_count <> coalesce(x.active_count, 0);
