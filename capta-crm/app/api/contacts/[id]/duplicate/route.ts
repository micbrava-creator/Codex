import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../../lib/supabase/admin';
import { contactFromDb } from '../../../../../lib/supabase/crm';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { targetPipelineId?: string; targetStageId?: string };
  if (!body.targetPipelineId) return NextResponse.json({ error: 'Funil de destino obrigatório' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const [{ data: source }, { data: pipeline }] = await Promise.all([
    supabase.from('crm_contacts').select('*').eq('id', id).maybeSingle(),
    supabase.from('crm_pipelines').select('id,default_value_cents').eq('id', body.targetPipelineId).maybeSingle(),
  ]);
  if (!source) return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
  if (current.role === 'sales' && source.assigned_user_id !== current.id) {
    return NextResponse.json({ error: 'Sem permissão para duplicar este cartão' }, { status: 403 });
  }
  if (!pipeline) return NextResponse.json({ error: 'Funil de destino inválido' }, { status: 404 });

  let stageQuery = supabase.from('crm_pipeline_stages').select('id,pipeline_id').eq('pipeline_id', pipeline.id);
  stageQuery = body.targetStageId ? stageQuery.eq('id', body.targetStageId) : stageQuery.order('position').limit(1);
  const { data: stages } = await stageQuery;
  const stage = stages?.[0];
  if (!stage) return NextResponse.json({ error: 'O funil de destino não possui uma etapa válida' }, { status: 400 });

  const duplicate = {
    id: crypto.randomUUID(), list_id: source.list_id, stage_id: stage.id,
    assigned_user_id: source.assigned_user_id,
    negotiation_value_cents: pipeline.default_value_cents ?? source.negotiation_value_cents ?? 0,
    sale_completed: false, sale_completed_at: null,
    name: source.name, email: source.email, phone: source.phone, company: source.company,
    notes: source.notes, source: 'duplicate', follow_up_enabled: source.follow_up_enabled,
    follow_up_interval_days: source.follow_up_interval_days,
    follow_up_interval_minutes: source.follow_up_interval_minutes,
    next_follow_up_title: source.next_follow_up_title,
    next_follow_up_notes: source.next_follow_up_notes,
  };
  const { data, error } = await supabase.from('crm_contacts').insert(duplicate).select().single();
  if (error) return NextResponse.json({ error: 'Sem permissão para duplicar o cartão' }, { status: 403 });
  await supabase.from('crm_contact_stage_history').insert({ id: crypto.randomUUID(), contact_id: duplicate.id, pipeline_id: pipeline.id, stage_id: stage.id });
  return NextResponse.json(contactFromDb(data), { status: 201 });
}
