import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contacts } from '../../../../db/schema';
import { findListByWebhook } from '../../../../db/queries';
import { routeLeadForList } from '../../../../db/assignment';
import { notifySeller } from '../../../../lib/lead-email';

function value(body: Record<string, unknown>, names: string[]) { for (const name of names) { const found = body[name]; if (typeof found === 'string') return found.trim(); } return ''; }
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const [list] = await findListByWebhook(token); if (!list) return NextResponse.json({ error: 'Webhook inválido' }, { status: 404 });
  let body: Record<string, unknown>; const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) body = await request.json() as Record<string, unknown>; else body = Object.fromEntries(await request.formData());
  const name = value(body, ['name', 'nome', 'full_name', 'nome_completo']); const email = value(body, ['email', 'e-mail']).toLowerCase(); const phone = value(body, ['phone', 'telefone', 'whatsapp', 'celular']); const company = value(body, ['company', 'empresa']);
  if (!(name || email || phone)) return NextResponse.json({ error: 'Envie ao menos nome, email ou telefone' }, { status: 400 });
  if (email) { const [existing] = await getDb().select({ id: contacts.id }).from(contacts).where(and(eq(contacts.listId, list.id), eq(contacts.email, email))).limit(1); if (existing) return NextResponse.json({ ok: true, duplicate: true, contactId: existing.id }); }
  const route = await routeLeadForList(list.id); const now = new Date(); const record = { id: crypto.randomUUID(), listId: list.id, stageId: route.stageId, assignedUserId: route.seller?.id ?? null, name, email, phone, company, notes: value(body, ['notes', 'observacoes', 'mensagem']), source: 'webhook', createdAt: now, updatedAt: now }; await getDb().insert(contacts).values(record); if (route.seller) await notifySeller({ contactId: record.id, seller: route.seller, lead: record, listName: list.name }).catch(() => undefined); return NextResponse.json({ ok: true, contactId: record.id, assignedSellerId: route.seller?.id ?? null }, { status: 201 });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } }); }
