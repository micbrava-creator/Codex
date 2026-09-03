-- Follow-up comercial: alteração exclusivamente aditiva e compatível com tarefas existentes.
alter table public.crm_contacts
  add column if not exists follow_up_enabled boolean not null default true,
  add column if not exists follow_up_interval_days integer not null default 2
    check (follow_up_interval_days between 1 and 90);

alter table public.crm_card_tasks
  add column if not exists kind text not null default 'task'
    check (kind in ('task', 'follow_up')),
  add column if not exists notes text not null default '',
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_sent_at timestamptz;

alter table public.crm_email_delivery_logs drop constraint if exists crm_email_delivery_logs_kind_check;
alter table public.crm_email_delivery_logs add constraint crm_email_delivery_logs_kind_check
  check (kind in ('seller_alert', 'lead_confirmation', 'follow_up_alert', 'auth'));

create index if not exists crm_follow_up_due_pending_idx
  on public.crm_card_tasks (due_date)
  where kind = 'follow_up' and reminder_enabled and not completed and reminder_sent_at is null;

-- Novas colunas permanecem protegidas pelas políticas RLS já vigentes das duas tabelas.
-- Grants explícitos mantêm compatibilidade com a futura mudança de exposição do Data API.
grant select, insert, update, delete on public.crm_card_tasks to authenticated;
grant select, insert, update, delete on public.crm_contacts to authenticated;
