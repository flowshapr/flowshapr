import { pgTable, text, timestamp, pgEnum, jsonb, integer, boolean, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { organization, team } from "./organizations";

// Define enums for roles and status
export const flowStatusEnum = pgEnum("flow_status", ["draft", "published", "archived"]);
export const traceStatusEnum = pgEnum("trace_status", ["running", "completed", "failed"]);

// Flows - AI workflows with versioning
export const flow = pgTable("flow", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  alias: text("alias").notNull(), // Unique identifier for SDK calls (unique per organization)
  description: text("description"),
  version: text("version").notNull().default("1.0.0"),
  isLatest: boolean("is_latest").notNull().default(true),
  status: flowStatusEnum("status").notNull().default("draft"),
  
  // Flow definition
  nodes: jsonb("nodes").notNull(), // React Flow nodes
  edges: jsonb("edges").notNull(), // React Flow edges  
  metadata: jsonb("metadata"), // additional flow metadata
  
  // Configuration
  config: jsonb("config"), // execution configuration
  deploymentSettings: jsonb("deployment_settings"), // deployment-specific settings
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  publishedAt: timestamp("published_at"),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  statusIdx: index("flow_status_idx").on(table.status),
  latestIdx: index("flow_latest_idx").on(table.isLatest),
  aliasIdx: index("flow_alias_idx").on(table.alias),
  orgIdx: index("flow_org_idx").on(table.organizationId),
  // Ensure alias is unique per organization
  aliasOrgUnique: unique("flow_alias_org_unique").on(table.alias, table.organizationId),
}));

// Flow versions - version history
export const flowVersion = pgTable("flow_version", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  changelog: text("changelog"),
  
  // Snapshot of flow at this version
  nodes: jsonb("nodes").notNull(),
  edges: jsonb("edges").notNull(),
  metadata: jsonb("metadata"),
  config: jsonb("config"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  flowId: text("flow_id").notNull().references(() => flow.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  flowIdx: index("flow_version_flow_idx").on(table.flowId),
  versionIdx: index("flow_version_version_idx").on(table.flowId, table.version),
}));

// Prompts - reusable prompt templates
export const prompt = pgTable("prompt", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  template: text("template").notNull(), // prompt template with variables
  variables: jsonb("variables"), // variable definitions and defaults
  tags: jsonb("tags"), // array of tags for organization
  
  // Usage tracking
  usageCount: integer("usage_count").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  
  // New: flow-scoped prompts
  flowId: text("flow_id").references(() => flow.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  flowIdx: index("prompt_flow_idx").on(table.flowId),
  nameIdx: index("prompt_name_idx").on(table.name),
}));

// Traces - execution logs and analytics
export const trace = pgTable("trace", {
  id: text("id").primaryKey(),
  executionId: text("execution_id").notNull(), // unique ID for each execution
  
  // Execution details
  input: jsonb("input"), // execution input
  output: jsonb("output"), // final output
  nodeTraces: jsonb("node_traces"), // detailed trace of each node execution
  
  // Performance metrics
  duration: integer("duration"), // total execution time in ms
  status: traceStatusEnum("status").notNull().default("running"),
  errorMessage: text("error_message"),
  
  // Context
  version: text("version"), // flow version used
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  flowId: text("flow_id").notNull().references(() => flow.id, { onDelete: "cascade" }),
  executedBy: text("executed_by").references(() => user.id, { onDelete: "set null" }), // null for API executions
}, (table) => ({
  flowIdx: index("trace_flow_idx").on(table.flowId),
  executionIdx: index("trace_execution_idx").on(table.executionId),
  statusIdx: index("trace_status_idx").on(table.status),
  createdAtIdx: index("trace_created_at_idx").on(table.createdAt),
}));

// Datasets - test/training data
export const dataset = pgTable("dataset", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Data structure
  data: jsonb("data").notNull(), // actual dataset content
  schema: jsonb("schema"), // data schema/structure definition
  metadata: jsonb("metadata"), // additional metadata
  
  // Organization
  tags: jsonb("tags"),
  itemCount: integer("item_count").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  flowId: text("flow_id").notNull().references(() => flow.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  flowIdx: index("dataset_flow_idx").on(table.flowId),
  nameIdx: index("dataset_name_idx").on(table.name),
}));


// Connections - external provider credentials (flow-scoped for now)
export const connection = pgTable("connection", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // e.g., googleai, openai, anthropic
  apiKey: text("api_key").notNull(), // consider encryption at rest
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  flowId: text("flow_id").notNull().references(() => flow.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  flowIdx: index("connection_flow_idx").on(table.flowId),
  providerIdx: index("connection_provider_idx").on(table.provider),
}));

// Flow-scoped API Keys (flows are top-level containers)
export const flowApiKey = pgTable("flow_api_key", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull(), // hashed
  prefix: text("prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  rateLimit: integer("rate_limit"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  
  flowId: text("flow_id").notNull().references(() => flow.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  flowIdx: index("flow_api_key_flow_idx").on(table.flowId),
  keyIdx: index("flow_api_key_key_idx").on(table.key),
  activeIdx: index("flow_api_key_active_idx").on(table.isActive),
}));

// Define relations

export const flowRelations = relations(flow, ({ one, many }) => ({
  creator: one(user, {
    fields: [flow.createdBy],
    references: [user.id],
  }),
  versions: many(flowVersion),
  traces: many(trace),
  // connections: many(connection), // optional to add when needed
}));

export const connectionRelations = relations(connection, ({ one }) => ({
  flow: one(flow, {
    fields: [connection.flowId],
    references: [flow.id],
  }),
  creator: one(user, {
    fields: [connection.createdBy],
    references: [user.id],
  }),
}));

export const flowVersionRelations = relations(flowVersion, ({ one }) => ({
  flow: one(flow, {
    fields: [flowVersion.flowId],
    references: [flow.id],
  }),
  creator: one(user, {
    fields: [flowVersion.createdBy],
    references: [user.id],
  }),
}));

export const promptRelations = relations(prompt, ({ one }) => ({
  creator: one(user, {
    fields: [prompt.createdBy],
    references: [user.id],
  }),
}));

export const traceRelations = relations(trace, ({ one }) => ({
  flow: one(flow, {
    fields: [trace.flowId],
    references: [flow.id],
  }),
  executor: one(user, {
    fields: [trace.executedBy],
    references: [user.id],
  }),
}));

export const datasetRelations = relations(dataset, ({ one }) => ({
  flow: one(flow, {
    fields: [dataset.flowId],
    references: [flow.id],
  }),
  creator: one(user, {
    fields: [dataset.createdBy],
    references: [user.id],
  }),
}));

// Project-level API keys removed; use flowApiKey instead
