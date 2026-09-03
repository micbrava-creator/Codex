import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin';
import { sendFollowUpAlert } from '../../../../lib/follow-up-email';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const admin = createSupabaseAdminClient(); const now = new Date().toISOString();
  const { data: tasks, error } = await admin.from('crm_card_tasks').select('id,contact_id,title,notes,due_date').eq('kind', 'follow_up').eq('completed', false).eq('reminder_enabled', true).is('reminder_sent_at', null).lte('due_date', now).limit(100);
  if (error) return NextResponse.json({ error: 'Falha ao consultar follow-ups' }, { status: 500 });
  let sent = 0;
  for (const task of tasks || []) {
    const { data: contact } = await admin.from('crm_contacts').select('id,name,email,phone,assigned_user_id,follow_up_enabled').eq('id', task.contact_id).maybeSingle();
    if (!contact?.follow_up_enabled || !contact.assigned_user_id) continue;
    const { data: seller } = await admin.from('crm_profiles').select('name,email,active').eq('id', contact.assigned_user_id).maybeSingle();
    if (!seller?.active || !seller.email) continue;
    if (await sendFollowUpAlert({ taskId: task.id, contactId: contact.id, seller, lead: contact, title: task.title, notes: task.notes, dueDate: task.due_date })) {
      await admin.from('crm_card_tasks').update({ reminder_sent_at: now }).eq('id', task.id).is('reminder_sent_at', null); sent++;
    }
  }
  return NextResponse.json({ ok: true, checked: tasks?.length || 0, sent });
}
