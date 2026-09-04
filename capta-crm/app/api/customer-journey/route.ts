import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { requireApiUser } from '../../chatgpt-auth';

function identity(contact: Record<string, any>) {
  const email = String(contact.email || '').trim().toLowerCase();
  const phone = String(contact.phone || '').replace(/\D/g, '');
  return email ? `email:${email}` : phone ? `phone:${phone}` : `contact:${contact.id}`;
}

export async function GET() {
  if (!await requireApiUser()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [contactsResult, purchasesResult, productsResult, tracksResult, itemsResult] = await Promise.all([
    supabase.from('crm_contacts').select('id,name,email,phone,company,assigned_user_id,product_id,sale_completed,negotiation_value_cents,created_at').order('created_at', { ascending: false }),
    supabase.from('crm_contact_purchases').select('*').order('purchased_at', { ascending: false }),
    supabase.from('crm_products').select('*').order('name'),
    supabase.from('crm_product_tracks').select('*').eq('active', true).order('created_at'),
    supabase.from('crm_product_track_items').select('*').order('position'),
  ]);
  if (contactsResult.error) return NextResponse.json({ error: 'Não foi possível carregar a jornada' }, { status: 500 });
  const contacts = contactsResult.data || []; const purchases = purchasesResult.data || []; const products = productsResult.data || []; const tracks = tracksResult.data || []; const items = itemsResult.data || [];
  const grouped = new Map<string, Record<string, any>[]>();
  contacts.forEach((contact) => grouped.set(identity(contact), [...(grouped.get(identity(contact)) || []), contact]));
  const customers = [...grouped.entries()].map(([key, related]) => {
    const contactIds = new Set(related.map((contact) => contact.id));
    const customerPurchases = purchases.filter((purchase) => contactIds.has(purchase.contact_id)).map((purchase) => ({ id: purchase.id, contactId: purchase.contact_id, productId: purchase.product_id, productName: products.find((product) => product.id === purchase.product_id)?.name || 'Produto removido', amountCents: purchase.amount_cents, purchasedAt: purchase.purchased_at, notes: purchase.notes, source: purchase.source }));
    const purchasedIds = new Set(customerPurchases.map((purchase) => purchase.productId));
    const opportunities = tracks.flatMap((track) => { const sequence = items.filter((item) => item.track_id === track.id).sort((a, b) => a.position - b.position); const lastBought = sequence.reduce((last, item, index) => purchasedIds.has(item.product_id) ? index : last, -1); const next = sequence.slice(lastBought + 1).find((item) => !purchasedIds.has(item.product_id)); const nextProduct = products.find((product) => product.id === next?.product_id && product.active); return nextProduct ? [{ trackId: track.id, trackName: track.name, productId: nextProduct.id, productName: nextProduct.name, category: nextProduct.category, priceCents: nextProduct.price_cents, color: nextProduct.color }] : []; });
    const primary = related[0];
    return { key, contactId: primary.id, contactIds: related.map((contact) => contact.id), name: primary.name, email: primary.email, phone: primary.phone, company: primary.company, purchases: customerPurchases, opportunities, totalPurchasedCents: customerPurchases.reduce((sum, purchase) => sum + purchase.amountCents, 0) };
  });
  return NextResponse.json({ customers, products: products.filter((product) => product.active).map((product) => ({ id: product.id, name: product.name, priceCents: product.price_cents, category: product.category })) });
}
