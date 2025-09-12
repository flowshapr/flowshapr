import { and, eq } from 'drizzle-orm';
import { db } from '../../../infrastructure/database/connection';
import { requireUserAbility } from '../../../shared/authorization/service-guard';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../shared/utils/errors';
import { logError, logInfo } from '../../../shared/utils/logger';
import { prompt } from '../../../infrastructure/database/schema';

export interface CreatePromptInput {
  name: string;
  description?: string | null;
  template: string;
  variables?: string[];
  metadata?: Record<string, unknown>;
}

export class PromptsService {
  // Project-scoped methods removed

  // Flow-first operations
  async listByFlow(flowId: string, userId?: string) {
    try {
      if (!db) {
        throw new Error("Database connection not available");
      }
      
      if (userId) await requireUserAbility(userId, 'read', 'Flow', { id: flowId });
      
      logInfo('Listing prompts by flow', { flowId, userId });
      
      const rows = await db.select().from(prompt).where(eq(prompt.flowId, flowId));
      
      logInfo('Found prompts for flow', { flowId, count: rows.length, prompts: rows });
      
      return rows;
    } catch (error: any) {
      logError('Service error in listByFlow', {
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorCode: error?.code,
        flowId,
        userId,
        fullError: error
      });
      throw error;
    }
  }

  // Project-scoped methods removed

  async createForFlow(flowId: string, input: CreatePromptInput, userId: string) {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Validate required fields
    if (!input.name?.trim()) {
      throw new ValidationError("Prompt name is required");
    }
    if (!input.template?.trim()) {
      throw new ValidationError("Prompt template is required");
    }

    try {
      await requireUserAbility(userId, 'update', 'Flow', { id: flowId });
      
      const { name, description, template, variables, metadata } = input;
      const promptId = `prm_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      
      const inserted = await db.insert(prompt).values({
        id: promptId,
        name: name.trim(),
        description: description?.trim() || null,
        template: template,
        variables: variables || [],
        flowId,
        createdBy: userId,
      }).returning();

      if (!inserted || !inserted[0]) {
        throw new Error("Failed to create prompt - no data returned");
      }

      return inserted[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ValidationError("A prompt with this name already exists in the flow");
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new NotFoundError("Flow not found or access denied");
      }
      // Re-throw known errors
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      // Log unexpected errors for debugging with more detail
      logError('Error creating prompt - Full error details', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        flowId,
        userId,
        inputData: input,
        fullError: error
      });
      throw new Error("Failed to create prompt");
    }
  }

  // Project-scoped methods removed

  async updateForFlow(flowId: string, promptId: string, updates: Record<string, unknown>, userId?: string) {
    if (!db) {
      throw new Error("Database connection not available");
    }

    if (!promptId) {
      throw new ValidationError("Prompt ID is required");
    }

    try {
      if (userId) await requireUserAbility(userId, 'update', 'Flow', { id: flowId });

      // First check if prompt exists in the flow
      const existingPrompt = await db
        .select()
        .from(prompt)
        .where(
          and(
            eq(prompt.id, promptId),
            eq(prompt.flowId, flowId)
          )
        )
        .limit(1);

      if (!existingPrompt || existingPrompt.length === 0) {
        throw new NotFoundError("Prompt not found in this flow");
      }

      // Prepare update data with proper validation
      const updateData: any = { updatedAt: new Date() };
      
      if (updates.name !== undefined && typeof updates.name === 'string') {
        const trimmedName = updates.name.trim();
        if (!trimmedName) {
          throw new ValidationError("Prompt name cannot be empty");
        }
        updateData.name = trimmedName;
      }
      
      if (updates.template !== undefined && typeof updates.template === 'string') {
        if (!updates.template.trim()) {
          throw new ValidationError("Prompt template cannot be empty");
        }
        updateData.template = updates.template;
      }
      
      if (updates.description !== undefined) {
        updateData.description = typeof updates.description === 'string' 
          ? updates.description.trim() || null 
          : null;
      }
      
      if (updates.variables) {
        updateData.variables = Array.isArray(updates.variables) ? updates.variables : [];
      }
      
      if (updates.metadata) {
        updateData.metadata = typeof updates.metadata === 'object' && updates.metadata !== null 
          ? updates.metadata 
          : {};
      }

      await db
        .update(prompt)
        .set(updateData)
        .where(
          and(
            eq(prompt.id, promptId),
            eq(prompt.flowId, flowId)
          )
        );

      // Re-select to return updated prompt
      const rows = await db
        .select()
        .from(prompt)
        .where(
          and(
            eq(prompt.id, promptId),
            eq(prompt.flowId, flowId)
          )
        )
        .limit(1);

      return rows[0] || null;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ValidationError("A prompt with this name already exists in the flow");
      }
      // Re-throw known errors
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      logError('Error updating prompt - Full error details', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        flowId,
        promptId,
        userId,
        updateData: updates,
        fullError: error
      });
      throw new Error("Failed to update prompt");
    }
  }

  // Project-scoped methods removed

  async deleteForFlow(flowId: string, promptId: string, userId?: string) {
    if (!db) {
      throw new Error("Database connection not available");
    }

    if (!promptId) {
      throw new ValidationError("Prompt ID is required");
    }

    try {
      if (userId) await requireUserAbility(userId, 'update', 'Flow', { id: flowId });

      // First check if prompt exists in the flow
      const existingPrompt = await db
        .select()
        .from(prompt)
        .where(
          and(
            eq(prompt.id, promptId),
            eq(prompt.flowId, flowId)
          )
        )
        .limit(1);

      if (!existingPrompt || existingPrompt.length === 0) {
        throw new NotFoundError("Prompt not found in this flow");
      }

      await db
        .delete(prompt)
        .where(
          and(
            eq(prompt.id, promptId),
            eq(prompt.flowId, flowId)
          )
        );
    } catch (error: any) {
      // Re-throw known errors
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      logError('Error deleting prompt - Full error details', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        flowId,
        promptId,
        userId,
        fullError: error
      });
      throw new Error("Failed to delete prompt");
    }
  }

  async getById(promptId: string) {
    if (!db) {
      throw new Error('Database connection not available');
    }
    const rows = await db.select().from(prompt).where(eq(prompt.id, promptId)).limit(1);
    return rows?.[0] || null;
  }
}

export const promptsService = new PromptsService();
