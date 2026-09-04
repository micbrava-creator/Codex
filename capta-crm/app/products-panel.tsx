"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Buyer = { purchaseId: string; contactId: string; name: string; email: string; phone: string; amountCents: number; purchasedAt: string };
type Product = { id: string; name: string; category: string; description: string; priceCents: number; pipelineId: string | null; pipelineName: string; color: string; active: boolean; salesCount: number; salesTotalCents: number; buyers: Buyer[] };
type Pipeline = { id: string; name: string };
type Summary = { salesCount: number; salesTotalCents: number; averageTicketCents: number };
const labels: Record<string, string> = { training: "Treinamento", certification: "Certificação", formation: "Formação", course: "Curso", mentoring: "Mentoria", other: "Outro" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const empty = { name: "", category: "course", description: "", price: "0,00", pipelineId: "", color: "#5B5BD6", active: true };
function cents(value: string) { return Math.max(0, Math.round((Number(value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0) * 100)); }

export default function ProductsPanel({ flash }: { flash: (message: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary>({ salesCount: 0, salesTotalCents: 0, averageTicketCents: 0 });
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Product | null>(null);
  const [buyersOf, setBuyersOf] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    const [p, f, me] = await Promise.all([fetch("/api/products?metrics=1"), fetch("/api/pipelines"), fetch("/api/team/me")]);
    const result = await p.json() as { products?: Product[]; summary?: Summary };
    setProducts(result.products || []); setSummary(result.summary || { salesCount: 0, salesTotalCents: 0, averageTicketCents: 0 });
    setPipelines((await f.json() as Pipeline[]).map(({ id, name }) => ({ id, name })));
    const profile = await me.json() as { role?: string }; setCanManage(profile.role === "manager" || profile.role === "admin");
  }, []);
  useEffect(() => { load(); }, [load]);
  function show(product?: Product) { setEditing(product || null); setForm(product ? { name: product.name, category: product.category, description: product.description, price: (product.priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }), pipelineId: product.pipelineId || "", color: product.color, active: product.active } : empty); setOpen(true); }
  async function save(event: FormEvent) { event.preventDefault(); const response = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, priceCents: cents(form.price) }) }); if (!response.ok) return flash("Não foi possível salvar o produto."); setOpen(false); await load(); flash(editing ? "Produto atualizado." : "Produto cadastrado."); }
  async function duplicate(product: Product) { const response = await fetch(`/api/products/${product.id}/duplicate`, { method: "POST" }); if (!response.ok) return flash("Não foi possível duplicar o produto."); await load(); flash("Produto duplicado."); }
  async function remove(product: Product) { if (!confirm(`Excluir “${product.name}”?`)) return; const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) return flash(result.error || "Não foi possível excluir."); await load(); flash("Produto excluído."); }
  return <section className="commerce-screen">
    <header className="commerce-hero"><div><span className="eyebrow">PORTFÓLIO COMERCIAL</span><h2>Produtos da empresa</h2><p>Resultados consolidados de treinamentos, certificações, formações, cursos e mentorias.</p></div>{canManage && <button className="primary" onClick={() => show()}>+ Novo produto</button>}</header>
    <section className="commerce-kpis"><article><span>Vendas totais</span><strong>{summary.salesCount}</strong></article><article><span>Faturamento total</span><strong>{money.format(summary.salesTotalCents / 100)}</strong></article><article><span>Ticket médio</span><strong>{money.format(summary.averageTicketCents / 100)}</strong></article></section>
    <div className="product-grid">{products.map((product) => <article className={product.active ? "product-card" : "product-card inactive"} key={product.id} style={{ borderTopColor: product.color }}>
      <div className="product-card-head"><span style={{ background: product.color }}>{labels[product.category]?.slice(0, 1)}</span><div><small>{labels[product.category] || "Produto"}</small><h3>{product.name}</h3></div><i>{product.active ? "Ativo" : "Inativo"}</i></div><p>{product.description || "Sem descrição cadastrada."}</p>
      <dl><div><dt>Valor do produto</dt><dd>{money.format(product.priceCents / 100)}</dd></div><div><dt>Funil vinculado</dt><dd>{product.pipelineName || "Sem funil"}</dd></div><div><dt>Quantidade vendida</dt><dd>{product.salesCount}</dd></div><div><dt>Total vendido</dt><dd>{money.format(product.salesTotalCents / 100)}</dd></div></dl>
      <footer><button onClick={() => setBuyersOf(product)}>Ver compradores</button>{canManage && <><button onClick={() => show(product)}>Editar</button><button onClick={() => duplicate(product)}>Duplicar</button><button className="danger-text" onClick={() => remove(product)}>Excluir</button></>}</footer>
    </article>)}{!products.length && <div className="commerce-empty">Cadastre o primeiro produto para começar sua esteira comercial.</div>}</div>
    {buyersOf && <div className="modal-backdrop" onMouseDown={() => setBuyersOf(null)}><section className="modal buyers-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">COMPRADORES</span><h2>{buyersOf.name}</h2></div><button onClick={() => setBuyersOf(null)}>×</button></div><div className="buyer-list">{buyersOf.buyers.map((buyer) => <article key={buyer.purchaseId}><div><strong>{buyer.name}</strong><small>{buyer.email || buyer.phone || "Sem contato"}</small></div><div><strong>{money.format(buyer.amountCents / 100)}</strong><small>{new Date(buyer.purchasedAt).toLocaleDateString("pt-BR")}</small></div></article>)}{!buyersOf.buyers.length && <div className="commerce-empty">Este produto ainda não possui vendas registradas.</div>}</div></section></div>}
    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="modal product-modal" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PRODUTO</span><h2>{editing ? "Editar produto" : "Novo produto"}</h2></div><button type="button" onClick={() => setOpen(false)}>×</button></div><label>Nome<input required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><div className="form-grid"><label>Categoria<select className="form-select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Valor (R$)<input inputMode="decimal" value={form.price} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label></div><label>Funil de vendas<select className="form-select" value={form.pipelineId} onChange={(event) => setForm({ ...form, pipelineId: event.target.value })}><option value="">Sem funil vinculado</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select></label><label>Descrição<textarea rows={4} maxLength={4000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="product-options"><label>Cor<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label><label className="check-line"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Produto ativo</label></div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary">Salvar produto</button></div></form></div>}
  </section>;
}
