import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin';
import { routeLeadForList } from '../../../../lib/supabase/crm';
import { notifySeller } from '../../../../lib/lead-email';
import { sendLeadConfirmation } from '../../../../lib/lead-confirmation-email';
import { createAutomaticFollowUp } from '../../../../lib/follow-up';

function value(body: Record<string, unknown>, names: string[]) {
  for (const name of names) { const found = body[name]; if (typeof found === 'string') return found.trim(); }
  return '';
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();
  const { data: list } = await admin.from('crm_contact_lists').select('*').eq('webhook_token', token).maybeSingle();
  if (!list) return NextResponse.json({ error: 'Webhook inválido' }, { status: 404 });

  const raw = await request.text();
  let body: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    body = contentType.includes('application/json')
      ? JSON.parse(raw)
      : Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }
  const name = value(body, ['name', 'nome', 'full_name', 'nome_completo']);
  const email = value(body, ['email', 'e-mail']).toLowerCase();
  const phone = value(body, ['phone', 'telefone', 'whatsapp', 'celular']);
  const company = value(body, ['company', 'empresa']);
  if (!(name || email || phone)) return NextResponse.json({ error: 'Envie ao menos nome, email ou telefone' }, { status: 400 });

  const suppliedKey = request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key');
  const payloadHash = createHash('sha256').update(raw).digest('hex');
  const idempotencyKey = suppliedKey?.slice(0, 200) || createHash('sha256').update(`${list.id}:${payloadHash}`).digest('hex');
  const eventId = crypto.randomUUID();
  const { error: eventError } = await admin.from('crm_webhook_events').insert({ id: eventId, list_id: list.id, idempotency_key: idempotencyKey, payload_hash: payloadHash, status: 'processing' });
  if (eventError?.code === '23505') {
    const { data: existing } = await admin.from('crm_webhook_events').select('contact_id,status').eq('list_id', list.id).eq('idempotency_key', idempotencyKey).maybeSingle();
    return NextResponse.json({ ok: true, duplicate: true, contactId: existing?.contact_id || null });
  }
  if (eventError) return NextResponse.json({ error: 'Não foi possível registrar o webhook' }, { status: 500 });

  try {
    const route = await routeLeadForList(list.id);
    const record = { id: crypto.randomUUID(), list_id: list.id, stage_id: route.stageId, assigned_user_id: route.seller?.id ?? null, negotiation_value_cents: route.negotiationValueCents, name, email, phone, company, notes: value(body, ['notes', 'observacoes', 'mensagem']), source: 'webhook' };
    const { error } = await admin.from('crm_contacts').insert(record);
    if (error) throw error;
    if (route.stageId && list.pipeline_id) await admin.from('crm_contact_stage_history').insert({ id: crypto.randomUUID(), contact_id: record.id, pipeline_id: list.pipeline_id, stage_id: route.stageId });
    await createAutomaticFollowUp({ contactId: record.id, sellerId: route.seller?.id, leadName: name });
    await admin.from('crm_webhook_events').update({ status: 'completed', contact_id: record.id, completed_at: new Date().toISOString() }).eq('id', eventId);
    const sends: Promise<unknown>[] = [];
    const lead = { name, email, phone, company };
    if (route.seller && list.email_alerts_enabled) sends.push(notifySeller({ contactId: record.id, seller: route.seller, lead, listName: list.name }));
    if (list.confirmation_email_enabled && email) sends.push(sendLeadConfirmation({ contactId: record.id, lead, listName: list.name }));
    await Promise.allSettled(sends);
    return NextResponse.json({ ok: true, contactId: record.id, assignedSellerId: route.seller?.id ?? null }, { status: 201 });
  } catch (error) {
    await admin.from('crm_webhook_events').update({ status: 'failed', error_code: error instanceof Error ? error.message.slice(0, 200) : 'unknown' }).eq('id', eventId);
    return NextResponse.json({ error: 'Falha ao processar o lead' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, X-Idempotency-Key' } });
}
