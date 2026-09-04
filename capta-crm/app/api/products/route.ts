import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { requireApiUser } from '../../chatgpt-auth';

const categories = new Set(['training', 'certification', 'formation', 'course', 'mentoring', 'other']);
function product(row: Record<string, any>, pipelineName = '') {
  return { id: row.id, name: row.name, category: row.category, description: row.description, priceCents: row.price_cents, pipelineId: row.pipeline_id, pipelineName, color: row.color, active: row.active, createdAt: row.created_at };
}

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: pipelines }] = await Promise.all([
    supabase.from('crm_products').select('*').order('active', { ascending: false }).order('name'),
    supabase.from('crm_pipelines').select('id,name'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os produtos' }, { status: 500 });
  return NextResponse.json((data || []).map((row) => product(row, pipelines?.find((item) => item.id === row.pipeline_id)?.name)));
}

export async function POST(request: Request) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' && categories.has(body.category) ? body.category : 'course';
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('crm_products').insert({ id: crypto.randomUUID(), name, category, description: typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : '', price_cents: Math.max(0, Math.round(Number(body.priceCents) || 0)), pipeline_id: typeof body.pipelineId === 'string' ? body.pipelineId || null : null, color: typeof body.color === 'string' ? body.color : '#5B5BD6', active: body.active !== false }).select().single();
  if (error) return NextResponse.json({ error: 'Produto inválido ou sem permissão' }, { status: 403 });
  return NextResponse.json(product(data), { status: 201 });
}
