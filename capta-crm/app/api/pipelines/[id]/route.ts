import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { pipelines } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; const body = await request.json() as { name?: string; color?: string }; const values: Partial<typeof pipelines.$inferInsert> = {}; if (body.name?.trim()) values.name = body.name.trim(); if (body.color) values.color = body.color; await getDb().update(pipelines).set(values).where(eq(pipelines.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; await getDb().delete(pipelines).where(eq(pipelines.id, id)); return NextResponse.json({ ok: true }); }
