import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { taskFromDb } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { contactId?: string; title?: string; dueDate?: string; kind?: string; notes?: string; reminderEnabled?: boolean };
  if (!body.contactId || !body.title?.trim()) return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const dueDate = body.dueDate ? new Date(body.dueDate).toISOString() : null;
  const { data, error } = await supabase.from('crm_card_tasks').insert({ id: crypto.randomUUID(), contact_id: body.contactId, title: body.title.trim(), due_date: dueDate, kind: body.kind === 'follow_up' ? 'follow_up' : 'task', notes: body.notes?.trim() || '', reminder_enabled: body.kind === 'follow_up' && Boolean(body.reminderEnabled) }).select().single();
  if (error) return NextResponse.json({ error: 'Tarefa não autorizada ou inválida' }, { status: 403 });
  return NextResponse.json(taskFromDb(data), { status: 201 });
}
