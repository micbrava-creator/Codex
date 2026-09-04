import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { requireApiUser } from "../../chatgpt-auth";

type Row = Record<string, unknown>;
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
async function allRows(client: Client, table: string, columns = "*") {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data || []) as unknown as Row[]));
    if (!data || data.length < 1000) return rows;
  }
}

function identity(contact: Row) {
  const email = String(contact.email || "").trim().toLowerCase();
  const phone = String(contact.phone || "").replace(/\D/g, "");
  return email ? `email:${email}` : phone ? `phone:${phone}` : `contact:${contact.id}`;
}

export async function GET() {
  if (!(await requireApiUser())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const [contacts, purchases, productsResult, tracksResult, itemsResult] = await Promise.all([
    allRows(supabase, "crm_contacts", "id,name,email,phone,company,assigned_user_id,product_id,sale_completed,negotiation_value_cents,created_at"),
    allRows(supabase, "crm_contact_purchases"),
    supabase.from("crm_products").select("*").order("name"),
    supabase.from("crm_product_tracks").select("*").eq("active", true).order("created_at"),
    supabase.from("crm_product_track_items").select("*").order("position"),
  ]);
  const products = (productsResult.data || []) as Row[];
  const tracks = (tracksResult.data || []) as Row[];
  const items = (itemsResult.data || []) as Row[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const trackById = new Map(tracks.map((track) => [track.id, track]));
  const itemsByTrack = new Map<unknown, Row[]>();
  items.forEach((item) => itemsByTrack.set(item.track_id, [...(itemsByTrack.get(item.track_id) || []), item]));
  const grouped = new Map<string, Row[]>();
  contacts.forEach((contact) => grouped.set(identity(contact), [...(grouped.get(identity(contact)) || []), contact]));

  const customers = [...grouped.entries()].map(([key, related]) => {
    const contactIds = new Set(related.map((contact) => String(contact.id)));
    const customerPurchases = purchases.filter((purchase) => contactIds.has(String(purchase.contact_id))).map((purchase) => ({
      id: purchase.id, contactId: purchase.contact_id, productId: purchase.product_id,
      productName: productById.get(purchase.product_id)?.name || "Produto removido",
      amountCents: Number(purchase.amount_cents || 0), purchasedAt: purchase.purchased_at,
      notes: purchase.notes, source: purchase.source,
    }));
    const purchasedIds = new Set(customerPurchases.map((purchase) => purchase.productId));
    const projections = tracks.map((track) => {
      const sequence = [...(itemsByTrack.get(track.id) || [])].sort((a, b) => Number(a.position) - Number(b.position)).map((item) => productById.get(item.product_id)).filter((product): product is Row => Boolean(product)).map((product) => ({
        productId: product.id, productName: product.name, priceCents: Number(product.price_cents || 0), color: product.color, active: product.active, purchased: purchasedIds.has(product.id),
      }));
      return { trackId: track.id, trackName: track.name, nextTrackId: track.next_track_id || null, nextTrackName: trackById.get(track.next_track_id)?.name || "", items: sequence, potentialCents: sequence.filter((item) => item.active && !item.purchased).reduce((sum, item) => sum + item.priceCents, 0) };
    });
    const opportunities = projections.flatMap((projection) => { const next = projection.items.find((item) => item.active && !item.purchased); return next ? [{ trackId: projection.trackId, trackName: projection.trackName, ...next }] : []; });
    const uniqueRemaining = new Map<string, number>();
    projections.forEach((projection) => projection.items.forEach((item) => { if (item.active && !item.purchased) uniqueRemaining.set(String(item.productId), item.priceCents); }));
    const primary = related[0];
    return { key, contactId: primary.id, contactIds: related.map((contact) => contact.id), name: primary.name, email: primary.email, phone: primary.phone, company: primary.company, purchases: customerPurchases, opportunities, projections, totalPurchasedCents: customerPurchases.reduce((sum, purchase) => sum + purchase.amountCents, 0), remainingPotentialCents: [...uniqueRemaining.values()].reduce((sum, value) => sum + value, 0) };
  });
  return NextResponse.json({ customers, products: products.filter((product) => product.active).map((product) => ({ id: product.id, name: product.name, priceCents: product.price_cents, category: product.category })) });
}
