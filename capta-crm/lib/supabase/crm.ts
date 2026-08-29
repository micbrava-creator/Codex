import { createSupabaseAdminClient } from './admin';

export type LeadRoute = { stageId: string | null; negotiationValueCents: number; seller: { id: string; name: string; email: string } | null };

export async function routeLeadForList(listId: string): Promise<LeadRoute> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('crm_route_lead', { p_list_id: listId });
  if (error) throw error;
  const row = data?.[0];
  return {
    stageId: row?.stage_id ?? null,
    negotiationValueCents: row?.negotiation_value_cents ?? 0,
    seller: row?.seller_id ? { id: row.seller_id, name: row.seller_name, email: row.seller_email } : null,
  };
}

export function contactFromDb(row: Record<string, any>) {
  return { id: row.id, listId: row.list_id, name: row.name, email: row.email, phone: row.phone, company: row.company, notes: row.notes, source: row.source, createdAt: row.created_at, updatedAt: row.updated_at, stageId: row.stage_id, assignedUserId: row.assigned_user_id, negotiationValueCents: row.negotiation_value_cents, saleCompleted: row.sale_completed, saleCompletedAt: row.sale_completed_at };
}
export function listFromDb(row: Record<string, any>) {
  return { id: row.id, name: row.name, segment: row.segment, color: row.color, webhookToken: row.webhook_token, createdAt: row.created_at, pipelineId: row.pipeline_id, routingStageId: row.routing_stage_id, assignmentMode: row.assignment_mode, fixedSellerId: row.fixed_seller_id, rotationCursor: row.rotation_cursor, emailAlertsEnabled: row.email_alerts_enabled, confirmationEmailEnabled: row.confirmation_email_enabled };
}
export function stageFromDb(row: Record<string, any>) { return { id: row.id, pipelineId: row.pipeline_id, name: row.name, position: row.position, color: row.color, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function pipelineFromDb(row: Record<string, any>) { return { id: row.id, name: row.name, color: row.color, defaultValueCents: row.default_value_cents, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function taskFromDb(row: Record<string, any>) { return { id: row.id, contactId: row.contact_id, title: row.title, dueDate: row.due_date, completed: row.completed, createdAt: row.created_at, updatedAt: row.updated_at }; }
