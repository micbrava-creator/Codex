import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { contactLists } from '../../../../db/schema';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; const body = await request.json() as { name?: string; segment?: string; color?: string; pipelineId?: string | null; routingStageId?: string | null }; const values: Partial<typeof contactLists.$inferInsert> = {}; if (body.name?.trim()) values.name = body.name.trim(); if (body.segment !== undefined) values.segment = body.segment.trim(); if (body.color?.trim()) values.color = body.color.trim(); if (body.pipelineId !== undefined) { values.pipelineId = body.pipelineId || null; if (!body.pipelineId) values.routingStageId = null; } if (body.routingStageId !== undefined) values.routingStageId = body.routingStageId || null; await getDb().update(contactLists).set(values).where(eq(contactLists.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; await getDb().delete(contactLists).where(eq(contactLists.id, id)); return NextResponse.json({ ok: true }); }
