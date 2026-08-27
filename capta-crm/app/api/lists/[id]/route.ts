import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contactLists } from '../../../../db/schema';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json() as { name?: string; segment?: string; color?: string }; const values = Object.fromEntries(Object.entries(body).filter(([, value]) => typeof value === 'string' && value.trim())) as Partial<typeof contactLists.$inferInsert>; await getDb().update(contactLists).set(values).where(eq(contactLists.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; await getDb().delete(contactLists).where(eq(contactLists.id, id)); return NextResponse.json({ ok: true }); }
