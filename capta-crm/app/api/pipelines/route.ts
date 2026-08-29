import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { contactFromDb, pipelineFromDb, stageFromDb, taskFromDb } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [pipelinesResult, stagesResult, listsResult, contactsResult, tasksResult, profilesResult, historyResult] = await Promise.all([
    supabase.from('crm_pipelines').select('*').order('created_at', { ascending: false }),
    supabase.from('crm_pipeline_stages').select('*').order('position'),
    supabase.from('crm_contact_lists').select('id,name,pipeline_id'),
    supabase.from('crm_contacts').select('*').order('updated_at', { ascending: false }),
    supabase.from('crm_card_tasks').select('*').order('due_date'),
    supabase.from('crm_profiles').select('id,name,email'),
    supabase.from('crm_contact_stage_history').select('contact_id,stage_id'),
  ]);
  if (pipelinesResult.error) return NextResponse.json({ error: 'Não foi possível carregar os funis' }, { status: 500 });
  const stages = stagesResult.data || []; const contacts = contactsResult.data || []; const tasks = tasksResult.data || []; const profiles = profilesResult.data || []; const history = historyResult.data || [];
  return NextResponse.json((pipelinesResult.data || []).map((pipeline) => ({
    ...pipelineFromDb(pipeline),
    lists: (listsResult.data || []).filter((list) => list.pipeline_id === pipeline.id).map((list) => ({ id: list.id, name: list.name, pipelineId: list.pipeline_id })),
    stages: stages.filter((stage) => stage.pipeline_id === pipeline.id).map((stage) => ({
      ...stageFromDb(stage),
      passedCount: new Set(history.filter((entry) => entry.stage_id === stage.id).map((entry) => entry.contact_id)).size,
      cards: contacts.filter((contact) => contact.stage_id === stage.id).map((contact) => ({
        ...contactFromDb(contact),
        assignedSeller: profiles.find((profile) => profile.id === contact.assigned_user_id) || null,
        tasks: tasks.filter((task) => task.contact_id === contact.id).map(taskFromDb),
      })),
    })),
  })));
}

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { name?: string; color?: string; defaultValueCents?: number }; const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const id = crypto.randomUUID();
  const { data, error } = await supabase.from('crm_pipelines').insert({ id, name, color: body.color || '#5B5BD6', default_value_cents: Math.max(0, Math.round(body.defaultValueCents || 0)) }).select().single();
  if (error) return NextResponse.json({ error: 'Sem permissão para criar o funil' }, { status: 403 });
  const names = ['Novo lead', 'Em contato', 'Proposta']; const colors = ['#E8E7FF', '#FFF1D6', '#E4F4EC'];
  await supabase.from('crm_pipeline_stages').insert(names.map((stageName, position) => ({ id: crypto.randomUUID(), pipeline_id: id, name: stageName, position, color: colors[position] })));
  return NextResponse.json(pipelineFromDb(data), { status: 201 });
}
