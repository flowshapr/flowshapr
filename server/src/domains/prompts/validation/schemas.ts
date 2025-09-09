import { z } from 'zod';

// Base schemas for reuse
const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(200, "Name must be less than 200 characters")
  .transform(name => name.trim());

const descriptionSchema = z
  .string()
  .max(1000, "Description must be less than 1000 characters")
  .optional()
  .nullable()
  .transform(desc => desc?.trim() || null);

const templateSchema = z
  .string()
  .min(1, "Template is required")
  .max(10000, "Template must be less than 10,000 characters");

const variablesSchema = z
  .array(z.string().min(1, "Variable name cannot be empty"))
  .optional()
  .default([]);

const metadataSchema = z
  .record(z.unknown())
  .optional()
  .default({});

// Create prompt schema
export const createPromptSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  template: templateSchema,
  variables: variablesSchema,
  metadata: metadataSchema,
});

// Update prompt schema (all fields optional except what's being updated)
export const updatePromptSchema = z.object({
  name: nameSchema.optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional().nullable().transform(desc => desc?.trim() || null),
  template: templateSchema.optional(),
  variables: z.array(z.string().min(1, "Variable name cannot be empty")).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(data => Object.keys(data).some(key => data[key as keyof typeof data] !== undefined), {
  message: "At least one field must be provided for update"
});

// Prompt ID parameter schema
export const promptIdSchema = z.object({
  promptId: z.string()
    .min(1, "Prompt ID is required")
    .regex(/^prm_/, "Invalid prompt ID format"),
});

// Flow ID parameter schema (for flow-scoped operations)
export const flowIdSchema = z.object({
  id: z.string().min(1, "Flow ID is required"),
});

// Combined flow and prompt ID schema
export const flowPromptParamsSchema = z.object({
  id: z.string().min(1, "Flow ID is required"),
  promptId: z.string()
    .min(1, "Prompt ID is required")
    .regex(/^prm_/, "Invalid prompt ID format"),
});

// Query schemas for listing prompts
export const promptListQuerySchema = z.object({
  query: z.object({
    search: z.string().min(1).max(100).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val)).pipe(z.number().min(0)).optional(),
  }),
});

// Type exports
export type CreatePromptRequest = z.infer<typeof createPromptSchema>;
export type UpdatePromptRequest = z.infer<typeof updatePromptSchema>;
export type PromptIdParams = z.infer<typeof promptIdSchema>;
export type FlowPromptParams = z.infer<typeof flowPromptParamsSchema>;
export type PromptListQuery = z.infer<typeof promptListQuerySchema>;