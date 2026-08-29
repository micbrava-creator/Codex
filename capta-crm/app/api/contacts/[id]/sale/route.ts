import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { requireApiUser } from '../../../../chatgpt-auth';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { saleCompleted?: boolean };
  if (typeof body.saleCompleted !== 'boolean') return NextResponse.json({ error: 'Situação inválida' }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from('crm_contacts').update({ sale_completed: body.saleCompleted, sale_completed_at: body.saleCompleted ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão para alterar' }, { status: 403 });
  return NextResponse.json({ ok: true, saleCompleted: body.saleCompleted });
}
