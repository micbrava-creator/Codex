import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db';
import { pipelineStages } from '../../../../../db/schema';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const { id } = await params; const body = await request.json() as { name?: string; color?: string }; const name = body.name?.trim(); if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 }); const [last] = await getDb().select({ position: pipelineStages.position }).from(pipelineStages).where(eq(pipelineStages.pipelineId, id)).orderBy(desc(pipelineStages.position)).limit(1); const stage = { id: crypto.randomUUID(), pipelineId: id, name, position: (last?.position ?? -1) + 1, color: body.color || '#ECEBE7' }; await getDb().insert(pipelineStages).values(stage); return NextResponse.json(stage, { status: 201 }); }
