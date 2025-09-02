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

// Project settings schema
const projectSettingsSchema = z.object({
  deployment: z.object({
    autoDeployLatest: z.boolean().optional(),
    environment: z.enum(['development', 'staging', 'production']).optional(),
    customDomain: z.string().url().optional(),
  }).optional(),
  apiKeys: z.object({
    allowedOrigins: z.array(z.string().url()).optional(),
    rateLimit: z.number().min(1).max(10000).optional(),
  }).optional(),
  integrations: z.record(z.object({
    enabled: z.boolean(),
    config: z.record(z.any()),
  })).optional(),
}).optional();

// Create project schema
export const createProjectSchema = z.object({
  body: z.object({
    name: nameSchema,
    slug: slugSchema.optional(), // Generated from name if not provided
    description: descriptionSchema,
    organizationId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid organization ID"),
    teamId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid team ID").optional(),
    settings: projectSettingsSchema,
  }),
});

// Update project schema
export const updateProjectSchema = z.object({
  body: z.object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    settings: projectSettingsSchema,
  }),
});

// Project member role schema
export const projectMemberRoleSchema = z.enum(['admin', 'developer', 'viewer']);

// Add project member schema
export const addProjectMemberSchema = z.object({
  body: z.object({
    userId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid user ID").optional(),
    email: z.string().email("Invalid email address").optional(),
    role: projectMemberRoleSchema,
  }).refine(data => data.userId || data.email, {
    message: "Either userId or email must be provided"
  }),
});

// Update project member role schema
export const updateProjectMemberRoleSchema = z.object({
  body: z.object({
    role: projectMemberRoleSchema,
  }),
});

// Project ID param schema
export const projectIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{32}$/, "Invalid project ID"),
  }),
});

// Member ID param schema
export const memberIdSchema = z.object({
  params: z.object({
    memberId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid member ID"),
  }),
});

// Combined project and member ID schema
export const projectMemberParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{32}$/, "Invalid project ID"),
    memberId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid member ID"),
  }),
});

// Query schemas
export const projectListQuerySchema = z.object({
  query: z.object({
    organizationId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid organization ID").optional(),
    teamId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid team ID").optional(),
    includeArchived: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
    search: z.string().min(1).max(100).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val)).pipe(z.number().min(0)).optional(),
  }),
});

// Access token schemas
export const createApiKeySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{32}$/, "Invalid project ID"),
  }),
  body: z.object({
    name: nameSchema,
    scopes: z.array(z.string()).default([]),
    rateLimit: z.number().min(1).max(10000).optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export const apiKeyIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{32}$/, "Invalid project ID"),
    keyId: z.string().regex(/^[a-f0-9_\-]{10,}$/i, "Invalid key ID"),
  }),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;

// Type exports
export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleRequest = z.infer<typeof updateProjectMemberRoleSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
