import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(),
  email: text("email").notNull().unique(), phone: text("phone").notNull().default(""), city: text("city").notNull().default(""),
  source: text("source").notNull().default("Cadastro manual"), status: text("status").notNull().default("Lead"),
  funnel: text("funnel").notNull().default("Palestras"), stage: text("stage").notNull().default("Novo lead"),
  owner: text("owner").notNull().default("Equipe Fortuna"), acquisitionCost: real("acquisition_cost").notNull().default(0),
  revenue: real("revenue").notNull().default(0), nextOffer: text("next_offer").notNull().default("Imersão presencial"),
  dealValue: real("deal_value").notNull().default(0),
  listId: integer("list_id"), listName: text("list_name").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const interactions = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }), personId: integer("person_id").notNull(),
  type: text("type").notNull(), title: text("title").notNull(), amount: real("amount").notNull().default(0),
  occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }), title: text("title").notNull(), city: text("city").notNull().default("Online"),
  eventDate: text("event_date").notNull(), capacity: integer("capacity").notNull().default(0), registrations: integer("registrations").notNull().default(0),
  revenue: real("revenue").notNull().default(0), status: text("status").notNull().default("Planejado"),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), category: text("category").notNull(),
  price: real("price").notNull().default(0), active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personId: integer("person_id").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  amount: real("amount").notNull().default(0),
  status: text("status").notNull().default("Pago"),
  purchasedAt: text("purchased_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const salesFunnels = sqliteTable("sales_funnels", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true), sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const funnelStages = sqliteTable("funnel_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }), funnelId: integer("funnel_id").notNull(),
  name: text("name").notNull(), sortOrder: integer("sort_order").notNull().default(0),
});
export const webhookSettings = sqliteTable("webhook_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }), provider: text("provider").notNull().default("GreatPages"),
  targetFunnel: text("target_funnel").notNull().default("Palestras"), targetStage: text("target_stage").notNull().default("Novo lead"),
  secret: text("secret").notNull().default(""), active: integer("active", { mode: "boolean" }).notNull().default(true),
  mappingJson: text("mapping_json").notNull().default("{}"), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const webhookLogs = sqliteTable("webhook_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }), provider: text("provider").notNull(),
  status: text("status").notNull(), email: text("email").notNull().default(""), message: text("message").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"), receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const leadLists = sqliteTable("lead_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(),
  token: text("token").notNull().unique(), targetFunnel: text("target_funnel").notNull(), targetStage: text("target_stage").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
