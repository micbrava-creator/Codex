import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { stageFromDb } from '../../../../../lib/supabase/crm';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { name?: string; color?: string }; const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase.from('crm_pipeline_stages').select('position').eq('pipeline_id', id).order('position', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('crm_pipeline_stages').insert({ id: crypto.randomUUID(), pipeline_id: id, name, position: (last?.position ?? -1) + 1, color: body.color || '#ECEBE7' }).select().single();
  if (error) return NextResponse.json({ error: 'Não foi possível criar a etapa' }, { status: 403 });
  return NextResponse.json(stageFromDb(data), { status: 201 });
}
