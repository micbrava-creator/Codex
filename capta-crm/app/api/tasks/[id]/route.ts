import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';
import { nextFollowUpMinutes } from '../../../../lib/follow-up';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { title?: string; dueDate?: string | null; completed?: boolean; notes?: string; reminderEnabled?: boolean };
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title?.trim()) values.title = body.title.trim();
  if (body.dueDate !== undefined) { values.due_date = body.dueDate ? new Date(body.dueDate).toISOString() : null; values.reminder_sent_at = null; }
  if (typeof body.completed === 'boolean') values.completed = body.completed;
  if (typeof body.notes === 'string') values.notes = body.notes.trim();
  if (typeof body.reminderEnabled === 'boolean') { values.reminder_enabled = body.reminderEnabled; if (body.reminderEnabled) values.reminder_sent_at = null; }
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from('crm_card_tasks').select('contact_id,kind,completed').eq('id', id).maybeSingle();
  const { error } = await supabase.from('crm_card_tasks').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível alterar' }, { status: 403 });
  if (body.completed === true && before?.kind === 'follow_up' && !before.completed) {
    const { data: contact } = await supabase.from('crm_contacts').select('name,follow_up_enabled,follow_up_interval_minutes,next_follow_up_title,next_follow_up_notes').eq('id', before.contact_id).maybeSingle();
    if (contact?.follow_up_enabled) await supabase.from('crm_card_tasks').insert({ id: crypto.randomUUID(), contact_id: before.contact_id, kind: 'follow_up', title: (contact.next_follow_up_title || 'Retomar contato com {{lead}}').replaceAll('{{lead}}', contact.name || 'o lead'), notes: contact.next_follow_up_notes || '', due_date: nextFollowUpMinutes(contact.follow_up_interval_minutes || 2880), reminder_enabled: true });
  }
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_card_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível excluir' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
