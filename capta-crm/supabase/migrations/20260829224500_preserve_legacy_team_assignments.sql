alter table public.crm_contacts add column if not exists legacy_assigned_member_id uuid;
alter table public.crm_contact_lists add column if not exists legacy_fixed_seller_id uuid;

create table if not exists public.crm_pending_team_members (
  legacy_id uuid primary key, email text not null unique, name text not null,
  role text not null check (role in ('manager','sales','admin')),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.crm_pending_rotation_members (
  list_id uuid not null references public.crm_contact_lists(id) on delete cascade,
  legacy_member_id uuid not null references public.crm_pending_team_members(legacy_id) on delete cascade,
  position integer not null default 0, primary key (list_id,legacy_member_id)
);
create index if not exists crm_pending_rotation_legacy_member_idx on public.crm_pending_rotation_members(legacy_member_id);
alter table public.crm_pending_team_members enable row level security;
alter table public.crm_pending_rotation_members enable row level security;
revoke all on public.crm_pending_team_members,public.crm_pending_rotation_members from anon,authenticated;
grant select,insert,update,delete on public.crm_pending_team_members,public.crm_pending_rotation_members to authenticated;

create policy crm_pending_team_manager_select on public.crm_pending_team_members for select to authenticated using (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_team_manager_insert on public.crm_pending_team_members for insert to authenticated with check (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_team_manager_update on public.crm_pending_team_members for update to authenticated using (capta_private.is_crm_active() and capta_private.current_crm_role()='manager') with check (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_team_manager_delete on public.crm_pending_team_members for delete to authenticated using (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_rotation_manager_select on public.crm_pending_rotation_members for select to authenticated using (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_rotation_manager_insert on public.crm_pending_rotation_members for insert to authenticated with check (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_rotation_manager_update on public.crm_pending_rotation_members for update to authenticated using (capta_private.is_crm_active() and capta_private.current_crm_role()='manager') with check (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');
create policy crm_pending_rotation_manager_delete on public.crm_pending_rotation_members for delete to authenticated using (capta_private.is_crm_active() and capta_private.current_crm_role()='manager');

create or replace function public.crm_link_pending_profile(p_auth_id uuid,p_email text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_pending public.crm_pending_team_members%rowtype;
begin
  select * into v_pending from public.crm_pending_team_members where lower(email)=lower(p_email) for update;
  if not found then return; end if;
  insert into public.crm_profiles(id,email,name,role,active) values(p_auth_id,lower(v_pending.email),v_pending.name,v_pending.role,v_pending.active)
  on conflict(id) do update set email=excluded.email,name=excluded.name,role=excluded.role,active=excluded.active,updated_at=now();
  update public.crm_contacts set assigned_user_id=p_auth_id,legacy_assigned_member_id=null where legacy_assigned_member_id=v_pending.legacy_id;
  update public.crm_contact_lists set fixed_seller_id=p_auth_id,legacy_fixed_seller_id=null where legacy_fixed_seller_id=v_pending.legacy_id;
  insert into public.crm_list_rotation_members(list_id,member_id,position)
  select list_id,p_auth_id,position from public.crm_pending_rotation_members where legacy_member_id=v_pending.legacy_id
  on conflict(list_id,member_id) do update set position=excluded.position;
  delete from public.crm_pending_rotation_members where legacy_member_id=v_pending.legacy_id;
  delete from public.crm_pending_team_members where legacy_id=v_pending.legacy_id;
end $$;
revoke all on function public.crm_link_pending_profile(uuid,text) from public,anon,authenticated;
grant execute on function public.crm_link_pending_profile(uuid,text) to service_role;
