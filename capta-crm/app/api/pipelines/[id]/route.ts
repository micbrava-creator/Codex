import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { name?: string; color?: string; defaultValueCents?: number };
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name?.trim()) values.name = body.name.trim(); if (body.color) values.color = body.color;
  if (body.defaultValueCents !== undefined) values.default_value_cents = Math.max(0, Math.round(body.defaultValueCents));
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_pipelines').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível alterar' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'O funil está em uso ou não pode ser excluído' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
