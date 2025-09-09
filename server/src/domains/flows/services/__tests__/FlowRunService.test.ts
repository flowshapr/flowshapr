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

const mockProcessExecutor = {
  initialize: jest.fn(),
  shutdown: jest.fn(),
  getStatus: jest.fn(() => ({ status: 'ready', processes: 0 })),
  execute: jest.fn(),
};

const mockCodeGenerator = {
  generateFlowCode: jest.fn(),
};

// Mock modules
jest.mock('../FlowService', () => ({
  flowService: mockFlowService,
}));

jest.mock('../../traces/services/TracesService', () => ({
  tracesService: mockTracesService,
}));

jest.mock('../../../services/process-executor', () => ({
  ProcessExecutor: jest.fn(() => mockProcessExecutor),
}));

jest.mock('../../../lib/code-generator', () => ({
  CodeGenerator: jest.fn(() => mockCodeGenerator),
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
      mockProcessExecutor.initialize.mockResolvedValue(undefined);

      await flowRunService.initialize();

      expect(mockProcessExecutor.initialize).toHaveBeenCalledTimes(1);
      expect(flowRunService.getStatus().initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockProcessExecutor.initialize.mockResolvedValue(undefined);

      await flowRunService.initialize();
      await flowRunService.initialize();

      expect(mockProcessExecutor.initialize).toHaveBeenCalledTimes(1);
    });

    it('should shutdown successfully', async () => {
      mockProcessExecutor.shutdown.mockResolvedValue(undefined);
      
      await flowRunService.initialize();
      await flowRunService.shutdown();

      expect(mockProcessExecutor.shutdown).toHaveBeenCalledTimes(1);
      expect(flowRunService.getStatus().initialized).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      const status = flowRunService.getStatus();

      expect(status).toMatchObject({
        initialized: false,
        processExecutor: { status: 'ready', processes: 0 },
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
      mockCodeGenerator.generateFlowCode.mockReturnValue('// generated code');
      mockProcessExecutor.execute.mockResolvedValue({
        success: true,
        result: { output: 'test output' },
        duration: 1000,
        executionId: 'exec-123',
      });
      mockTracesService.createTrace.mockResolvedValue(createMockTrace());
    });

    it('should execute flow successfully', async () => {
      const result = await flowRunService.execute(executeParams);

      expect(mockFlowService.getFlowById).toHaveBeenCalledWith(executeParams.flowId, executeParams.userId);
      expect(mockProcessExecutor.execute).toHaveBeenCalled();
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
      mockProcessExecutor.execute.mockResolvedValue({
        success: false,
        error: 'Execution failed',
        duration: 500,
        executionId: 'exec-failed',
      });

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 200,
        body: {
          success: false,
          error: 'Execution failed',
        },
      });
      expect(mockTracesService.createTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: 'Execution failed',
        })
      );
    });

    it('should handle process executor timeout', async () => {
      mockProcessExecutor.execute.mockRejectedValue(new Error('Timeout'));

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 500,
        body: {
          success: false,
          error: { message: 'Internal server error' },
        },
      });
    });

    it('should handle flow generation errors', async () => {
      mockCodeGenerator.generateFlowCode.mockImplementation(() => {
        throw new Error('Code generation failed');
      });

      const result = await flowRunService.execute(executeParams);

      expect(result).toMatchObject({
        status: 400,
        body: {
          success: false,
          error: { message: 'Code generation failed' },
        },
      });
    });
  });

  describe('executeStream', () => {
    const streamParams = {
      flowId: 'flow-123',
      userId: mockUser.id,
      input: { message: 'test input' },
      stream: true,
    };

    beforeEach(() => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      mockCodeGenerator.generateFlowCode.mockReturnValue('// generated code');
    });

    it('should execute streaming flow successfully', async () => {
      const mockReadableStream = {
        getReader: jest.fn(() => ({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('chunk 1') })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('chunk 2') })
            .mockResolvedValueOnce({ done: true }),
        })),
      };

      mockProcessExecutor.execute.mockResolvedValue({
        success: true,
        stream: mockReadableStream,
        executionId: 'exec-stream-123',
      });

      const result = await flowRunService.executeStream(streamParams);

      expect(result).toMatchObject({
        status: 200,
        body: mockReadableStream,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    });

    it('should handle streaming errors', async () => {
      mockProcessExecutor.execute.mockRejectedValue(new Error('Streaming failed'));

      const result = await flowRunService.executeStream(streamParams);

      expect(result).toMatchObject({
        status: 500,
        body: {
          success: false,
          error: { message: 'Internal server error' },
        },
      });
    });

    it('should return 404 for streaming when flow not found', async () => {
      mockFlowService.getFlowById.mockResolvedValue(null);

      const result = await flowRunService.executeStream(streamParams);

      expect(result).toMatchObject({
        status: 404,
        body: {
          success: false,
          error: { message: 'Flow not found' },
        },
      });
    });
  });
});