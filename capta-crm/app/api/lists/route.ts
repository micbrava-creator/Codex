import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { listFromDb } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [{ data: lists, error }, { data: contacts }, { data: rotation }] = await Promise.all([
    supabase.from('crm_contact_lists').select('*').order('created_at', { ascending: false }),
    supabase.from('crm_contacts').select('id,list_id'),
    supabase.from('crm_list_rotation_members').select('*').order('position'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar as listas' }, { status: 500 });
  return NextResponse.json((lists || []).map((row) => ({
    ...listFromDb(row),
    contactCount: (contacts || []).filter((contact) => contact.list_id === row.id).length,
    rotationMemberIds: (rotation || []).filter((item) => item.list_id === row.id).map((item) => item.member_id),
  })));
}

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { name?: string; segment?: string; color?: string; pipelineId?: string; routingStageId?: string; followUpEnabled?: boolean; firstFollowUpDelayMinutes?: number; followUpIntervalMinutes?: number; followUpTitle?: string; followUpNotes?: string; nextFollowUpTitle?: string; nextFollowUpNotes?: string };
  const name = body.name?.trim(); if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const record = { id: crypto.randomUUID(), name, segment: body.segment?.trim() || '', color: body.color || '#5B5BD6', webhook_token: crypto.randomUUID().replaceAll('-', ''), pipeline_id: body.pipelineId || null, routing_stage_id: body.routingStageId || null, follow_up_enabled: body.followUpEnabled !== false, first_follow_up_delay_minutes: Math.max(1, Math.min(43200, Math.round(Number(body.firstFollowUpDelayMinutes) || 15))), follow_up_interval_minutes: Math.max(1, Math.min(525600, Math.round(Number(body.followUpIntervalMinutes) || 2880))), follow_up_title: body.followUpTitle?.trim().slice(0, 240) || 'Entrar em contato com {{lead}}', follow_up_notes: body.followUpNotes?.trim().slice(0, 2000) || '', next_follow_up_title: body.nextFollowUpTitle?.trim().slice(0, 240) || 'Retomar contato com {{lead}}', next_follow_up_notes: body.nextFollowUpNotes?.trim().slice(0, 2000) || '' };
  const { data, error } = await supabase.from('crm_contact_lists').insert(record).select().single();
  if (error) return NextResponse.json({ error: 'Sem permissão para criar a lista' }, { status: 403 });
  return NextResponse.json({ ...listFromDb(data), contactCount: 0, rotationMemberIds: [] }, { status: 201 });
}
