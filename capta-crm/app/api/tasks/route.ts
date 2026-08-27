import { NextResponse } from 'next/server';
import { getDb } from '../../../db';
import { cardTasks } from '../../../db/schema';
import { requireApiUser } from '../../chatgpt-auth';

export async function POST(request: Request) { if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const body = await request.json() as { contactId?: string; title?: string; dueDate?: string }; if (!body.contactId || !body.title?.trim()) return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 }); const task = { id: crypto.randomUUID(), contactId: body.contactId, title: body.title.trim(), dueDate: body.dueDate ? new Date(`${body.dueDate}T12:00:00`) : null, completed: false, createdAt: new Date() }; await getDb().insert(cardTasks).values(task); return NextResponse.json(task, { status: 201 }); }
