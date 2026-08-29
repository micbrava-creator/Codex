import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { routeLeadForList } from '../../../../lib/supabase/crm';
import { requireApiUser } from '../../../chatgpt-auth';
import { notifySeller } from '../../../../lib/lead-email';
import { sendLeadConfirmation } from '../../../../lib/lead-confirmation-email';
type IncomingContact = { name?: string; email?: string; phone?: string; company?: string; notes?: string };

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { listId?: string; contacts?: IncomingContact[] };
  if (!body.listId || !Array.isArray(body.contacts)) return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
  if (body.contacts.length > 500) return NextResponse.json({ error: 'Importe no máximo 500 contatos por arquivo.' }, { status: 400 });
  const normalized = body.contacts.map((contact) => ({ name: contact.name?.trim() || '', email: contact.email?.trim().toLowerCase() || '', phone: contact.phone?.trim() || '', company: contact.company?.trim() || '', notes: contact.notes?.trim() || '' })).filter((contact) => contact.name || contact.email || contact.phone);
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('crm_contacts').select('email').eq('list_id', body.listId);
  const known = new Set((existing || []).map((item) => item.email).filter(Boolean)); let duplicates = 0;
  const accepted = normalized.filter((contact) => { if (contact.email && known.has(contact.email)) { duplicates++; return false; } if (contact.email) known.add(contact.email); return true; });
  const records: Record<string, unknown>[] = []; const notifications: { contactId: string; seller: { id: string; name: string; email: string }; lead: IncomingContact }[] = [];
  for (const contact of accepted) {
    const route = await routeLeadForList(body.listId); const id = crypto.randomUUID();
    records.push({ id, list_id: body.listId, stage_id: route.stageId, assigned_user_id: route.seller?.id ?? null, negotiation_value_cents: route.negotiationValueCents, ...contact, source: 'import' });
    if (route.seller) notifications.push({ contactId: id, seller: route.seller, lead: contact });
  }
  for (let i = 0; i < records.length; i += 50) { const { error } = await supabase.from('crm_contacts').insert(records.slice(i, i + 50)); if (error) return NextResponse.json({ error: 'Falha ao importar contatos' }, { status: 403 }); }
  const { data: list } = await supabase.from('crm_contact_lists').select('name,pipeline_id,email_alerts_enabled,confirmation_email_enabled').eq('id', body.listId).maybeSingle();
  if (list?.pipeline_id) {
    const history = records.filter((record) => record.stage_id).map((record) => ({ id: crypto.randomUUID(), contact_id: record.id, pipeline_id: list.pipeline_id, stage_id: record.stage_id }));
    if (history.length) await supabase.from('crm_contact_stage_history').insert(history);
  }
  const sends: Promise<unknown>[] = [];
  if (list?.email_alerts_enabled) sends.push(...notifications.map((item) => notifySeller({ contactId: item.contactId, seller: item.seller, lead: { name: item.lead.name || '', email: item.lead.email || '', phone: item.lead.phone || '', company: item.lead.company || '' }, listName: list.name })));
  if (list?.confirmation_email_enabled) sends.push(...records.filter((record) => record.email).map((record) => sendLeadConfirmation({ contactId: String(record.id), lead: { name: String(record.name || ''), email: String(record.email || ''), phone: String(record.phone || ''), company: String(record.company || '') }, listName: list.name })));
  await Promise.allSettled(sends);
  return NextResponse.json({ created: records.length, duplicates, invalid: body.contacts.length - normalized.length });
}
