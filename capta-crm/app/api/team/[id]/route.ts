import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { teamMembers } from '../../../../db/schema';
import { requireManager } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await requireManager()) return NextResponse.json({ error: 'Somente gestores' }, { status: 403 }); const { id } = await params; const body = await request.json() as { name?: string; role?: 'manager' | 'sales' | 'admin'; active?: boolean }; const values: Partial<typeof teamMembers.$inferInsert> = {}; if (body.name !== undefined) values.name = body.name.trim(); if (body.role) values.role = body.role; if (body.active !== undefined) values.active = body.active; await getDb().update(teamMembers).set(values).where(eq(teamMembers.id, id)); return NextResponse.json({ ok: true }); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const manager = await requireManager(); if (!manager) return NextResponse.json({ error: 'Somente gestores' }, { status: 403 }); const { id } = await params; if (id === manager.memberId) return NextResponse.json({ error: 'O gestor atual não pode excluir a própria conta' }, { status: 400 }); await getDb().delete(teamMembers).where(eq(teamMembers.id, id)); return NextResponse.json({ ok: true }); }
