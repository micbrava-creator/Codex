import { createSupabaseAdminClient } from './supabase/admin';

export const DEFAULT_FOLLOW_UP_DAYS = 2;

export function nextFollowUpMinutes(minutes: number, from = new Date()) {
  return new Date(from.getTime() + Math.max(1, Math.min(525600, Math.round(minutes))) * 60000).toISOString();
}

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
  const { data: contact } = await admin.from('crm_contacts').select('follow_up_enabled,follow_up_interval_days,follow_up_interval_minutes,list_id').eq('id', input.contactId).maybeSingle();
  if (!contact) return;
  const { data: list } = await admin.from('crm_contact_lists').select('follow_up_enabled,first_follow_up_delay_minutes,follow_up_interval_minutes,follow_up_title,follow_up_notes,next_follow_up_title,next_follow_up_notes').eq('id', contact.list_id).maybeSingle();
  const enabled = list?.follow_up_enabled ?? contact.follow_up_enabled;
  const intervalMinutes = list?.follow_up_interval_minutes ?? contact.follow_up_interval_minutes ?? contact.follow_up_interval_days * 1440;
  await admin.from('crm_contacts').update({ follow_up_enabled: enabled, follow_up_interval_minutes: intervalMinutes, follow_up_interval_days: Math.max(1, Math.round(intervalMinutes / 1440)), next_follow_up_title: list?.next_follow_up_title || 'Retomar contato com {{lead}}', next_follow_up_notes: list?.next_follow_up_notes || '' }).eq('id', input.contactId);
  if (!enabled) return;
  const { data: pending } = await admin.from('crm_card_tasks').select('id').eq('contact_id', input.contactId).eq('kind', 'follow_up').eq('completed', false).limit(1);
  if (pending?.length) return;
  await admin.from('crm_card_tasks').insert({
    id: crypto.randomUUID(), contact_id: input.contactId, kind: 'follow_up',
    title: (list?.follow_up_title || 'Entrar em contato com {{lead}}').replaceAll('{{lead}}', input.leadName?.trim() || 'o lead'),
    notes: list?.follow_up_notes || '',
    due_date: nextFollowUpMinutes(list?.first_follow_up_delay_minutes ?? 15), reminder_enabled: true,
  });
}
