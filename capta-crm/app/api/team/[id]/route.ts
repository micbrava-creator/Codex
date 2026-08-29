import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireManager } from '../../../chatgpt-auth';
const OWNER_EMAIL = 'micbrava@gmail.com';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireManager()) return NextResponse.json({ error: 'Somente gestores' }, { status: 403 });
  const { id } = await params; const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase.from('crm_profiles').select('email').eq('id', id).maybeSingle();
  if (target?.email === OWNER_EMAIL) return NextResponse.json({ error: 'O gestor geral não pode ter seu perfil alterado' }, { status: 403 });
  const body = await request.json() as { name?: string; role?: 'manager' | 'sales' | 'admin'; active?: boolean };
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) values.name = body.name.trim(); if (body.role) values.role = body.role; if (body.active !== undefined) values.active = body.active;
  const { error } = await supabase.from('crm_profiles').update(values).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível alterar o usuário' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const manager = await requireManager(); if (!manager) return NextResponse.json({ error: 'Somente gestores' }, { status: 403 });
  const { id } = await params; if (id === manager.memberId) return NextResponse.json({ error: 'O gestor atual não pode desativar a própria conta' }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data: target } = await supabase.from('crm_profiles').select('email').eq('id', id).maybeSingle();
  if (target?.email === OWNER_EMAIL) return NextResponse.json({ error: 'O gestor geral não pode ser desativado' }, { status: 403 });
  const { error } = await supabase.from('crm_profiles').update({ active: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível desativar o usuário' }, { status: 400 });
  return NextResponse.json({ ok: true, deactivated: true });
}
