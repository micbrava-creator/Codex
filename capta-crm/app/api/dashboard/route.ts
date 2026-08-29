import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { contactFromDb, pipelineFromDb, taskFromDb } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [contactsResult, listsResult, stagesResult, pipelinesResult, profilesResult, tasksResult] = await Promise.all([
    supabase.from('crm_contacts').select('*'), supabase.from('crm_contact_lists').select('id,pipeline_id'),
    supabase.from('crm_pipeline_stages').select('id,pipeline_id'), supabase.from('crm_pipelines').select('*'),
    supabase.from('crm_profiles').select('id,name'), supabase.from('crm_card_tasks').select('*'),
  ]);
  if (contactsResult.error) return NextResponse.json({ error: 'Não foi possível carregar o dashboard' }, { status: 500 });
  const pipelines = (pipelinesResult.data || []).map(pipelineFromDb);
  return NextResponse.json({ pipelines, contacts: (contactsResult.data || []).map((row) => {
    const contact = contactFromDb(row); const list = (listsResult.data || []).find((item) => item.id === row.list_id); const stage = (stagesResult.data || []).find((item) => item.id === row.stage_id); const pipelineId = stage?.pipeline_id || list?.pipeline_id || null;
    return { ...contact, pipelineId, pipelineName: pipelines.find((pipeline) => pipeline.id === pipelineId)?.name || 'Sem funil', assignedSeller: (profilesResult.data || []).find((profile) => profile.id === row.assigned_user_id) || null, tasks: (tasksResult.data || []).filter((task) => task.contact_id === row.id).map(taskFromDb) };
  }) });
}
