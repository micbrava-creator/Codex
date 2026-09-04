import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { requireApiUser } from '../../chatgpt-auth';

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [{ data: tracks, error }, { data: items }, { data: products }] = await Promise.all([
    supabase.from('crm_product_tracks').select('*').order('created_at'),
    supabase.from('crm_product_track_items').select('*').order('position'),
    supabase.from('crm_products').select('id,name,category,price_cents,color,active'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar as esteiras' }, { status: 500 });
  return NextResponse.json((tracks || []).map((track) => ({ id: track.id, name: track.name, description: track.description, active: track.active, items: (items || []).filter((item) => item.track_id === track.id).map((item) => { const entry = products?.find((product) => product.id === item.product_id); return { productId: item.product_id, position: item.position, product: entry ? { id: entry.id, name: entry.name, category: entry.category, priceCents: entry.price_cents, color: entry.color, active: entry.active } : null }; }).filter((item) => item.product) })));
}

export async function POST(request: Request) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const body = await request.json() as { name?: string; description?: string }; const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from('crm_product_tracks').insert({ id: crypto.randomUUID(), name, description: body.description?.trim().slice(0, 4000) || '' }).select().single();
  if (error) return NextResponse.json({ error: 'Não foi possível criar a esteira' }, { status: 403 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
