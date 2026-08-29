revoke all privileges on table
  public.crm_profiles, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_contact_lists, public.crm_list_rotation_members, public.crm_contacts,
  public.crm_card_tasks, public.crm_contact_stage_history, public.crm_email_settings,
  public.crm_webhook_events, public.crm_email_delivery_logs, public.crm_audit_logs
from anon, authenticated;

grant select, insert, update, delete on table
  public.crm_profiles, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_contact_lists, public.crm_list_rotation_members, public.crm_contacts,
  public.crm_card_tasks, public.crm_contact_stage_history, public.crm_email_settings,
  public.crm_webhook_events, public.crm_email_delivery_logs, public.crm_audit_logs
to authenticated;

insert into public.crm_profiles (id, email, name, role, active)
select id, email, coalesce(raw_user_meta_data ->> 'name', 'Michel Brava'), 'manager', true
from auth.users where lower(email) = 'micbrava@gmail.com'
on conflict (id) do update
set email = excluded.email, role = 'manager', active = true, updated_at = now();
