import { z } from 'zod';

// Base schemas
const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters long")
  .max(50, "Slug must be less than 50 characters")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
  .transform(slug => slug.toLowerCase().trim());

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters long")
  .max(100, "Name must be less than 100 characters")
  .transform(name => name.trim());

const descriptionSchema = z
  .string()
  .max(500, "Description must be less than 500 characters")
  .optional()
  .transform(desc => desc?.trim() || undefined);

const versionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, "Version must follow semantic versioning (e.g., 1.0.0)");

// Flow definition schemas
const flowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.any(),
});

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

// Create flow schema
export const createFlowSchema = z.object({
  name: nameSchema,
  alias: z.string()
    .min(2, "Alias must be at least 2 characters long")
    .max(50, "Alias must be less than 50 characters")
    .regex(/^[a-z0-9-_]+$/, "Alias can only contain lowercase letters, numbers, hyphens, and underscores")
    .transform(alias => alias.toLowerCase().trim()),
  description: descriptionSchema,
  organizationId: z.string().min(1, "Organization ID is required").optional(),
  teamId: z.string().optional(),
});

// Update flow schema
export const updateFlowSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  alias: z
    .string()
    .min(2, "Alias must be at least 2 characters long")
    .max(50, "Alias must be less than 50 characters")
    .regex(/^[a-z0-9-_]+$/, "Alias can only contain lowercase letters, numbers, hyphens, and underscores")
    .transform(alias => alias.toLowerCase().trim())
    .optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  config: z.any().optional(), // execution configuration
  deploymentSettings: z.any().optional(), // deployment-specific settings
});;

// Save flow definition schema
export const saveFlowDefinitionSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  metadata: z.any().optional(),
});

// Execute flow schema (request body)
export const executeFlowSchema = z.object({
  input: z.any(),
  nodes: z.array(flowNodeSchema).optional(),
  edges: z.array(flowEdgeSchema).optional(),
  metadata: z.any().optional(),
  connections: z.array(z.object({ id: z.string(), name: z.string(), provider: z.string(), apiKey: z.string().optional() })).optional(),
});

export type ExecuteFlowRequest = z.infer<typeof executeFlowSchema>;

// Publish flow schema
export const publishFlowSchema = z.object({
  version: versionSchema.optional(),
  changelog: z.string().max(1000, "Changelog must be less than 1000 characters").optional(),
});

// Flow member role schema
export const flowMemberRoleSchema = z.enum(['owner', 'admin', 'developer', 'viewer']);

// Add flow member schema
export const addFlowMemberSchema = z.object({
  body: z.object({
    userId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid user ID").optional(),
    email: z.string().email("Invalid email address").optional(),
    role: flowMemberRoleSchema,
  }).refine(data => data.userId || data.email, {
    message: "Either userId or email must be provided"
  }),
});

// Update flow member role schema
export const updateFlowMemberRoleSchema = z.object({
  body: z.object({
    role: flowMemberRoleSchema,
  }),
});

// Flow ID param schema
export const flowIdSchema = z.object({
  id: z.string().min(1, 'Invalid flow ID'),
});

// Flow alias param schema
export const flowAliasSchema = z.object({
  alias: z.string()
    .min(2, "Alias must be at least 2 characters long")
    .max(50, "Alias must be less than 50 characters")
    .regex(/^[a-z0-9-_]+$/, "Alias can only contain lowercase letters, numbers, hyphens, and underscores")
    .transform(alias => alias.toLowerCase().trim()),
});

// Member ID param schema
export const memberIdSchema = z.object({
  memberId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid member ID"),
});

// Combined flow and member ID schema
export const flowMemberParamsSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{32}$/, "Invalid flow ID"),
  memberId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid member ID"),
});

// Query schemas
export const flowListQuerySchema = z.object({
  query: z.object({
    organizationId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid organization ID").optional(),
    teamId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid team ID").optional(),
    includeArchived: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
    search: z.string().min(1).max(100).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val)).pipe(z.number().min(0)).optional(),
  }),
});

// Type exports
export type CreateFlowRequest = z.infer<typeof createFlowSchema>;
export type UpdateFlowRequest = z.infer<typeof updateFlowSchema>;
export type SaveFlowDefinitionRequest = z.infer<typeof saveFlowDefinitionSchema>;
export type PublishFlowRequest = z.infer<typeof publishFlowSchema>;
export type AddFlowMemberRequest = z.infer<typeof addFlowMemberSchema>;
export type UpdateFlowMemberRoleRequest = z.infer<typeof updateFlowMemberRoleSchema>;
export type FlowListQuery = z.infer<typeof flowListQuerySchema>;
