import { NextResponse } from 'next/server';
import { getDb } from '../../../db';
import { contactLists } from '../../../db/schema';
import { listContactLists } from '../../../db/queries';

export async function GET() { return NextResponse.json(await listContactLists()); }
export async function POST(request: Request) {
  const body = await request.json() as { name?: string; segment?: string; color?: string };
  const name = body.name?.trim(); if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const record = { id: crypto.randomUUID(), name, segment: body.segment?.trim() ?? '', color: body.color ?? '#5B5BD6', webhookToken: crypto.randomUUID().replaceAll('-', ''), createdAt: new Date() };
  await getDb().insert(contactLists).values(record); return NextResponse.json({ ...record, contactCount: 0 }, { status: 201 });
}
