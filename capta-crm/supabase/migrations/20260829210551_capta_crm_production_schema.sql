create schema if not exists capta_private;
revoke all on schema capta_private from public, anon, authenticated;

create table public.crm_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null unique,
  name text not null default '',
  role text not null default 'sales' check (role in ('manager', 'sales', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  color text not null default '#5B5BD6',
  default_value_cents bigint not null default 0 check (default_value_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  position integer not null default 0 check (position >= 0),
  color text not null default '#E8E7FF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, position)
);

create table public.crm_contact_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  segment text not null default '',
  color text not null default '#5B5BD6',
  webhook_token text not null unique check (char_length(webhook_token) >= 24),
  pipeline_id uuid references public.crm_pipelines(id) on delete set null,
  routing_stage_id uuid references public.crm_pipeline_stages(id) on delete set null,
  assignment_mode text not null default 'manual' check (assignment_mode in ('manual', 'fixed', 'round_robin')),
  fixed_seller_id uuid references public.crm_profiles(id) on delete set null,
  rotation_cursor bigint not null default 0 check (rotation_cursor >= 0),
  email_alerts_enabled boolean not null default true,
  confirmation_email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_list_rotation_members (
  list_id uuid not null references public.crm_contact_lists(id) on delete cascade,
  member_id uuid not null references public.crm_profiles(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  primary key (list_id, member_id),
  unique (list_id, position)
);

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.crm_contact_lists(id) on delete restrict,
  stage_id uuid references public.crm_pipeline_stages(id) on delete set null,
  assigned_user_id uuid references public.crm_profiles(id) on delete set null,
  negotiation_value_cents bigint not null default 0 check (negotiation_value_cents >= 0),
  sale_completed boolean not null default false,
  sale_completed_at timestamptz,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  notes text not null default '',
  source text not null default 'manual' check (source in ('manual', 'webhook', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not sale_completed or sale_completed_at is not null)
);

create table public.crm_card_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  due_date timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_contact_stage_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  stage_id uuid not null references public.crm_pipeline_stages(id) on delete cascade,
  entered_at timestamptz not null default now(),
  unique (contact_id, stage_id)
);

create table public.crm_email_settings (
  id text primary key,
  subject text not null check (char_length(btrim(subject)) between 1 and 240),
  message text not null check (char_length(btrim(message)) between 1 and 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.crm_profiles(id) on delete set null
);

create table public.crm_webhook_events (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.crm_contact_lists(id) on delete restrict,
  idempotency_key text not null,
  payload_hash text not null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (list_id, idempotency_key)
);

create table public.crm_email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.crm_contacts(id) on delete set null,
  recipient text not null,
  kind text not null check (kind in ('seller_alert', 'lead_confirmation', 'auth')),
  provider_message_id text,
  status text not null default 'queued',
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.crm_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index crm_profiles_role_active_idx on public.crm_profiles(role, active);
create index crm_stages_pipeline_position_idx on public.crm_pipeline_stages(pipeline_id, position);
create index crm_lists_pipeline_idx on public.crm_contact_lists(pipeline_id);
create index crm_rotation_list_position_idx on public.crm_list_rotation_members(list_id, position);
create index crm_contacts_list_created_idx on public.crm_contacts(list_id, created_at desc);
create index crm_contacts_assigned_created_idx on public.crm_contacts(assigned_user_id, created_at desc);
create index crm_contacts_stage_idx on public.crm_contacts(stage_id);
create index crm_contacts_email_lower_idx on public.crm_contacts(list_id, lower(email)) where email <> '';
create index crm_tasks_contact_idx on public.crm_card_tasks(contact_id);
create index crm_tasks_due_pending_idx on public.crm_card_tasks(due_date) where not completed;
create index crm_history_pipeline_stage_idx on public.crm_contact_stage_history(pipeline_id, stage_id);
create index crm_webhook_events_created_idx on public.crm_webhook_events(created_at desc);
create index crm_email_logs_contact_idx on public.crm_email_delivery_logs(contact_id, created_at desc);
create index crm_audit_created_idx on public.crm_audit_logs(created_at desc);
create index crm_audit_actor_idx on public.crm_audit_logs(actor_id, created_at desc);

create or replace function capta_private.current_crm_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.crm_profiles p
  where p.id = (select auth.uid()) and p.active = true
  limit 1
$$;

create or replace function capta_private.is_crm_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.crm_profiles p
    where p.id = (select auth.uid()) and p.active = true
  )
$$;

revoke all on function capta_private.current_crm_role() from public, anon;
revoke all on function capta_private.is_crm_active() from public, anon;
grant usage on schema capta_private to authenticated;
grant execute on function capta_private.current_crm_role() to authenticated;
grant execute on function capta_private.is_crm_active() to authenticated;

create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

revoke all on function public.crm_set_updated_at() from public, anon, authenticated;

create trigger crm_profiles_updated_at before update on public.crm_profiles for each row execute function public.crm_set_updated_at();
create trigger crm_pipelines_updated_at before update on public.crm_pipelines for each row execute function public.crm_set_updated_at();
create trigger crm_stages_updated_at before update on public.crm_pipeline_stages for each row execute function public.crm_set_updated_at();
create trigger crm_lists_updated_at before update on public.crm_contact_lists for each row execute function public.crm_set_updated_at();
create trigger crm_contacts_updated_at before update on public.crm_contacts for each row execute function public.crm_set_updated_at();
create trigger crm_tasks_updated_at before update on public.crm_card_tasks for each row execute function public.crm_set_updated_at();
create trigger crm_email_delivery_updated_at before update on public.crm_email_delivery_logs for each row execute function public.crm_set_updated_at();

alter table public.crm_profiles enable row level security;
alter table public.crm_pipelines enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_contact_lists enable row level security;
alter table public.crm_list_rotation_members enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_card_tasks enable row level security;
alter table public.crm_contact_stage_history enable row level security;
alter table public.crm_email_settings enable row level security;
alter table public.crm_webhook_events enable row level security;
alter table public.crm_email_delivery_logs enable row level security;
alter table public.crm_audit_logs enable row level security;

create policy crm_profiles_select on public.crm_profiles for select to authenticated
using (capta_private.is_crm_active());
create policy crm_profiles_manage on public.crm_profiles for all to authenticated
using (capta_private.current_crm_role() = 'manager')
with check (capta_private.current_crm_role() = 'manager');

create policy crm_pipelines_select on public.crm_pipelines for select to authenticated
using (capta_private.is_crm_active());
create policy crm_pipelines_manage on public.crm_pipelines for all to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_stages_select on public.crm_pipeline_stages for select to authenticated
using (capta_private.is_crm_active());
create policy crm_stages_manage on public.crm_pipeline_stages for all to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_lists_select on public.crm_contact_lists for select to authenticated
using (capta_private.is_crm_active());
create policy crm_lists_manage on public.crm_contact_lists for all to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_rotation_select on public.crm_list_rotation_members for select to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_rotation_manage on public.crm_list_rotation_members for all to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_contacts_select on public.crm_contacts for select to authenticated
using (
  capta_private.current_crm_role() in ('manager', 'admin')
  or (capta_private.current_crm_role() = 'sales' and assigned_user_id = (select auth.uid()))
);
create policy crm_contacts_insert on public.crm_contacts for insert to authenticated
with check (capta_private.current_crm_role() in ('manager', 'admin'));
create policy crm_contacts_update on public.crm_contacts for update to authenticated
using (
  capta_private.current_crm_role() in ('manager', 'admin')
  or (capta_private.current_crm_role() = 'sales' and assigned_user_id = (select auth.uid()))
)
with check (
  capta_private.current_crm_role() in ('manager', 'admin')
  or (capta_private.current_crm_role() = 'sales' and assigned_user_id = (select auth.uid()))
);
create policy crm_contacts_delete on public.crm_contacts for delete to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_tasks_select on public.crm_card_tasks for select to authenticated
using (
  exists (
    select 1 from public.crm_contacts c
    where c.id = contact_id and (
      capta_private.current_crm_role() in ('manager', 'admin')
      or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
    )
  )
);
create policy crm_tasks_insert on public.crm_card_tasks for insert to authenticated
with check (
  exists (
    select 1 from public.crm_contacts c
    where c.id = contact_id and (
      capta_private.current_crm_role() in ('manager', 'admin')
      or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
    )
  )
);
create policy crm_tasks_update on public.crm_card_tasks for update to authenticated
using (
  exists (
    select 1 from public.crm_contacts c
    where c.id = contact_id and (
      capta_private.current_crm_role() in ('manager', 'admin')
      or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
    )
  )
)
with check (
  exists (
    select 1 from public.crm_contacts c
    where c.id = contact_id and (
      capta_private.current_crm_role() in ('manager', 'admin')
      or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
    )
  )
);
create policy crm_tasks_delete on public.crm_card_tasks for delete to authenticated
using (
  exists (
    select 1 from public.crm_contacts c
    where c.id = contact_id and (
      capta_private.current_crm_role() in ('manager', 'admin')
      or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
    )
  )
);

create policy crm_history_select on public.crm_contact_stage_history for select to authenticated
using (
  exists (
    select 1 from public.crm_contacts c
    where c.id = contact_id and (
      capta_private.current_crm_role() in ('manager', 'admin')
      or (capta_private.current_crm_role() = 'sales' and c.assigned_user_id = (select auth.uid()))
    )
  )
);
create policy crm_history_write on public.crm_contact_stage_history for all to authenticated
using (capta_private.current_crm_role() in ('manager', 'admin'))
with check (capta_private.current_crm_role() in ('manager', 'admin'));

create policy crm_email_settings_select on public.crm_email_settings for select to authenticated
using (capta_private.is_crm_active());
create policy crm_email_settings_manage on public.crm_email_settings for all to authenticated
using (capta_private.current_crm_role() = 'manager')
with check (capta_private.current_crm_role() = 'manager');

create policy crm_webhook_events_manager on public.crm_webhook_events for select to authenticated
using (capta_private.current_crm_role() = 'manager');
create policy crm_email_logs_manager on public.crm_email_delivery_logs for select to authenticated
using (capta_private.current_crm_role() = 'manager');
create policy crm_audit_manager on public.crm_audit_logs for select to authenticated
using (capta_private.current_crm_role() = 'manager');

grant usage on schema public to authenticated;
grant select on public.crm_profiles, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_contact_lists, public.crm_list_rotation_members, public.crm_contacts,
  public.crm_card_tasks, public.crm_contact_stage_history, public.crm_email_settings,
  public.crm_webhook_events, public.crm_email_delivery_logs, public.crm_audit_logs
to authenticated;
grant insert, update, delete on public.crm_profiles, public.crm_pipelines,
  public.crm_pipeline_stages, public.crm_contact_lists, public.crm_list_rotation_members,
  public.crm_contacts, public.crm_card_tasks, public.crm_contact_stage_history,
  public.crm_email_settings
to authenticated;

revoke all on public.crm_profiles, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_contact_lists, public.crm_list_rotation_members, public.crm_contacts,
  public.crm_card_tasks, public.crm_contact_stage_history, public.crm_email_settings,
  public.crm_webhook_events, public.crm_email_delivery_logs, public.crm_audit_logs
from anon;

insert into public.crm_email_settings (id, subject, message)
values
  ('lead-assigned', 'Novo lead atribuído no CRM: {lead}', E'Olá, {vendedor}!\n\nVocê recebeu um novo lead da lista {lista}.\n\nLead: {lead}\nE-mail: {email}\nTelefone: {telefone}\nEmpresa: {empresa}\n\nAcesse o Capta CRM para iniciar o atendimento.'),
  ('lead-confirmation', 'Recebemos seu contato, {lead}', E'Olá, {lead}!\n\nRecebemos seu cadastro na lista {lista}. Nossa equipe entrará em contato para dar continuidade ao seu atendimento.\n\nAtenciosamente,\nLuciana França')
on conflict (id) do nothing;
