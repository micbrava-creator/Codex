import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { requireApiUser } from '../../../chatgpt-auth';

export async function POST(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { contactId?: string; productId?: string; amountCents?: number; purchasedAt?: string; notes?: string };
  if (!body.contactId || !body.productId) return NextResponse.json({ error: 'Cliente e produto obrigatórios' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase.from('crm_products').select('id,price_cents').eq('id', body.productId).maybeSingle();
  if (!product) return NextResponse.json({ error: 'Produto inválido' }, { status: 404 });
  const values = { contact_id: body.contactId, product_id: body.productId, amount_cents: Math.max(0, Math.round(body.amountCents ?? product.price_cents)), purchased_at: body.purchasedAt ? new Date(body.purchasedAt).toISOString() : new Date().toISOString(), notes: body.notes?.trim().slice(0, 2000) || '', source: 'manual' };
  const { data: existing } = await supabase.from('crm_contact_purchases').select('id').eq('contact_id', body.contactId).eq('product_id', body.productId).maybeSingle();
  const query = existing ? supabase.from('crm_contact_purchases').update(values).eq('id', existing.id) : supabase.from('crm_contact_purchases').insert({ id: crypto.randomUUID(), ...values });
  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: 'Sem permissão ou compra já registrada' }, { status: 403 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
