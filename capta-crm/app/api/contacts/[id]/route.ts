import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contacts } from '../../../../db/schema';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json() as Record<string, string>; const values = { name: body.name?.trim() ?? '', email: body.email?.trim().toLowerCase() ?? '', phone: body.phone?.trim() ?? '', company: body.company?.trim() ?? '', notes: body.notes?.trim() ?? '', updatedAt: new Date() }; if (!(values.name || values.email || values.phone)) return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 }); await getDb().update(contacts).set(values).where(eq(contacts.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; await getDb().delete(contacts).where(eq(contacts.id, id)); return NextResponse.json({ ok: true }); }
