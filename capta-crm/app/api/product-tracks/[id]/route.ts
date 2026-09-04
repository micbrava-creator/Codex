import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser(); if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params; const body = await request.json() as { name?: string; description?: string; active?: boolean; nextTrackId?: string | null }; const values: Record<string, unknown> = {};
  if (body.name?.trim()) values.name = body.name.trim(); if (body.description !== undefined) values.description = body.description.trim().slice(0, 4000); if (typeof body.active === 'boolean') values.active = body.active;
  if (body.nextTrackId !== undefined) { if (body.nextTrackId === id) return NextResponse.json({ error: 'Uma esteira não pode apontar para ela mesma' }, { status: 400 }); values.next_track_id = body.nextTrackId || null; }
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_product_tracks').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar a esteira' }, { status: 403 }); return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser(); if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_product_tracks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível excluir a esteira' }, { status: 403 }); return NextResponse.json({ ok: true });
}
