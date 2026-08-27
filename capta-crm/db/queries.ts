import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from './index';
import { contactLists, contacts, pipelineStages } from './schema';

export function listContactLists() { return getDb().select({ id: contactLists.id, name: contactLists.name, segment: contactLists.segment, color: contactLists.color, webhookToken: contactLists.webhookToken, pipelineId: contactLists.pipelineId, contactCount: sql<number>`count(${contacts.id})` }).from(contactLists).leftJoin(contacts, eq(contacts.listId, contactLists.id)).groupBy(contactLists.id).orderBy(desc(contactLists.createdAt)); }
export function listContacts(listId: string) { return getDb().select().from(contacts).where(eq(contacts.listId, listId)).orderBy(desc(contacts.createdAt)); }
export function findListByWebhook(token: string) { return getDb().select().from(contactLists).where(eq(contactLists.webhookToken, token)).limit(1); }
export async function routingStageForList(listId: string) { const [list] = await getDb().select({ pipelineId: contactLists.pipelineId }).from(contactLists).where(eq(contactLists.id, listId)).limit(1); if (!list?.pipelineId) return null; const [stage] = await getDb().select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.pipelineId, list.pipelineId)).orderBy(pipelineStages.position).limit(1); return stage?.id ?? null; }
