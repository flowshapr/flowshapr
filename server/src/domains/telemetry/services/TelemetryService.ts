import path from 'path';
import { LocalFileTraceStore } from './LocalFileTraceStore';
import { logInfo, logError } from '../../../shared/utils/logger';

export class TelemetryService {
  private traceStore: LocalFileTraceStore;

  constructor() {
    // Use project root for trace storage
    const projectRoot = path.resolve(process.cwd());
    logInfo("Project Root", projectRoot);
    this.traceStore = new LocalFileTraceStore(projectRoot);
    this.traceStore.init().catch(logError);
  }

  async saveTrace(trace: any): Promise<void> {
    const traceId = trace.traceId || trace.id || `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logInfo("TraceId", traceId);
    await this.traceStore.save(traceId, trace);
  }

  async saveTraceToFile(trace: any): Promise<void> {
    // This is the same as saveTrace since our traceStore already saves to files
    await this.saveTrace(trace);
  }

  async listTraces(limit?: number, continuationToken?: string, filter?: string): Promise<{ traces: string[]; continuationToken?: string }> {
    // For now, ignore the filter parameter - can be implemented later if needed
    return await this.traceStore.list(limit, continuationToken);
  }

  async getTrace(traceId: string): Promise<any | null> {
    return await this.traceStore.load(traceId);
  }
}

export const telemetryService = new TelemetryService();
