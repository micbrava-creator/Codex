import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { data: source } = await supabase.from('crm_products').select('*').eq('id', id).maybeSingle();
  if (!source) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  const { data, error } = await supabase.from('crm_products').insert({ id: crypto.randomUUID(), name: `${source.name} — Cópia`, category: source.category, description: source.description, price_cents: source.price_cents, pipeline_id: source.pipeline_id, color: source.color, active: source.active }).select().single();
  if (error) return NextResponse.json({ error: 'Não foi possível duplicar o produto' }, { status: 403 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
