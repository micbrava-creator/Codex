import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { requireApiUser } from '../../chatgpt-auth';

const categories = new Set(['training', 'certification', 'formation', 'course', 'mentoring', 'other']);
function product(row: Record<string, any>, pipelineName = '') {
  return { id: row.id, name: row.name, category: row.category, description: row.description, priceCents: row.price_cents, pipelineId: row.pipeline_id, pipelineName, color: row.color, active: row.active, createdAt: row.created_at };
}
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
async function allRows(client: Client, table: string, columns: string) {
  const rows: Record<string, any>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data || []) as unknown as Record<string, any>[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function GET(request: Request) {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: pipelines }, purchases, contacts] = await Promise.all([
    supabase.from('crm_products').select('*').order('active', { ascending: false }).order('name'),
    supabase.from('crm_pipelines').select('id,name'),
    allRows(supabase, 'crm_contact_purchases', 'id,product_id,contact_id,amount_cents,purchased_at'),
    allRows(supabase, 'crm_contacts', 'id,name,email,phone'),
  ]);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os produtos' }, { status: 500 });
  const contactById = new Map(contacts.map((contact) => [contact.id, contact]));
  const salesByProduct = new Map<string, Record<string, any>[]>();
  purchases.forEach((sale) => salesByProduct.set(sale.product_id, [...(salesByProduct.get(sale.product_id) || []), sale]));
  const productRows = (data || []).map((row) => {
    const sales = salesByProduct.get(row.id) || [];
    return {
      ...product(row, pipelines?.find((item) => item.id === row.pipeline_id)?.name),
      salesCount: sales.length,
      salesTotalCents: sales.reduce((total, sale) => total + Number(sale.amount_cents || 0), 0),
      buyers: sales.map((sale) => {
        const contact = contactById.get(sale.contact_id);
        return { purchaseId: sale.id, contactId: sale.contact_id, name: contact?.name || 'Contato sem nome', email: contact?.email || '', phone: contact?.phone || '', amountCents: sale.amount_cents, purchasedAt: sale.purchased_at };
      }),
    };
  });
  const allSales = purchases;
  const salesTotalCents = allSales.reduce((total, sale) => total + Number(sale.amount_cents || 0), 0);
  if (new URL(request.url).searchParams.get('metrics') !== '1') return NextResponse.json(productRows);
  return NextResponse.json({ products: productRows, summary: { salesCount: allSales.length, salesTotalCents, averageTicketCents: allSales.length ? Math.round(salesTotalCents / allSales.length) : 0 } });
}

export async function POST(request: Request) {
  const current = await requireApiUser();
  if (!current) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['manager', 'admin'].includes(current.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' && categories.has(body.category) ? body.category : 'course';
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('crm_products').insert({ id: crypto.randomUUID(), name, category, description: typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : '', price_cents: Math.max(0, Math.round(Number(body.priceCents) || 0)), pipeline_id: typeof body.pipelineId === 'string' ? body.pipelineId || null : null, color: typeof body.color === 'string' ? body.color : '#5B5BD6', active: body.active !== false }).select().single();
  if (error) return NextResponse.json({ error: 'Produto inválido ou sem permissão' }, { status: 403 });
  return NextResponse.json(product(data), { status: 201 });
}
