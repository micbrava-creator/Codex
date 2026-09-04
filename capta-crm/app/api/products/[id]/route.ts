import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params; const body = await request.json() as Record<string, unknown>; const values: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) values.name = body.name.trim();
  if (typeof body.category === 'string') values.category = body.category;
  if (typeof body.description === 'string') values.description = body.description.trim().slice(0, 4000);
  if (body.priceCents !== undefined) values.price_cents = Math.max(0, Math.round(Number(body.priceCents) || 0));
  if (body.pipelineId !== undefined) values.pipeline_id = typeof body.pipelineId === 'string' ? body.pipelineId || null : null;
  if (typeof body.color === 'string') values.color = body.color;
  if (typeof body.active === 'boolean') values.active = body.active;
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_products').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar o produto' }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Produto com compras registradas não pode ser excluído; desative-o para preservar o histórico.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
