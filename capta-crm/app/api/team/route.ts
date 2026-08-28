import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb } from '../../../db';
import { teamMembers } from '../../../db/schema';
import { requireApiUser, requireManager } from '../../chatgpt-auth';

export async function GET() { const user = await requireApiUser(); if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); return NextResponse.json(await getDb().select().from(teamMembers).orderBy(asc(teamMembers.name))); }
export async function POST(request: Request) { if (!await requireManager()) return NextResponse.json({ error: 'Somente gestores podem cadastrar usuários' }, { status: 403 }); const body = await request.json() as { email?: string; name?: string; role?: 'manager' | 'sales' | 'admin' }; const email = body.email?.trim().toLowerCase(); if (!email || !email.includes('@')) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 }); const member = { id: crypto.randomUUID(), chatgptUserId: null, email, name: body.name?.trim() || email.split('@')[0], role: body.role || 'sales', active: true, createdAt: new Date() }; try { await getDb().insert(teamMembers).values(member); return NextResponse.json(member, { status: 201 }); } catch { return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 }); } }
