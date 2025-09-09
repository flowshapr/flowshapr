import { db } from '../../../infrastructure/database/connection';
import * as schema from '../../../infrastructure/database/schema';

type AnyRecord = Record<string, any>;

export class TelemetryService {
  /**
   * Ingest a Genkit telemetry payload and persist to our traces table.
   * The payload shape is flexible; we try to map common fields.
   */
  async ingestGenkit(payload: AnyRecord) {
    const p = payload || {};
    const meta = p.metadata || p.meta || {};
    const ctx = p.context || {};

    const executionId = p.executionId || p.traceId || p.id || `exec_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const flowId = p.flowId || meta.flowId || ctx.flowId;
    // projectId deprecated; flows are top-level
    const input = p.input ?? meta.input ?? null;
    const output = p.output ?? meta.output ?? null;
    const status = (p.status || '').toLowerCase() as 'running' | 'completed' | 'failed' | '';
    const startedAt = p.startedAt ? new Date(p.startedAt).getTime() : (p.startTime ? new Date(p.startTime).getTime() : undefined);
    const finishedAt = p.finishedAt ? new Date(p.finishedAt).getTime() : (p.endTime ? new Date(p.endTime).getTime() : undefined);
    const duration = typeof p.duration === 'number' ? p.duration : (startedAt && finishedAt ? (finishedAt - startedAt) : null);
    const errorMessage = p.error?.message || p.errorMessage || null;
    const version = p.version || meta.version || null;
    const userAgent = p.userAgent || meta.userAgent || null;
    const ipAddress = p.ipAddress || meta.ipAddress || null;
    const executedBy = p.executedBy || meta.executedBy || null;

    // Build node traces from spans/steps if present
    const spans: any[] = Array.isArray(p.spans) ? p.spans : (Array.isArray(p.steps) ? p.steps : []);
    const nodeTraces = spans.map((s) => ({
      nodeId: s.id || s.name || s.stepId || 'step',
      nodeTitle: s.name || s.title || s.stepName,
      nodeType: (s.type || '').toString().toLowerCase() || undefined,
      input: s.input ?? undefined,
      output: s.output ?? undefined,
      duration: typeof s.duration === 'number' ? s.duration : (s.startedAt && s.finishedAt ? (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) : undefined),
      error: s.error?.message || undefined,
      timestamp: s.startedAt || s.timestamp || new Date().toISOString(),
    }));

    await (db as any).insert((schema as any).trace).values({
      id: executionId,
      executionId,
      input,
      output,
      nodeTraces,
      duration,
      status: status === 'failed' ? 'failed' : (status === 'completed' ? 'completed' : 'completed'),
      errorMessage,
      version,
      userAgent,
      ipAddress,
      flowId,
      executedBy,
    });

    return { executionId };
  }
}

export const telemetryService = new TelemetryService();
