import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const pipelines = sqliteTable('pipelines', {
  id: text('id').primaryKey(), name: text('name').notNull(), color: text('color').notNull().default('#5B5BD6'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const pipelineStages = sqliteTable('pipeline_stages', {
  id: text('id').primaryKey(), pipelineId: text('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }), name: text('name').notNull(), position: integer('position').notNull().default(0), color: text('color').notNull().default('#E8E7FF'),
}, (table) => [index('idx_pipeline_stages_pipeline_position').on(table.pipelineId, table.position)]);

export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(), chatgptUserId: text('chatgpt_user_id'), email: text('email').notNull(), name: text('name').notNull().default(''), role: text('role', { enum: ['manager', 'sales', 'admin'] }).notNull().default('sales'), active: integer('active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_team_members_email').on(table.email), uniqueIndex('idx_team_members_chatgpt_user').on(table.chatgptUserId), index('idx_team_members_role_active').on(table.role, table.active)]);

export const contactLists = sqliteTable('contact_lists', {
  id: text('id').primaryKey(), name: text('name').notNull(), segment: text('segment').notNull().default(''), color: text('color').notNull().default('#5B5BD6'), webhookToken: text('webhook_token').notNull(), pipelineId: text('pipeline_id').references(() => pipelines.id, { onDelete: 'set null' }), routingStageId: text('routing_stage_id').references(() => pipelineStages.id, { onDelete: 'set null' }), assignmentMode: text('assignment_mode', { enum: ['manual', 'fixed', 'round_robin'] }).notNull().default('manual'), fixedSellerId: text('fixed_seller_id').references(() => teamMembers.id, { onDelete: 'set null' }), rotationCursor: integer('rotation_cursor').notNull().default(0), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_contact_lists_webhook_token').on(table.webhookToken), index('idx_contact_lists_pipeline').on(table.pipelineId)]);

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(), listId: text('list_id').notNull().references(() => contactLists.id, { onDelete: 'cascade' }), stageId: text('stage_id').references(() => pipelineStages.id, { onDelete: 'set null' }), assignedUserId: text('assigned_user_id').references(() => teamMembers.id, { onDelete: 'set null' }), name: text('name').notNull().default(''), email: text('email').notNull().default(''), phone: text('phone').notNull().default(''), company: text('company').notNull().default(''), notes: text('notes').notNull().default(''), source: text('source').notNull().default('manual'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_contacts_list_created').on(table.listId, table.createdAt), index('idx_contacts_email').on(table.email), index('idx_contacts_stage').on(table.stageId)]);

export const listRotationMembers = sqliteTable('list_rotation_members', {
  listId: text('list_id').notNull().references(() => contactLists.id, { onDelete: 'cascade' }), memberId: text('member_id').notNull().references(() => teamMembers.id, { onDelete: 'cascade' }), position: integer('position').notNull().default(0),
}, (table) => [uniqueIndex('idx_list_rotation_member').on(table.listId, table.memberId), index('idx_list_rotation_position').on(table.listId, table.position)]);

export const cardTasks = sqliteTable('card_tasks', {
  id: text('id').primaryKey(), contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }), title: text('title').notNull(), dueDate: integer('due_date', { mode: 'timestamp_ms' }), completed: integer('completed', { mode: 'boolean' }).notNull().default(false), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_card_tasks_contact').on(table.contactId), index('idx_card_tasks_due').on(table.dueDate)]);
