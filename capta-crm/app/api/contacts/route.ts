import { NextResponse } from 'next/server';
import { getDb } from '../../../db';
import { contacts } from '../../../db/schema';
import { listContacts } from '../../../db/queries';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET(request: Request) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const listId = new URL(request.url).searchParams.get('listId'); if (!listId) return NextResponse.json([]); return NextResponse.json(await listContacts(listId)); }
export async function POST(request: Request) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const body = await request.json() as Record<string, string>; if (!body.listId || !(body.name?.trim() || body.email?.trim() || body.phone?.trim())) return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 }); const now = new Date(); const record = { id: crypto.randomUUID(), listId: body.listId, name: body.name?.trim() ?? '', email: body.email?.trim().toLowerCase() ?? '', phone: body.phone?.trim() ?? '', company: body.company?.trim() ?? '', notes: body.notes?.trim() ?? '', source: 'manual', createdAt: now, updatedAt: now }; await getDb().insert(contacts).values(record); return NextResponse.json(record, { status: 201 }); }
