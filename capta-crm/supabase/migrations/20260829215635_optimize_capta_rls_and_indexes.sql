create index crm_lists_fixed_seller_idx on public.crm_contact_lists(fixed_seller_id);
create index crm_lists_routing_stage_idx on public.crm_contact_lists(routing_stage_id);
create index crm_history_stage_idx on public.crm_contact_stage_history(stage_id);
create index crm_email_settings_updated_by_idx on public.crm_email_settings(updated_by);
create index crm_rotation_member_idx on public.crm_list_rotation_members(member_id);
create index crm_webhook_events_contact_idx on public.crm_webhook_events(contact_id);

drop policy crm_profiles_manage on public.crm_profiles;
create policy crm_profiles_insert on public.crm_profiles for insert to authenticated
with check (capta_private.current_crm_role() = 'manager');
create policy crm_profiles_update on public.crm_profiles for update to authenticated
using (capta_private.current_crm_role() = 'manager')
with check (capta_private.current_crm_role() = 'manager');
create policy crm_profiles_delete on public.crm_profiles for delete to authenticated
using (capta_private.current_crm_role() = 'manager');

drop policy crm_pipelines_manage on public.crm_pipelines;
create policy crm_pipelines_insert on public.crm_pipelines for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_pipelines_update on public.crm_pipelines for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_pipelines_delete on public.crm_pipelines for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

drop policy crm_stages_manage on public.crm_pipeline_stages;
create policy crm_stages_insert on public.crm_pipeline_stages for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_stages_update on public.crm_pipeline_stages for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_stages_delete on public.crm_pipeline_stages for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

drop policy crm_lists_manage on public.crm_contact_lists;
create policy crm_lists_insert on public.crm_contact_lists for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_lists_update on public.crm_contact_lists for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_lists_delete on public.crm_contact_lists for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

drop policy crm_rotation_manage on public.crm_list_rotation_members;
create policy crm_rotation_insert on public.crm_list_rotation_members for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_rotation_update on public.crm_list_rotation_members for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_rotation_delete on public.crm_list_rotation_members for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

drop policy crm_history_write on public.crm_contact_stage_history;
create policy crm_history_insert on public.crm_contact_stage_history for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_history_update on public.crm_contact_stage_history for update to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_history_delete on public.crm_contact_stage_history for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

drop policy crm_email_settings_manage on public.crm_email_settings;
create policy crm_email_settings_insert on public.crm_email_settings for insert to authenticated
with check (capta_private.current_crm_role() = 'manager');
create policy crm_email_settings_update on public.crm_email_settings for update to authenticated
using (capta_private.current_crm_role() = 'manager')
with check (capta_private.current_crm_role() = 'manager');
create policy crm_email_settings_delete on public.crm_email_settings for delete to authenticated
using (capta_private.current_crm_role() = 'manager');
