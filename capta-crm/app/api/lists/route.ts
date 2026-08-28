import { NextResponse } from 'next/server';
import { getDb } from '../../../db';
import { contactLists, listRotationMembers } from '../../../db/schema';
import { listContactLists } from '../../../db/queries';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const [lists, rotation] = await Promise.all([listContactLists(), getDb().select().from(listRotationMembers)]); return NextResponse.json(lists.map((list) => ({ ...list, rotationMemberIds: rotation.filter((item) => item.listId === list.id).sort((a, b) => a.position - b.position).map((item) => item.memberId) }))); }
export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { name?: string; segment?: string; color?: string };
  const name = body.name?.trim(); if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const record = { id: crypto.randomUUID(), name, segment: body.segment?.trim() ?? '', color: body.color ?? '#5B5BD6', webhookToken: crypto.randomUUID().replaceAll('-', ''), createdAt: new Date() };
  await getDb().insert(contactLists).values(record); return NextResponse.json({ ...record, contactCount: 0 }, { status: 201 });
}
