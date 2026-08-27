import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { cardTasks } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; const body = await request.json() as { title?: string; dueDate?: string | null; completed?: boolean }; const values: Partial<typeof cardTasks.$inferInsert> = {}; if (body.title?.trim()) values.title = body.title.trim(); if (body.dueDate !== undefined) values.dueDate = body.dueDate ? new Date(`${body.dueDate}T12:00:00`) : null; if (typeof body.completed === 'boolean') values.completed = body.completed; await getDb().update(cardTasks).set(values).where(eq(cardTasks.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; await getDb().delete(cardTasks).where(eq(cardTasks.id, id)); return NextResponse.json({ ok: true }); }
