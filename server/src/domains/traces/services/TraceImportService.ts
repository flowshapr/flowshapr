import { tracesService } from './TracesService';

export interface GenkitTraceData {
  traceId: string;
  displayName?: string;
  startTime?: string;
  endTime?: string;
  status?: { code: number; message?: string };
  input?: any;
  output?: any;
  spans?: GenkitSpan[];
  attributes?: Record<string, any>;
}

export interface GenkitSpan {
  traceId: string;
  spanId: string;
  displayName?: string;
  startTime?: string;
  endTime?: string;
  status?: { code: number; message?: string };
  input?: any;
  output?: any;
  attributes?: Record<string, any>;
}

/**
 * Service to import traces from Genkit's native telemetry server
 * and store them in our database format
 */
export class TraceImportService {
  /**
   * Import a Genkit trace and convert it to our database format
   */
  async importGenkitTrace(genkitTrace: GenkitTraceData, flowId: string): Promise<void> {
    try {
      const executionId = genkitTrace.traceId || `genkit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = genkitTrace.startTime ? new Date(genkitTrace.startTime).getTime() : undefined;
      const endTime = genkitTrace.endTime ? new Date(genkitTrace.endTime).getTime() : undefined;
      const duration = startTime && endTime ? endTime - startTime : null;

      // Convert Genkit status to our format
      let status: 'running' | 'completed' | 'failed' = 'completed';
      let errorMessage: string | null = null;
      
      if (genkitTrace.status) {
        // OpenTelemetry status codes: 0=UNSET, 1=OK, 2=ERROR
        if (genkitTrace.status.code === 2) {
          status = 'failed';
          errorMessage = genkitTrace.status.message || 'Execution failed';
        } else if (genkitTrace.status.code === 1) {
          status = 'completed';
        }
      }

      // Convert spans to nodeTraces - handle both array and object formats
      const spans = genkitTrace.spans || {};
      let nodeTraces: any[] = [];
      
      if (Array.isArray(spans)) {
        // If spans is an array
        nodeTraces = spans.map((span: any, index) => ({
          nodeId: span.spanId || `span_${index}`,
          nodeTitle: span.displayName || `Step ${index + 1}`,
          nodeType: this.extractNodeTypeFromSpan(span),
          input: span.attributes?.['genkit:input'] ? JSON.parse(span.attributes['genkit:input']) : undefined,
          output: span.attributes?.['genkit:output'] ? JSON.parse(span.attributes['genkit:output']) : undefined,
          duration: span.endTime && span.startTime ? span.endTime - span.startTime : undefined,
          error: span.status?.code === 2 ? span.status.message : undefined,
          timestamp: span.startTime ? new Date(span.startTime).toISOString() : new Date().toISOString(),
        }));
      } else if (spans && typeof spans === 'object') {
        // If spans is an object with spanId as keys
        nodeTraces = Object.values(spans).map((span: any, index) => ({
          nodeId: span.spanId || `span_${index}`,
          nodeTitle: span.displayName || `Step ${index + 1}`,
          nodeType: this.extractNodeTypeFromSpan(span),
          input: span.attributes?.['genkit:input'] ? JSON.parse(span.attributes['genkit:input']) : undefined,
          output: span.attributes?.['genkit:output'] ? JSON.parse(span.attributes['genkit:output']) : undefined,
          duration: span.endTime && span.startTime ? span.endTime - span.startTime : undefined,
          error: span.status?.code === 2 ? span.status.message : undefined,
          timestamp: span.startTime ? new Date(span.startTime).toISOString() : new Date().toISOString(),
        }));
      }

      // Create trace record
      const traceData = {
        id: executionId, // Add the ID field required by the database schema
        executionId,
        input: genkitTrace.input,
        output: genkitTrace.output,
        nodeTraces,
        duration,
        status,
        errorMessage,
        version: genkitTrace.attributes?.version || null,
        userAgent: genkitTrace.attributes?.userAgent || null,
        ipAddress: genkitTrace.attributes?.ipAddress || null,
        flowId,
        executedBy: genkitTrace.attributes?.executedBy || null,
      };

      // Debug log the trace data before inserting
      console.log('[TraceImport] About to insert trace with ID:', traceData.id);
      console.log('[TraceImport] Trace data keys:', Object.keys(traceData));

      await tracesService.createTrace(traceData);
      console.log('✅ [TraceImport] Successfully imported Genkit trace:', executionId);
      
    } catch (error) {
      console.error('❌ [TraceImport] Failed to import Genkit trace:', error);
      throw error;
    }
  }

  /**
   * Extract node type from span attributes or display name
   */
  private extractNodeTypeFromSpan(span: any): string {
    // Try to extract from genkit attributes first
    const genkitType = span.attributes?.['genkit:type'];
    const genkitSubtype = span.attributes?.['genkit:metadata:subtype'];
    
    if (genkitSubtype === 'model') return 'model';
    if (genkitSubtype === 'prompt') return 'prompt';
    if (genkitType === 'flow') return 'flow';
    if (genkitType === 'util' && span.displayName === 'generate') return 'generate';

    // Try to infer from display name
    const name = span.displayName?.toLowerCase() || '';
    if (name.includes('generate') || name.includes('model')) return 'model';
    if (name.includes('prompt')) return 'prompt';
    if (name.includes('transform')) return 'transform';
    if (name.includes('input')) return 'input';
    if (name.includes('output')) return 'output';
    if (name.includes('condition')) return 'condition';
    
    return 'unknown';
  }

  /**
   * Calculate duration from span start/end times
   */
  private calculateSpanDuration(span: GenkitSpan): number | undefined {
    if (!span.startTime || !span.endTime) return undefined;
    
    try {
      const start = new Date(span.startTime).getTime();
      const end = new Date(span.endTime).getTime();
      return end - start;
    } catch {
      return undefined;
    }
  }

  /**
   * Poll Genkit telemetry server for new traces
   */
  async pollGenkitTraces(genkitServerUrl: string): Promise<void> {
    try {
      const response = await fetch(`${genkitServerUrl}/api/traces`);
      if (!response.ok) {
        console.warn('[TraceImport] Failed to fetch traces from Genkit server:', response.status);
        return;
      }

      const responseData = await response.json();
      console.log('[TraceImport] Response format:', responseData);
      
      // Handle different possible response formats - could be trace IDs or full traces
      let traces: GenkitTraceData[] = [];
      if (Array.isArray(responseData)) {
        traces = (responseData as any[]).filter((item: any) => typeof item === 'object' && item.traceId);
      } else if ((responseData as any).traces && Array.isArray((responseData as any).traces)) {
        traces = ((responseData as any).traces as any[]).filter((item: any) => typeof item === 'object' && item.traceId);
      } else {
        console.warn('[TraceImport] Unexpected response format from Genkit server');
        return;
      }

      console.log(`[TraceImport] Found ${traces.length} traces to import`);
      
      for (const traceData of traces) {
        try {
          console.log(`[TraceImport] DEBUG - Full trace data for ${traceData.traceId}:`, JSON.stringify(traceData, null, 2));
          
          // Extract flowId from trace attributes or use a default
          const flowId = traceData.attributes?.flowId || 'unknown';
          
          await this.importGenkitTrace(traceData, flowId);
          console.log(`[TraceImport] Successfully imported trace ${traceData.traceId}`);
        } catch (error) {
          console.error('[TraceImport] Failed to import trace:', traceData.traceId, error);
          // Continue with other traces even if one fails
        }
      }
      
    } catch (error) {
      console.error('[TraceImport] Error polling Genkit traces:', error);
    }
  }
}

export const traceImportService = new TraceImportService();