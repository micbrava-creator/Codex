import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { listFromDb } from '../../../lib/supabase/crm';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [{ data: lists, error }, { data: contacts }, { data: rotation }] = await Promise.all([
    supabase.from('crm_contact_lists').select('*').order('created_at', { ascending: false }),
    supabase.from('crm_contacts').select('id,list_id'),
    supabase.from('crm_list_rotation_members').select('*').order('position'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar as listas' }, { status: 500 });
  return NextResponse.json((lists || []).map((row) => ({
    ...listFromDb(row),
    contactCount: (contacts || []).filter((contact) => contact.list_id === row.id).length,
    rotationMemberIds: (rotation || []).filter((item) => item.list_id === row.id).map((item) => item.member_id),
  })));
}

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { name?: string; segment?: string; color?: string };
  const name = body.name?.trim(); if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const record = { id: crypto.randomUUID(), name, segment: body.segment?.trim() || '', color: body.color || '#5B5BD6', webhook_token: crypto.randomUUID().replaceAll('-', '') };
  const { data, error } = await supabase.from('crm_contact_lists').insert(record).select().single();
  if (error) return NextResponse.json({ error: 'Sem permissão para criar a lista' }, { status: 403 });
  return NextResponse.json({ ...listFromDb(data), contactCount: 0, rotationMemberIds: [] }, { status: 201 });
}
