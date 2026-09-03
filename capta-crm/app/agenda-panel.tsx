'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AgendaItem = { id: string; title: string; notes: string; dueDate: string | null; completed: boolean; reminderEnabled: boolean; reminderSentAt: string | null; contact: { id: string; name: string; email: string; phone: string; company: string; followUpEnabled: boolean; followUpIntervalDays: number }; seller: { id: string; name: string; email: string } | null; stage: { name: string; pipelineName: string } | null };
type AgendaData = { currentUser: { role: string; memberId: string }; sellers: { id: string; name: string }[]; items: AgendaItem[] };

function localInput(value: string | null) { if (!value) return ''; const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }
function whatsappUrl(phone: string) { const digits = phone.replace(/\D/g, '').replace(/^0+/, ''); return `https://wa.me/${digits.length === 10 || digits.length === 11 ? `55${digits}` : digits}`; }

export default function AgendaPanel({ flash }: { flash: (message: string) => void }) {
  const [data, setData] = useState<AgendaData | null>(null); const [status, setStatus] = useState('pending'); const [seller, setSeller] = useState('all'); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const response = await fetch('/api/agenda'); if (response.ok) setData(await response.json()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => { const now = Date.now(); const endToday = new Date(); endToday.setHours(23, 59, 59, 999); return (data?.items || []).filter((item) => {
    if (seller !== 'all' && item.seller?.id !== seller) return false;
    if (status === 'completed') return item.completed;
    if (item.completed) return false;
    const due = item.dueDate ? new Date(item.dueDate).getTime() : Infinity;
    if (status === 'late') return due < now;
    if (status === 'today') return due >= new Date().setHours(0, 0, 0, 0) && due <= endToday.getTime();
    if (status === 'upcoming') return due > endToday.getTime();
    return true;
  }); }, [data, seller, status]);
  async function change(item: AgendaItem, values: Record<string, unknown>, message: string) { const response = await fetch(`/api/tasks/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); if (!response.ok) return flash('Não foi possível atualizar o follow-up.'); await load(); flash(message); }
  function edit(item: AgendaItem) { const title = window.prompt('Ação do follow-up', item.title)?.trim(); if (!title) return; const notes = window.prompt('Observações', item.notes || '') ?? item.notes; const dueDate = window.prompt('Data e hora (AAAA-MM-DDTHH:MM)', localInput(item.dueDate))?.trim(); if (!dueDate) return; change(item, { title, notes, dueDate, reminderEnabled: item.reminderEnabled }, 'Follow-up atualizado.'); }
  if (loading) return <div className="agenda-screen"><div className="empty"><h2>Carregando agenda…</h2></div></div>;
  const pending = data?.items.filter((item) => !item.completed).length || 0; const late = data?.items.filter((item) => !item.completed && item.dueDate && new Date(item.dueDate).getTime() < Date.now()).length || 0;
  return <div className="agenda-screen">
    <section className="agenda-hero"><div><span>ACOMPANHAMENTO SEM ESQUECIMENTOS</span><h2>Prioridades de relacionamento</h2><p>Os novos leads atribuídos recebem um primeiro follow-up automático. Ao concluir, o próximo acompanhamento é criado conforme o intervalo configurado no cartão.</p></div><div className="agenda-numbers"><article><strong>{pending}</strong><span>pendentes</span></article><article className={late ? 'attention' : ''}><strong>{late}</strong><span>atrasados</span></article></div></section>
    <div className="agenda-toolbar"><div>{[['pending','Pendentes'],['today','Hoje'],['late','Atrasados'],['upcoming','Próximos'],['completed','Concluídos']].map(([value,label]) => <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{label}</button>)}</div>{data?.currentUser.role !== 'sales' && <select value={seller} onChange={(event) => setSeller(event.target.value)}><option value="all">Toda a equipe</option>{data?.sellers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div>
    <section className="agenda-list">{filtered.map((item) => <article key={item.id} className={item.completed ? 'done' : ''}><button className="agenda-check" onClick={() => change(item, { completed: !item.completed }, item.completed ? 'Follow-up reaberto.' : 'Follow-up concluído e próximo acompanhamento programado.')}>{item.completed ? '✓' : ''}</button><div className="agenda-main"><div><strong>{item.title}</strong><span className={item.reminderEnabled ? 'reminder on' : 'reminder'}>{item.reminderEnabled ? '✉ alerta ativo' : 'alerta desativado'}</span></div><h3>{item.contact.name || item.contact.email || 'Lead sem nome'}</h3><p>{item.stage ? `${item.stage.pipelineName} · ${item.stage.name}` : 'Sem funil'} · {item.seller?.name || 'Sem vendedor'}</p>{item.notes && <small>{item.notes}</small>}</div><time className={item.dueDate && !item.completed && new Date(item.dueDate).getTime() < Date.now() ? 'late' : ''}>{item.dueDate ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.dueDate)) : 'Sem prazo'}</time><div className="agenda-actions">{item.contact.phone && <a href={whatsappUrl(item.contact.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}<button onClick={() => change(item, { reminderEnabled: !item.reminderEnabled }, item.reminderEnabled ? 'Alerta desativado.' : 'Alerta ativado.')}>{item.reminderEnabled ? 'Desativar alerta' : 'Ativar alerta'}</button><button onClick={() => edit(item)}>Editar</button></div></article>)}{!filtered.length && <div className="agenda-empty"><strong>Nenhum follow-up neste filtro</strong><span>Sua agenda está organizada por enquanto.</span></div>}</section>
  </div>;
}
