create or replace function capta_private.route_lead(p_list_id uuid)
returns table(stage_id uuid, negotiation_value_cents integer, seller_id uuid, seller_name text, seller_email text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_list public.crm_contact_lists%rowtype;
  v_cursor integer;
begin
  select * into v_list from public.crm_contact_lists where id = p_list_id for update;
  if not found then return; end if;
  stage_id := v_list.routing_stage_id;
  if stage_id is null and v_list.pipeline_id is not null then
    select s.id into stage_id from public.crm_pipeline_stages s
    where s.pipeline_id = v_list.pipeline_id order by s.position, s.created_at limit 1;
  end if;
  negotiation_value_cents := 0;
  if v_list.pipeline_id is not null then
    select p.default_value_cents into negotiation_value_cents
    from public.crm_pipelines p where p.id = v_list.pipeline_id;
  end if;
  seller_id := null; seller_name := null; seller_email := null;
  if v_list.assignment_mode = 'fixed' and v_list.fixed_seller_id is not null then
    select p.id, p.name, p.email into seller_id, seller_name, seller_email
    from public.crm_profiles p where p.id = v_list.fixed_seller_id and p.active;
  elsif v_list.assignment_mode = 'round_robin' then
    v_cursor := v_list.rotation_cursor;
    select p.id, p.name, p.email into seller_id, seller_name, seller_email
    from public.crm_list_rotation_members r
    join public.crm_profiles p on p.id = r.member_id and p.active
    where r.list_id = p_list_id order by r.position
    offset (v_cursor % greatest(1, (select count(*) from public.crm_list_rotation_members rr join public.crm_profiles pp on pp.id=rr.member_id and pp.active where rr.list_id=p_list_id)))
    limit 1;
    if seller_id is not null then
      update public.crm_contact_lists set rotation_cursor=rotation_cursor+1, updated_at=now() where id=p_list_id;
    end if;
  end if;
  return next;
end;
$$;
revoke all on function capta_private.route_lead(uuid) from public, anon, authenticated;
grant execute on function capta_private.route_lead(uuid) to service_role;
