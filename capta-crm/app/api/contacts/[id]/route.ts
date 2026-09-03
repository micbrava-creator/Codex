import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';
import { notifySeller } from '../../../../lib/lead-email';
import { createAutomaticFollowUp } from '../../../../lib/follow-up';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser(); if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as Record<string, string | number | null>;
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from('crm_contacts').select('*').eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) values.name = typeof body.name === 'string' ? body.name.trim() : '';
  if (body.email !== undefined) values.email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (body.phone !== undefined) values.phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (body.company !== undefined) values.company = typeof body.company === 'string' ? body.company.trim() : '';
  if (body.notes !== undefined) values.notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (body.negotiationValueCents !== undefined) values.negotiation_value_cents = Math.max(0, Math.round(Number(body.negotiationValueCents) || 0));
  if (body.stageId !== undefined) values.stage_id = typeof body.stageId === 'string' ? body.stageId || null : null;
  if (body.assignedUserId !== undefined && current.role === 'manager') values.assigned_user_id = typeof body.assignedUserId === 'string' ? body.assignedUserId || null : null;
  const { error } = await supabase.from('crm_contacts').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão para alterar o contato' }, { status: 403 });
  const assigned = values.assigned_user_id as string | undefined;
  if (assigned && assigned !== before.assigned_user_id) {
    const [{ data: seller }, { data: list }] = await Promise.all([
      supabase.from('crm_profiles').select('id,name,email').eq('id', assigned).maybeSingle(),
      supabase.from('crm_contact_lists').select('name,email_alerts_enabled').eq('id', before.list_id).maybeSingle(),
    ]);
    if (seller && list?.email_alerts_enabled) await notifySeller({ contactId: id, seller, lead: { name: String(values.name ?? before.name), email: String(values.email ?? before.email), phone: String(values.phone ?? before.phone), company: String(values.company ?? before.company) }, listName: list.name }).catch(() => undefined);
    if (seller) await createAutomaticFollowUp({ contactId: id, sellerId: seller.id, leadName: String(values.name ?? before.name) });
  }
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_contacts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
