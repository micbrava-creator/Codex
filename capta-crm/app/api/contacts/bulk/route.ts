import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contacts } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';
import { routingStageForList } from '../../../../db/queries';

type IncomingContact = { name?: string; email?: string; phone?: string; company?: string; notes?: string };

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { listId?: string; contacts?: IncomingContact[] };
  if (!body.listId || !Array.isArray(body.contacts)) return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
  if (body.contacts.length > 500) return NextResponse.json({ error: 'Importe no máximo 500 contatos por arquivo.' }, { status: 400 });

  const normalized = body.contacts.map((contact) => ({ name: contact.name?.trim() ?? '', email: contact.email?.trim().toLowerCase() ?? '', phone: contact.phone?.trim() ?? '', company: contact.company?.trim() ?? '', notes: contact.notes?.trim() ?? '' })).filter((contact) => contact.name || contact.email || contact.phone);
  const existing = await getDb().select({ email: contacts.email }).from(contacts).where(eq(contacts.listId, body.listId));
  const knownEmails = new Set(existing.map((contact) => contact.email).filter(Boolean));
  let duplicates = 0; const now = new Date(); const stageId = await routingStageForList(body.listId);
  const records = normalized.filter((contact) => { if (contact.email && knownEmails.has(contact.email)) { duplicates++; return false; } if (contact.email) knownEmails.add(contact.email); return true; }).map((contact) => ({ id: crypto.randomUUID(), listId: body.listId!, stageId, ...contact, source: 'import', createdAt: now, updatedAt: now }));
  for (let index = 0; index < records.length; index += 50) await getDb().insert(contacts).values(records.slice(index, index + 50));
  return NextResponse.json({ created: records.length, duplicates, invalid: body.contacts.length - normalized.length });
}
