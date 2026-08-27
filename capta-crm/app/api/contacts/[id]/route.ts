import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contacts } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; const body = await request.json() as Record<string, string | null>; const values: Partial<typeof contacts.$inferInsert> = { updatedAt: new Date() }; if (body.name !== undefined) values.name = body.name?.trim() ?? ''; if (body.email !== undefined) values.email = body.email?.trim().toLowerCase() ?? ''; if (body.phone !== undefined) values.phone = body.phone?.trim() ?? ''; if (body.company !== undefined) values.company = body.company?.trim() ?? ''; if (body.notes !== undefined) values.notes = body.notes?.trim() ?? ''; if (body.stageId !== undefined) values.stageId = body.stageId || null; await getDb().update(contacts).set(values).where(eq(contacts.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; await getDb().delete(contacts).where(eq(contacts.id, id)); return NextResponse.json({ ok: true }); }
