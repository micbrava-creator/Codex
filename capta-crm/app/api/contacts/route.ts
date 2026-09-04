import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { contactFromDb, routeLeadForList } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';
import { notifySeller } from '../../../lib/lead-email';
import { sendLeadConfirmation } from '../../../lib/lead-confirmation-email';
import { createAutomaticFollowUp } from '../../../lib/follow-up';

export async function GET(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const listId = new URL(request.url).searchParams.get('listId'); if (!listId) return NextResponse.json([]);
  const supabase = await createSupabaseServerClient();
  const [{ data: contacts, error }, { data: profiles }] = await Promise.all([
    supabase.from('crm_contacts').select('*').eq('list_id', listId).order('created_at', { ascending: false }),
    supabase.from('crm_profiles').select('id,name,email'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os contatos' }, { status: 500 });
  return NextResponse.json((contacts || []).map((row) => ({ ...contactFromDb(row), assignedSeller: (profiles || []).find((profile) => profile.id === row.assigned_user_id) || null })));
}

export async function POST(request: Request) {
  const current = await requireApiUser(); if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as Record<string, string>;
  if (!body.listId || !(body.name?.trim() || body.email?.trim() || body.phone?.trim())) return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 });
  const route = await routeLeadForList(body.listId); let seller = route.seller;
  const supabase = await createSupabaseServerClient();
  if (body.assignedUserId && current.role === 'manager') {
    const { data } = await supabase.from('crm_profiles').select('id,name,email').eq('id', body.assignedUserId).eq('active', true).maybeSingle();
    if (data) seller = data;
  }
  let productId = body.productId || null;
  if (!productId && route.stageId) {
    const { data: stage } = await supabase.from('crm_pipeline_stages').select('pipeline_id').eq('id', route.stageId).maybeSingle();
    if (stage?.pipeline_id) {
      const { data: products } = await supabase.from('crm_products').select('id').eq('pipeline_id', stage.pipeline_id).eq('active', true).order('created_at').limit(1);
      productId = products?.[0]?.id ?? null;
    }
  }
  const record = { id: crypto.randomUUID(), list_id: body.listId, stage_id: route.stageId, product_id: productId, assigned_user_id: seller?.id ?? null, negotiation_value_cents: route.negotiationValueCents, name: body.name?.trim() || '', email: body.email?.trim().toLowerCase() || '', phone: body.phone?.trim() || '', company: body.company?.trim() || '', notes: body.notes?.trim() || '', source: 'manual' };
  const { data, error } = await supabase.from('crm_contacts').insert(record).select().single();
  if (error) return NextResponse.json({ error: 'Sem permissão ou contato inválido' }, { status: 403 });
  const { data: list } = await supabase.from('crm_contact_lists').select('name,pipeline_id,email_alerts_enabled,confirmation_email_enabled').eq('id', body.listId).maybeSingle();
  if (route.stageId && list?.pipeline_id) await supabase.from('crm_contact_stage_history').insert({ id: crypto.randomUUID(), contact_id: record.id, pipeline_id: list.pipeline_id, stage_id: route.stageId });
  await createAutomaticFollowUp({ contactId: record.id, sellerId: seller?.id, leadName: record.name });
  const lead = { name: record.name, email: record.email, phone: record.phone, company: record.company }; const sends: Promise<unknown>[] = [];
  if (seller && list?.email_alerts_enabled) sends.push(notifySeller({ contactId: record.id, seller, lead, listName: list.name }));
  if (list?.confirmation_email_enabled && record.email) sends.push(sendLeadConfirmation({ contactId: record.id, lead, listName: list.name }));
  await Promise.allSettled(sends);
  return NextResponse.json(contactFromDb(data), { status: 201 });
}
