import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { title?: string; dueDate?: string | null; completed?: boolean };
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title?.trim()) values.title = body.title.trim();
  if (body.dueDate !== undefined) values.due_date = body.dueDate ? new Date(`${body.dueDate}T12:00:00`).toISOString() : null;
  if (typeof body.completed === 'boolean') values.completed = body.completed;
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_card_tasks').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível alterar' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_card_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível excluir' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
