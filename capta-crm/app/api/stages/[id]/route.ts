import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { pipelineStages } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; const body = await request.json() as { name?: string; color?: string; position?: number }; const values: Partial<typeof pipelineStages.$inferInsert> = {}; if (body.name?.trim()) values.name = body.name.trim(); if (body.color) values.color = body.color; if (typeof body.position === 'number') values.position = body.position; await getDb().update(pipelineStages).set(values).where(eq(pipelineStages.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; await getDb().delete(pipelineStages).where(eq(pipelineStages.id, id)); return NextResponse.json({ ok: true }); }
