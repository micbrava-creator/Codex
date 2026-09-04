import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_contact_purchases').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão para excluir a compra' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
