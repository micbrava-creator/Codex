create or replace function public.crm_route_lead(p_list_id uuid)
returns table(stage_id uuid, negotiation_value_cents integer, seller_id uuid, seller_name text, seller_email text)
language sql security definer set search_path = public, pg_temp
as $$ select * from capta_private.route_lead(p_list_id) $$;
revoke all on function public.crm_route_lead(uuid) from public, anon, authenticated;
grant execute on function public.crm_route_lead(uuid) to service_role;
