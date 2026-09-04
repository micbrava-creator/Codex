import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { requireApiUser } from '../../../../chatgpt-auth';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params; const body = await request.json() as { saleCompleted?: boolean };
  if (typeof body.saleCompleted !== 'boolean') return NextResponse.json({ error: 'Situação inválida' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: contact } = await supabase.from('crm_contacts').select('id,product_id,stage_id,negotiation_value_cents').eq('id', id).maybeSingle();
  if (!contact) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
  let productId = contact.product_id as string | null;
  if (body.saleCompleted && !productId && contact.stage_id) {
    const { data: stage } = await supabase.from('crm_pipeline_stages').select('pipeline_id').eq('id', contact.stage_id).maybeSingle();
    if (stage?.pipeline_id) {
      const { data: products } = await supabase.from('crm_products').select('id').eq('pipeline_id', stage.pipeline_id).eq('active', true).order('created_at').limit(1);
      productId = products?.[0]?.id ?? null;
    }
  }
  const completedAt = body.saleCompleted ? new Date().toISOString() : null;
  const { error } = await supabase.from('crm_contacts').update({ product_id: productId, sale_completed: body.saleCompleted, sale_completed_at: completedAt, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Sem permissão para alterar' }, { status: 403 });
  if (productId && body.saleCompleted) {
    const { data: existing } = await supabase.from('crm_contact_purchases').select('id').eq('contact_id', id).eq('product_id', productId).maybeSingle();
    const purchase = { contact_id: id, product_id: productId, amount_cents: contact.negotiation_value_cents ?? 0, purchased_at: completedAt, source: 'opportunity', notes: '' };
    if (existing) await supabase.from('crm_contact_purchases').update(purchase).eq('id', existing.id);
    else await supabase.from('crm_contact_purchases').insert({ id: crypto.randomUUID(), ...purchase });
  } else if (productId) {
    await supabase.from('crm_contact_purchases').delete().eq('contact_id', id).eq('product_id', productId).eq('source', 'opportunity');
  }
  return NextResponse.json({ ok: true, saleCompleted: body.saleCompleted });
}
