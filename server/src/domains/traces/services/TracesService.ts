import { eq, desc } from 'drizzle-orm';
import { db } from '../../../infrastructure/database/connection';
import * as schema from '../../../infrastructure/database/schema';

export interface CreateTraceInput {
  executionId: string;
  input?: unknown;
  output?: unknown;
  nodeTraces?: unknown[];
  duration?: number | null;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string | null;
  version?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  flowId: string;
  executedBy?: string | null;
}

export class TracesService {
  async listByFlow(flowId: string) {
    const rows = await (db as any)
      .select({
        id: (schema as any).trace.id,
        executionId: (schema as any).trace.executionId,
        status: (schema as any).trace.status,
        duration: (schema as any).trace.duration,
        createdAt: (schema as any).trace.createdAt,
      })
      .from((schema as any).trace)
      .where(eq((schema as any).trace.flowId, flowId))
      .orderBy(desc((schema as any).trace.createdAt));
    return rows;
  }

  async getByExecutionId(executionId: string) {
    const rows = await (db as any)
      .select()
      .from((schema as any).trace)
      .where(eq((schema as any).trace.executionId, executionId))
      .limit(1);
    return rows?.[0] || null;
  }

  async createTrace(input: CreateTraceInput) {
    const record = {
      id: input.executionId,
      executionId: input.executionId,
      input: input.input ?? null,
      output: input.output ?? null,
      nodeTraces: input.nodeTraces ?? [],
      duration: input.duration ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      version: input.version ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      flowId: input.flowId,
      executedBy: input.executedBy ?? null,
    } as any;

    await (db as any).insert((schema as any).trace).values(record);
    return record;
  }
}

export const tracesService = new TracesService();
