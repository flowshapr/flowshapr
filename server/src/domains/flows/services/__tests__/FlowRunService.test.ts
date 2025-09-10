import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FlowRunService } from '../FlowRunService';
import {
  createMockFlow,
  createMockExecutionData,
  createMockUser,
  createMockFlowDefinition,
  createMockTrace,
} from '../../../../test-utils';

// Mock dependencies
const mockFlowService = {
  getFlowById: jest.fn(),
};

const mockTracesService = {
  createTrace: jest.fn(),
};

const mockContainerPool = {
  initialize: jest.fn(),
  shutdown: jest.fn(),
  getStatus: jest.fn(() => ({ initialized: true, availableContainers: 3, activeExecutions: 0 })),
  executeFlow: jest.fn(),
};

const mockCodeGeneratorService = {
  generate: jest.fn(),
};

// Mock modules
jest.mock('../FlowService', () => ({
  flowService: mockFlowService,
}));

jest.mock('../../traces/services/TracesService', () => ({
  tracesService: mockTracesService,
}));

jest.mock('../../../services/container-pool/ContainerPoolService', () => ({
  ContainerPoolService: jest.fn(() => mockContainerPool),
}));

jest.mock('../../blocks/services/CodeGeneratorService', () => ({
  CodeGeneratorService: jest.fn(() => mockCodeGeneratorService),
}));

describe('FlowRunService', () => {
  let flowRunService: FlowRunService;
  let mockUser: any;
  let mockFlow: any;
  let mockExecutionData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    flowRunService = new FlowRunService();
    mockUser = createMockUser();
    mockFlow = createMockFlow();
    mockExecutionData = createMockExecutionData();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockContainerPool.initialize.mockResolvedValue(undefined);

      await flowRunService.initialize();

      expect(mockContainerPool.initialize).toHaveBeenCalledTimes(1);
      expect(flowRunService.getStatus().initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockContainerPool.initialize.mockResolvedValue(undefined);

      await flowRunService.initialize();
      await flowRunService.initialize();

      expect(mockContainerPool.initialize).toHaveBeenCalledTimes(1);
    });

    it('should shutdown successfully', async () => {
      mockContainerPool.shutdown.mockResolvedValue(undefined);
      
      await flowRunService.initialize();
      await flowRunService.shutdown();

      expect(mockContainerPool.shutdown).toHaveBeenCalledTimes(1);
      expect(flowRunService.getStatus().initialized).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      const status = flowRunService.getStatus();

      expect(status).toMatchObject({
        initialized: false,
        containerPool: { initialized: true, availableContainers: 3, activeExecutions: 0 },
      });
    });
  });

  describe('execute', () => {
    const executeParams = {
      flowId: 'flow-123',
      userId: mockUser.id,
      input: { message: 'test input' },
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
    };

    beforeEach(() => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      mockCodeGeneratorService.generate.mockReturnValue({ 
        isValid: true, 
        code: '// generated code',
        errors: []
      });
      mockContainerPool.executeFlow.mockResolvedValue({
        success: true,
        result: { output: 'test output' },
        meta: {
          duration: 1000,
          instance: 'container-123',
        }
      });
      mockTracesService.createTrace.mockResolvedValue(createMockTrace());
    });

    it('should execute flow successfully', async () => {
      const result = await flowRunService.execute(executeParams);

      expect(mockFlowService.getFlowById).toHaveBeenCalledWith(executeParams.flowId, executeParams.userId);
      expect(mockContainerPool.executeFlow).toHaveBeenCalled();
      expect(mockTracesService.createTrace).toHaveBeenCalled();
      expect(result).toMatchObject({
        status: 200,
        body: {
          success: true,
          result: { output: 'test output' },
        },
      });
    });

    it('should execute flow with provided nodes and edges', async () => {
      const flowDefinition = createMockFlowDefinition();
      const paramsWithDefinition = {
        ...executeParams,
        nodes: flowDefinition.nodes,
        edges: flowDefinition.edges,
      };

      const result = await flowRunService.execute(paramsWithDefinition);

      expect(result).toMatchObject({
        status: 200,
        body: {
          success: true,
          result: { output: 'test output' },
        },
      });
    });

    it('should return 404 when flow not found and no nodes/edges provided', async () => {
      mockFlowService.getFlowById.mockResolvedValue(null);

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 404,
        body: {
          success: false,
          error: { message: 'Flow not found' },
        },
      });
    });

    it('should handle execution errors', async () => {
      mockContainerPool.executeFlow.mockResolvedValue({
        success: false,
        error: 'Execution failed',
        meta: {
          duration: 500,
          instance: 'container-failed',
        }
      });

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 400,
        body: {
          success: false,
          error: 'Execution failed',
          runtime: 'container-executor',
        },
      });
      expect(mockTracesService.createTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Execution failed',
        })
      );
    });

    it('should handle container executor timeout', async () => {
      mockContainerPool.executeFlow.mockRejectedValue(new Error('Timeout'));

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 400,
        body: {
          success: false,
          error: 'Timeout',
          runtime: 'container-executor',
        },
      });
    });

    it('should handle flow generation errors', async () => {
      mockCodeGeneratorService.generate.mockReturnValue({
        isValid: false,
        code: '',
        errors: ['Code generation failed']
      });

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 400,
        body: {
          success: false,
          error: { message: 'Code generation failed', errors: ['Code generation failed'] },
          runtime: 'container-executor',
        },
      });
    });
  });

  describe('streaming execution', () => {
    const streamParams = {
      flowId: 'flow-123',
      userId: mockUser.id,
      input: { message: 'test input' },
      stream: true,
    };

    beforeEach(() => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      mockCodeGeneratorService.generate.mockReturnValue({ 
        isValid: true, 
        code: '// generated code',
        errors: []
      });
    });

    it('should handle streaming execution (returns async generator)', async () => {
      mockContainerPool.executeFlow.mockResolvedValue({
        success: true,
        result: { output: 'streaming output' },
        meta: {
          duration: 1500,
          instance: 'container-stream',
        }
      });

      const result = await flowRunService.execute(streamParams);

      // The result should be an async generator for streaming
      expect(typeof result.next).toBe('function');
    });
  });
});