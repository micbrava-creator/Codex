import { env } from 'cloudflare:workers';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '.';
import { contactLists, listRotationMembers, pipelineStages, teamMembers } from './schema';

export type LeadRoute = { stageId: string | null; seller: { id: string; name: string; email: string } | null };

export async function routeLeadForList(listId: string): Promise<LeadRoute> {
  const db = getDb();
  const [list] = await db.select().from(contactLists).where(eq(contactLists.id, listId)).limit(1);
  if (!list) return { stageId: null, seller: null };
  let stageId = list.routingStageId;
  if (!stageId && list.pipelineId) { const [stage] = await db.select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.pipelineId, list.pipelineId)).orderBy(asc(pipelineStages.position)).limit(1); stageId = stage?.id ?? null; }
  if (list.assignmentMode === 'fixed' && list.fixedSellerId) { const [seller] = await db.select({ id: teamMembers.id, name: teamMembers.name, email: teamMembers.email }).from(teamMembers).where(and(eq(teamMembers.id, list.fixedSellerId), eq(teamMembers.active, true))).limit(1); return { stageId, seller: seller ?? null }; }
  if (list.assignmentMode !== 'round_robin') return { stageId, seller: null };
  const members = await db.select({ id: teamMembers.id, name: teamMembers.name, email: teamMembers.email }).from(listRotationMembers).innerJoin(teamMembers, eq(teamMembers.id, listRotationMembers.memberId)).where(and(eq(listRotationMembers.listId, listId), eq(teamMembers.active, true))).orderBy(asc(listRotationMembers.position));
  if (!members.length) return { stageId, seller: null };
  for (let attempt = 0; attempt < 8; attempt++) { const current = await env.DB.prepare('SELECT rotation_cursor FROM contact_lists WHERE id = ?').bind(listId).first<{ rotation_cursor: number }>(); const cursor = current?.rotation_cursor ?? 0; const updated = await env.DB.prepare('UPDATE contact_lists SET rotation_cursor = ? WHERE id = ? AND rotation_cursor = ?').bind(cursor + 1, listId, cursor).run(); if ((updated.meta.changes ?? 0) === 1) return { stageId, seller: members[cursor % members.length] }; }
  throw new Error('Não foi possível reservar o próximo vendedor');
}
