import { NextResponse } from 'next/server';
import { requireApiUser } from '../../../chatgpt-auth';
export async function GET() { const user = await requireApiUser(); if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); return NextResponse.json(user); }
