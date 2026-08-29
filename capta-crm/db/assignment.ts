import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '.';
import { contactLists, listRotationMembers, pipelines, pipelineStages, teamMembers } from './schema';

export type LeadRoute = { stageId: string | null; negotiationValueCents: number; seller: { id: string; name: string; email: string } | null };

export async function routeLeadForList(listId: string): Promise<LeadRoute> {
  const db = getDb();
  const [list] = await db.select().from(contactLists).where(eq(contactLists.id, listId)).limit(1);
  if (!list) return { stageId: null, negotiationValueCents: 0, seller: null };
  let negotiationValueCents = 0;
  if (list.pipelineId) { const [pipeline] = await db.select({ defaultValueCents: pipelines.defaultValueCents }).from(pipelines).where(eq(pipelines.id, list.pipelineId)).limit(1); negotiationValueCents = pipeline?.defaultValueCents ?? 0; }
  let stageId = list.routingStageId;
  if (!stageId && list.pipelineId) { const [stage] = await db.select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.pipelineId, list.pipelineId)).orderBy(asc(pipelineStages.position)).limit(1); stageId = stage?.id ?? null; }
  if (list.assignmentMode === 'fixed' && list.fixedSellerId) { const [seller] = await db.select({ id: teamMembers.id, name: teamMembers.name, email: teamMembers.email }).from(teamMembers).where(and(eq(teamMembers.id, list.fixedSellerId), eq(teamMembers.active, true))).limit(1); return { stageId, negotiationValueCents, seller: seller ?? null }; }
  if (list.assignmentMode !== 'round_robin') return { stageId, negotiationValueCents, seller: null };
  const members = await db.select({ id: teamMembers.id, name: teamMembers.name, email: teamMembers.email }).from(listRotationMembers).innerJoin(teamMembers, eq(teamMembers.id, listRotationMembers.memberId)).where(and(eq(listRotationMembers.listId, listId), eq(teamMembers.active, true))).orderBy(asc(listRotationMembers.position));
  if (!members.length) return { stageId, negotiationValueCents, seller: null };
  throw new Error('Round-robin aguardando migração atômica para PostgreSQL');
}
