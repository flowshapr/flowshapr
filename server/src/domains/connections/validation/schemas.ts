import { z } from 'zod';

export const connectionIdParamsSchema = z.object({
  id: z.string().min(1, 'Invalid flow ID'),
  connectionId: z.string().min(1, 'Invalid connection ID'),
});

export const createConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  provider: z.string().min(1, 'Provider is required').max(50),
  apiKey: z.string().min(1, 'API key is required'),
  isActive: z.boolean().optional(),
});

export const updateConnectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(50).optional(),
  apiKey: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

