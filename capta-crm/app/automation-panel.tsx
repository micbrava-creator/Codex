'use client';

import { useCallback, useEffect, useState } from 'react';

type Stage = { id: string; name: string; color: string };
type Pipeline = { id: string; name: string; stages: Stage[] };
type ContactList = { id: string; name: string; segment: string; color: string; pipelineId: string | null; routingStageId: string | null; contactCount: number };

export default function AutomationPanel({ lists, reloadLists, flash, openPipelines }: { lists: ContactList[]; reloadLists: () => Promise<void>; flash: (message: string) => void; openPipelines: () => void }) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [saving, setSaving] = useState('');
  const load = useCallback(async () => { const response = await fetch('/api/pipelines'); setPipelines(await response.json() as Pipeline[]); }, []);
  useEffect(() => { load(); }, [load]);
  async function assign(listId: string, pipelineId: string | null, routingStageId: string | null) { setSaving(listId); await fetch(`/api/lists/${listId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipelineId, routingStageId }) }); await reloadLists(); setSaving(''); flash('Destino do lead salvo com sucesso.'); }

  return <div className="automation-screen"><section className="automation-hero"><div className="automation-icon">↗</div><div><span className="eyebrow">AUTOMAÇÃO DE ENTRADA</span><h2>Direcionamento das listas</h2><p>Defina o funil e a etapa exata em que cada novo lead será recebido.</p></div><button className="secondary" onClick={openPipelines}>Gerenciar funis</button></section><section className="routing-table"><header><div><strong>Lista de captação</strong><span>Contatos</span><span>Funil de destino</span><span>Etapa de entrada</span></div></header>{lists.map((list) => { const pipeline = pipelines.find((item) => item.id === list.pipelineId); const stages = pipeline?.stages || []; return <div className="routing-row" key={list.id}><div className="routing-list-name"><span style={{ background: list.color }} /><div><strong>{list.name}</strong><small>{list.segment || 'Sem segmento'}</small></div></div><span className="routing-count">{list.contactCount}</span><label><select value={list.pipelineId || ''} disabled={saving === list.id} onChange={(event) => { const pipelineId = event.target.value || null; const firstStage = pipelines.find((item) => item.id === pipelineId)?.stages[0]?.id || null; assign(list.id, pipelineId, firstStage); }}><option value="">Não direcionar</option>{pipelines.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><select value={list.routingStageId || stages[0]?.id || ''} disabled={!pipeline || saving === list.id} onChange={(event) => assign(list.id, list.pipelineId, event.target.value || null)}><option value="">Escolha a etapa</option>{stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.name}</option>)}</select></label></div>; })}{!lists.length && <div className="routing-empty"><h3>Nenhuma lista criada</h3><p>Crie uma lista na aba Contatos para configurar o direcionamento.</p></div>}</section><div className="automation-note"><span>i</span><p><strong>Como funciona:</strong> leads recebidos pelo Great Pages, cadastro manual ou CSV entram diretamente na etapa escolhida. Se nenhuma etapa for definida, o CRM usa a primeira etapa do funil.</p></div></div>;
}
