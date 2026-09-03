import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { name?: string; segment?: string; color?: string; pipelineId?: string | null; routingStageId?: string | null; assignmentMode?: 'manual' | 'fixed' | 'round_robin'; fixedSellerId?: string | null; emailAlertsEnabled?: boolean; confirmationEmailEnabled?: boolean; rotationMemberIds?: string[]; followUpEnabled?: boolean; firstFollowUpDelayMinutes?: number; followUpIntervalMinutes?: number; followUpTitle?: string; followUpNotes?: string; nextFollowUpTitle?: string; nextFollowUpNotes?: string };
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name?.trim()) values.name = body.name.trim(); if (body.segment !== undefined) values.segment = body.segment.trim(); if (body.color?.trim()) values.color = body.color.trim();
  if (body.pipelineId !== undefined) { values.pipeline_id = body.pipelineId || null; if (!body.pipelineId) values.routing_stage_id = null; }
  if (body.routingStageId !== undefined) values.routing_stage_id = body.routingStageId || null;
  if (body.assignmentMode) values.assignment_mode = body.assignmentMode; if (body.fixedSellerId !== undefined) values.fixed_seller_id = body.fixedSellerId || null;
  if (body.emailAlertsEnabled !== undefined) values.email_alerts_enabled = Boolean(body.emailAlertsEnabled);
  if (body.confirmationEmailEnabled !== undefined) values.confirmation_email_enabled = Boolean(body.confirmationEmailEnabled);
  if (body.followUpEnabled !== undefined) values.follow_up_enabled = Boolean(body.followUpEnabled);
  if (body.firstFollowUpDelayMinutes !== undefined) values.first_follow_up_delay_minutes = Math.max(1, Math.min(43200, Math.round(Number(body.firstFollowUpDelayMinutes) || 15)));
  if (body.followUpIntervalMinutes !== undefined) values.follow_up_interval_minutes = Math.max(1, Math.min(525600, Math.round(Number(body.followUpIntervalMinutes) || 2880)));
  if (body.followUpTitle?.trim()) values.follow_up_title = body.followUpTitle.trim().slice(0, 240);
  if (body.followUpNotes !== undefined) values.follow_up_notes = body.followUpNotes.trim().slice(0, 2000);
  if (body.nextFollowUpTitle?.trim()) values.next_follow_up_title = body.nextFollowUpTitle.trim().slice(0, 240);
  if (body.nextFollowUpNotes !== undefined) values.next_follow_up_notes = body.nextFollowUpNotes.trim().slice(0, 2000);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('crm_contact_lists').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão ou configuração inválida' }, { status: 403 });
  if (body.rotationMemberIds) {
    const { error: deleteError } = await supabase.from('crm_list_rotation_members').delete().eq('list_id', id);
    if (deleteError) return NextResponse.json({ error: 'Não foi possível alterar a distribuição' }, { status: 403 });
    if (body.rotationMemberIds.length) {
      const { error: insertError } = await supabase.from('crm_list_rotation_members').insert(body.rotationMemberIds.map((memberId, position) => ({ list_id: id, member_id: memberId, position })));
      if (insertError) return NextResponse.json({ error: 'Um dos vendedores selecionados é inválido' }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_contact_lists').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'A lista possui contatos ou está em uso' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
