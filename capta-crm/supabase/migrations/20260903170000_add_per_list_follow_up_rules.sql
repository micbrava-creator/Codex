-- Padrões de follow-up por lista, sem alterar dados de contatos ou integrações existentes.
alter table public.crm_contact_lists
  add column if not exists follow_up_enabled boolean not null default true,
  add column if not exists first_follow_up_delay_minutes integer not null default 15
    check (first_follow_up_delay_minutes between 1 and 43200),
  add column if not exists follow_up_interval_minutes integer not null default 2880
    check (follow_up_interval_minutes between 1 and 525600),
  add column if not exists follow_up_title text not null default 'Entrar em contato com {{lead}}'
    check (char_length(btrim(follow_up_title)) between 1 and 240),
  add column if not exists follow_up_notes text not null default ''
    check (char_length(follow_up_notes) <= 2000),
  add column if not exists next_follow_up_title text not null default 'Retomar contato com {{lead}}'
    check (char_length(btrim(next_follow_up_title)) between 1 and 240),
  add column if not exists next_follow_up_notes text not null default ''
    check (char_length(next_follow_up_notes) <= 2000);

alter table public.crm_contacts
  add column if not exists follow_up_interval_minutes integer not null default 2880
    check (follow_up_interval_minutes between 1 and 525600),
  add column if not exists next_follow_up_title text not null default 'Retomar contato com {{lead}}',
  add column if not exists next_follow_up_notes text not null default '';

grant select, insert, update, delete on public.crm_contact_lists, public.crm_contacts to authenticated;
