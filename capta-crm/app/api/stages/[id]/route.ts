import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { name?: string; color?: string; position?: number };
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name?.trim()) values.name = body.name.trim(); if (body.color) values.color = body.color; if (typeof body.position === 'number') values.position = body.position;
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_pipeline_stages').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível alterar' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_pipeline_stages').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'A etapa possui contatos ou está em uso' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
