-- Contatos existentes não ganham uma cadência sem decisão do vendedor.
-- O default continua true, portanto todo novo lead atribuído recebe follow-up automático.
update public.crm_contacts c
set follow_up_enabled = false
where c.follow_up_enabled
  and not exists (
    select 1 from public.crm_card_tasks t
    where t.contact_id = c.id and t.kind = 'follow_up'
  );
