import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { taskFromDb } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  const user = await requireApiUser(); if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [{ data: tasks, error }, { data: contacts }, { data: profiles }, { data: stages }, { data: pipelines }] = await Promise.all([
    supabase.from('crm_card_tasks').select('*').eq('kind', 'follow_up').order('due_date'),
    supabase.from('crm_contacts').select('id,name,email,phone,company,stage_id,assigned_user_id,follow_up_enabled,follow_up_interval_days'),
    supabase.from('crm_profiles').select('id,name,email,role').eq('active', true),
    supabase.from('crm_pipeline_stages').select('id,name,pipeline_id'),
    supabase.from('crm_pipelines').select('id,name'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar a agenda' }, { status: 500 });
  return NextResponse.json({ currentUser: user, sellers: (profiles || []).filter((item) => item.role === 'sales'), items: (tasks || []).map((row) => {
    const contact = (contacts || []).find((item) => item.id === row.contact_id); const stage = (stages || []).find((item) => item.id === contact?.stage_id);
    return { ...taskFromDb(row), contact: contact ? { id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, company: contact.company, followUpEnabled: contact.follow_up_enabled, followUpIntervalDays: contact.follow_up_interval_days } : null, seller: (profiles || []).find((item) => item.id === contact?.assigned_user_id) || null, stage: stage ? { name: stage.name, pipelineName: (pipelines || []).find((item) => item.id === stage.pipeline_id)?.name || '' } : null };
  }).filter((item) => item.contact) });
}
