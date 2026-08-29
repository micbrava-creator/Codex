import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { requireApiUser } from '../../../../chatgpt-auth';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { stageId?: string };
  if (!body.stageId) return NextResponse.json({ error: 'Etapa obrigatória' }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data: stage } = await supabase.from('crm_pipeline_stages').select('id,pipeline_id').eq('id', body.stageId).maybeSingle();
  if (!stage) return NextResponse.json({ error: 'Etapa inválida' }, { status: 404 });
  const { error } = await supabase.from('crm_contacts').update({ stage_id: stage.id, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão para mover o contato' }, { status: 403 });
  await supabase.from('crm_contact_stage_history').upsert({ id: crypto.randomUUID(), contact_id: id, pipeline_id: stage.pipeline_id, stage_id: stage.id, entered_at: new Date().toISOString() }, { onConflict: 'contact_id,stage_id' });
  return NextResponse.json({ ok: true });
}
