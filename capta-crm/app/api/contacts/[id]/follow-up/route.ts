import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { nextFollowUpMinutes } from '../../../../../lib/follow-up';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { enabled?: boolean; intervalDays?: number; intervalMinutes?: number; nextAt?: string; title?: string; notes?: string; reminderEnabled?: boolean };
  const enabled = Boolean(body.enabled); const intervalMinutes = Math.max(1, Math.min(525600, Math.round(body.intervalMinutes || (body.intervalDays || 2) * 1440)));
  const supabase = await createSupabaseServerClient();
  const { data: contact, error } = await supabase.from('crm_contacts').update({ follow_up_enabled: enabled, follow_up_interval_minutes: intervalMinutes, follow_up_interval_days: Math.max(1, Math.round(intervalMinutes / 1440)) }).eq('id', id).select('id,name,assigned_user_id').single();
  if (error || !contact) return NextResponse.json({ error: 'Follow-up não autorizado ou inválido' }, { status: 403 });
  if (!enabled) return NextResponse.json({ ok: true });
  const { data: pending } = await supabase.from('crm_card_tasks').select('id').eq('contact_id', id).eq('kind', 'follow_up').eq('completed', false).order('due_date').limit(1);
  const values = { title: body.title?.trim() || `Entrar em contato com ${contact.name || 'o lead'}`, notes: body.notes?.trim() || '', due_date: body.nextAt ? new Date(body.nextAt).toISOString() : nextFollowUpMinutes(intervalMinutes), reminder_enabled: body.reminderEnabled !== false, reminder_sent_at: null };
  if (pending?.[0]) await supabase.from('crm_card_tasks').update(values).eq('id', pending[0].id);
  else await supabase.from('crm_card_tasks').insert({ id: crypto.randomUUID(), contact_id: id, kind: 'follow_up', completed: false, ...values });
  return NextResponse.json({ ok: true });
}
