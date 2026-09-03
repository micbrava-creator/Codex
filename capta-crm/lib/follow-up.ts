import { createSupabaseAdminClient } from './supabase/admin';

export const DEFAULT_FOLLOW_UP_DAYS = 2;

export function nextBusinessFollowUp(days = DEFAULT_FOLLOW_UP_DAYS, from = new Date()) {
  const date = new Date(from);
  let remaining = Math.max(1, Math.min(90, Math.round(days)));
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining--;
  }
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

export async function createAutomaticFollowUp(input: { contactId: string; sellerId?: string | null; leadName?: string }) {
  if (!input.sellerId) return;
  const admin = createSupabaseAdminClient();
  const { data: contact } = await admin.from('crm_contacts').select('follow_up_enabled,follow_up_interval_days').eq('id', input.contactId).maybeSingle();
  if (!contact?.follow_up_enabled) return;
  const { data: pending } = await admin.from('crm_card_tasks').select('id').eq('contact_id', input.contactId).eq('kind', 'follow_up').eq('completed', false).limit(1);
  if (pending?.length) return;
  await admin.from('crm_card_tasks').insert({
    id: crypto.randomUUID(), contact_id: input.contactId, kind: 'follow_up',
    title: `Entrar em contato com ${input.leadName?.trim() || 'o lead'}`,
    due_date: nextBusinessFollowUp(contact.follow_up_interval_days), reminder_enabled: true,
  });
}
