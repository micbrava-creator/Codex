import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { requireApiUser } from '../../../../chatgpt-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireApiUser(); if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params; const body = await request.json() as { productIds?: string[] }; const productIds = [...new Set((body.productIds || []).filter(Boolean))];
  const supabase = await createSupabaseServerClient();
  if (productIds.length) {
    const { data: validProducts } = await supabase.from('crm_products').select('id').in('id', productIds);
    if ((validProducts || []).length !== productIds.length) return NextResponse.json({ error: 'Um produto selecionado é inválido' }, { status: 400 });
  }
  const { error: removeError } = await supabase.from('crm_product_track_items').delete().eq('track_id', id);
  if (removeError) return NextResponse.json({ error: 'Não foi possível alterar a sequência' }, { status: 403 });
  if (productIds.length) { const { error } = await supabase.from('crm_product_track_items').insert(productIds.map((productId, position) => ({ track_id: id, product_id: productId, position }))); if (error) return NextResponse.json({ error: 'Um produto selecionado é inválido' }, { status: 400 }); }
  return NextResponse.json({ ok: true });
}
