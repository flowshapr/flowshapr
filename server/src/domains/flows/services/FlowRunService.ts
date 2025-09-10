import { flowService } from './FlowService';
import { tracesService } from '../../traces/services/TracesService';
import { ContainerPoolService } from '../../../services/container-pool/ContainerPoolService';
import { ExecutionConfig } from '../../../services/container-pool/ContainerPoolService';
import { CodeGeneratorService } from '../../blocks/services/CodeGeneratorService';
import { BlockInstance, FlowEdge, FlowVariable } from '../../blocks/types';

type ExecuteInput = {
  flowId: string;
  userId: string;
  input: any;
  nodes?: any[];
  edges?: any[];
  metadata?: any;
  connections?: any[];
  userAgent?: string | null;
  ipAddress?: string | null;
  stream?: boolean;
};

export class FlowRunService {
  private containerPool: ContainerPoolService;
  private isInitialized = false;

  constructor() {
    this.containerPool = new ContainerPoolService({
      poolSize: 3,
      workTimeout: 120000, // 2 minutes for AI calls
      healthCheckInterval: 30000 // 30 seconds
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Container Pool Execution Service...');
    await this.containerPool.initialize();
    this.isInitialized = true;
    console.log('✅ Container Pool Execution Service ready');
  }

  async shutdown(): Promise<void> {
    await this.containerPool.shutdown();
    this.isInitialized = false;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      containerPool: this.containerPool.getStatus()
    };
  }

  async execute(params: ExecuteInput) {
    const { flowId, userId, input, nodes, edges, metadata, connections, userAgent, ipAddress, stream } = params;
    
    // Get flow definition
    const flow = await flowService.getFlowById(flowId, userId);
    if (!flow && (!nodes || !edges)) {
      return { status: 404, body: { success: false, error: { message: 'Flow not found' } } };
    }
    
    const flowDef: any = (!nodes || !edges)
      ? { nodes: (flow as any)!.nodes, edges: (flow as any)!.edges, metadata: (flow as any)!.metadata }
      : { nodes, edges, metadata };
    
    // Get connections (API keys)
    let flowConnections = connections;
    if (!flowConnections && flow) {
      try {
        const { connectionsService } = await import('../../connections/services/ConnectionsService.js');
        const list = await connectionsService.listByFlow(flow.id);
        flowConnections = list.map((c: any) => ({ 
          id: c.id, 
          name: c.name, 
          provider: c.provider, 
          apiKey: c.apiKey, 
          isActive: c.isActive 
        }));
      } catch {
        flowConnections = [];
      }
    }

    // Validate flow definition
    try {
      const { flowValidator } = await import('./FlowValidator.js');
      const issues = await flowValidator.validate(flowDef);
      if (issues.length > 0) {
        return { 
          status: 400, 
          body: { 
            success: false, 
            error: { message: 'Flow validation failed', issues }, 
            runtime: 'process-executor' 
          } 
        };
      }
    } catch (e: any) {
      return { 
        status: 500, 
        body: { 
          success: false, 
          error: { message: 'Validator error', details: e?.message || String(e) }, 
          runtime: 'process-executor' 
        } 
      };
    }

    // Convert frontend flow format to server block format
    const blocks = this.convertNodesToBlocks(flowDef.nodes);
    const flowEdges = this.convertEdgesToFlowEdges(flowDef.edges);
    const variables: FlowVariable[] = []; // TODO: Extract from flow metadata if needed
    
    // Generate TypeScript code using new server-side code generator
    const codeGeneratorService = new CodeGeneratorService(blocks, flowEdges, variables);
    const generatedCode = codeGeneratorService.generate();
    
    if (!generatedCode.isValid) {
      return {
        status: 400,
        body: {
          success: false,
          error: { 
            message: 'Code generation failed', 
            errors: generatedCode.errors 
          },
          runtime: 'process-executor'
        }
      };
    }

    // Prepare API keys configuration
    const executionConfig: ExecutionConfig = {
      flowId: flowId // Pass the flowId for telemetry
    };
    if (flowConnections && Array.isArray(flowConnections)) {
      for (const conn of flowConnections) {
        if (conn.isActive === false) {
          continue;
        }
        
        switch (conn.provider) {
          case 'googleai':
            executionConfig.googleApiKey = conn.apiKey;
            break;
          case 'openai':
            executionConfig.openaiApiKey = conn.apiKey;
            break;
          case 'anthropic':
            executionConfig.anthropicApiKey = conn.apiKey;
            break;
        }
      }
    }

    // Execute in container pool
    const execStart = Date.now();
    let result: any;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (stream) {
        // Return async generator for streaming
        return this.executeStream(generatedCode.code, input, executionConfig, flow, userId, userAgent, ipAddress);
      } else {
        // Regular execution
        result = await this.containerPool.executeFlow(generatedCode.code, input, executionConfig);
      }
    } catch (error: any) {
      result = {
        success: false,
        error: error.message,
        meta: {
          instance: 'unknown',
          duration: Date.now() - execStart
        }
      };
    }

    const duration = Date.now() - execStart;

    // Store execution trace with timeout to prevent hanging
    if (flow) {
      // Run trace persistence in background with timeout - don't block response
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const tracePromise = tracesService.createTrace({
        executionId,
        input,
        output: result.success ? result.result : null,
        nodeTraces: [], // Container execution doesn't provide detailed node traces yet
        duration,
        status: result.success ? 'completed' : 'failed',
        errorMessage: result.success ? null : (result.error || 'Unknown error'),
        version: (flow as any)?.version || null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        flowId: (flow as any).id,
        executedBy: userId?.startsWith('token_') ? null : (userId || null),
      });

      // Run with 5 second timeout, don't await - let it run in background
      Promise.race([
        tracePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Trace persistence timeout')), 5000)
        )
      ]).catch(e => {
        console.warn('Trace persist failed:', (e as any)?.message || e);
      });
    }

