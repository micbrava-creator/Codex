import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contactLists, contacts } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';
import { routeLeadForList } from '../../../../db/assignment';
import { notifySeller } from '../../../../lib/lead-email';

type IncomingContact = { name?: string; email?: string; phone?: string; company?: string; notes?: string };

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { listId?: string; contacts?: IncomingContact[] };
  if (!body.listId || !Array.isArray(body.contacts)) return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
  if (body.contacts.length > 500) return NextResponse.json({ error: 'Importe no máximo 500 contatos por arquivo.' }, { status: 400 });

  const normalized = body.contacts.map((contact) => ({ name: contact.name?.trim() ?? '', email: contact.email?.trim().toLowerCase() ?? '', phone: contact.phone?.trim() ?? '', company: contact.company?.trim() ?? '', notes: contact.notes?.trim() ?? '' })).filter((contact) => contact.name || contact.email || contact.phone);
  const existing = await getDb().select({ email: contacts.email }).from(contacts).where(eq(contacts.listId, body.listId));
  const knownEmails = new Set(existing.map((contact) => contact.email).filter(Boolean));
  let duplicates = 0; const now = new Date(); const accepted = normalized.filter((contact) => { if (contact.email && knownEmails.has(contact.email)) { duplicates++; return false; } if (contact.email) knownEmails.add(contact.email); return true; }); const records = []; const notifications: { contactId: string; seller: { id: string; name: string; email: string }; lead: IncomingContact }[] = [];
  for (const contact of accepted) { const route = await routeLeadForList(body.listId); const record = { id: crypto.randomUUID(), listId: body.listId!, stageId: route.stageId, assignedUserId: route.seller?.id ?? null, ...contact, source: 'import', createdAt: now, updatedAt: now }; records.push(record); if (route.seller) notifications.push({ contactId: record.id, seller: route.seller, lead: contact }); }
  for (let index = 0; index < records.length; index += 50) await getDb().insert(contacts).values(records.slice(index, index + 50));
  const [list] = await getDb().select({ name: contactLists.name }).from(contactLists).where(eq(contactLists.id, body.listId)).limit(1); await Promise.allSettled(notifications.map((item) => notifySeller({ ...item, lead: { name: item.lead.name || '', email: item.lead.email || '', phone: item.lead.phone || '', company: item.lead.company || '' }, listName: list?.name || 'Contatos' })));
  return NextResponse.json({ created: records.length, duplicates, invalid: body.contacts.length - normalized.length });
}
