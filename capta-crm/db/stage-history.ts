import { eq } from 'drizzle-orm';
import { getDb } from '.';
import { contactStageHistory, pipelineStages } from './schema';

export async function recordStageEntry(contactId: string, stageId: string | null) {
  if (!stageId) return;
  const db = getDb();
  const [stage] = await db.select({ pipelineId: pipelineStages.pipelineId }).from(pipelineStages).where(eq(pipelineStages.id, stageId)).limit(1);
  if (!stage) return;
  await db.insert(contactStageHistory).values({ id: crypto.randomUUID(), contactId, pipelineId: stage.pipelineId, stageId, enteredAt: new Date() }).onConflictDoNothing();
}
