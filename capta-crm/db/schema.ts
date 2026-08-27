import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const contactLists = sqliteTable('contact_lists', {
  id: text('id').primaryKey(), name: text('name').notNull(), segment: text('segment').notNull().default(''), color: text('color').notNull().default('#5B5BD6'), webhookToken: text('webhook_token').notNull(), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_contact_lists_webhook_token').on(table.webhookToken)]);

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(), listId: text('list_id').notNull().references(() => contactLists.id, { onDelete: 'cascade' }), name: text('name').notNull().default(''), email: text('email').notNull().default(''), phone: text('phone').notNull().default(''), company: text('company').notNull().default(''), notes: text('notes').notNull().default(''), source: text('source').notNull().default('manual'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_contacts_list_created').on(table.listId, table.createdAt), index('idx_contacts_email').on(table.email)]);