    return {
      status: result.success ? 200 : 400,
      body: { 
        ...result, 
        runtime: 'process-executor',
        traces: [] // Add empty traces array for frontend compatibility
      },
    };
  }

  private async *executeStream(
    code: string, 
    input: any, 
    config: ExecutionConfig, 
    flow: any, 
    userId: string,
    userAgent?: string | null,
    ipAddress?: string | null
  ): AsyncGenerator<any, void, unknown> {
    const execStart = Date.now();
    let success = true;
    let finalResult: any = null;
    let error: string | null = null;

    try {
      // Note: ContainerPoolService doesn't support streaming yet, so we'll execute normally
      // and yield the result as a single chunk
      const result = await this.containerPool.executeFlow(code, input, config);
      
      // Simulate streaming by yielding progress and then the result
      yield {
        event: 'progress',
        data: { message: 'Executing flow in secure container...', instance: 'container' }
      };
      
      if (result.success) {
        yield {
          event: 'complete',
          data: {
            result: result.result,
            instance: result.meta?.instance || 'container',
            duration: result.meta?.duration || 0
          }
        };
        finalResult = result.result;
      } else {
        yield {
          event: 'error',
          data: {
            error: result.error,
            instance: result.meta?.instance || 'container',
            duration: result.meta?.duration || 0
          }
        };
        error = result.error || 'Container execution failed';
        success = false;
      }
    } catch (streamError: any) {
      success = false;
      error = streamError.message;
      yield { error: streamError.message, type: 'error' };
    }

    // Store execution trace for streaming
    if (flow) {
      try {
        const duration = Date.now() - execStart;
        const executionId = `stream_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        await tracesService.createTrace({
          executionId,
          input,
          output: success ? finalResult : null,
          nodeTraces: [],
          duration,
          status: success ? 'completed' : 'failed',
          errorMessage: error,
          version: (flow as any)?.version || null,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          flowId: (flow as any).id,
          executedBy: userId?.startsWith('token_') ? null : (userId || null),
        });
      } catch (e) {
        console.warn('Stream trace persist failed:', (e as any)?.message || e);
      }
    }
  }

  /**
   * Convert frontend flow nodes to server block instances
   */
  private convertNodesToBlocks(nodes: any[]): BlockInstance[] {
    if (!Array.isArray(nodes)) return [];
    
    return nodes.map(node => ({
      id: node.id,
      blockType: node.type || node.data?.type || 'unknown',
      position: node.position || { x: 0, y: 0 },
      config: node.data?.config || {},
      selected: false,
      inputs: [],
      outputs: [],
      state: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }));
  }

  /**
   * Convert frontend edges to flow edges
   */
  private convertEdgesToFlowEdges(edges: any[]): FlowEdge[] {
    if (!Array.isArray(edges)) return [];
    
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    }));
  }
}

export const flowRunService = new FlowRunService();