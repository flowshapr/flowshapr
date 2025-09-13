import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock all dependencies before importing the service
const mockFlowService = {
  getFlowById: jest.fn(),
};

const mockTracesService = {
  createTrace: jest.fn(),
};

const mockContainerPoolInstance = {
  initialize: jest.fn(),
  shutdown: jest.fn(),
  getStatus: jest.fn(() => ({ initialized: true, availableContainers: 3, activeExecutions: 0 })),
  executeFlow: jest.fn(),
};

const mockCodeGeneratorInstance = {
  generate: jest.fn(),
};

// Mock modules
jest.mock('../FlowService', () => ({
  flowService: mockFlowService,
}));

jest.mock('../../../traces/services/TracesService', () => ({
  tracesService: mockTracesService,
}));

jest.mock('../../../../infrastructure/container-pool/ContainerPoolService', () => ({
  ContainerPoolService: jest.fn(() => mockContainerPoolInstance),
}));

jest.mock('../../../blocks/services/CodeGeneratorService', () => ({
  CodeGeneratorService: jest.fn(() => mockCodeGeneratorInstance),
}));

// Mock the flow validator module - this must be at the top level
jest.mock('../FlowValidator', () => ({
  __esModule: true,
  flowValidator: {
    validate: jest.fn().mockResolvedValue([]), // Empty array = no validation issues
  },
}));

// Mock connections service
jest.mock('../../../connections/services/ConnectionsService', () => ({
  __esModule: true,
  connectionsService: {
    listByFlow: jest.fn().mockResolvedValue([]),
  },
}));

// Get the mocked modules for use in tests
const mockFlowValidator = require('../FlowValidator').flowValidator;
const mockConnectionsService = require('../../../connections/services/ConnectionsService').connectionsService;

// Import after mocks
import { FlowRunService } from '../FlowRunService';
import {
  createMockFlow,
  createMockExecutionData,
  createMockUser,
  createMockFlowDefinition,
  createMockTrace,
} from '../../../../test-utils';

describe('FlowRunService', () => {
  let flowRunService: FlowRunService;
  let mockUser: any;
  let mockFlow: any;
  let mockExecutionData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset dynamic import mocks
    mockConnectionsService.listByFlow.mockResolvedValue([]);
    mockFlowValidator.validate.mockResolvedValue([]);
    
    flowRunService = new FlowRunService();
    mockUser = createMockUser();
    mockFlow = createMockFlow();
    mockExecutionData = createMockExecutionData();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockContainerPoolInstance.initialize.mockResolvedValue(undefined);

      await flowRunService.initialize();

      expect(mockContainerPoolInstance.initialize).toHaveBeenCalledTimes(1);
      expect(flowRunService.getStatus().initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockContainerPoolInstance.initialize.mockResolvedValue(undefined);

      await flowRunService.initialize();
      await flowRunService.initialize();

      expect(mockContainerPoolInstance.initialize).toHaveBeenCalledTimes(1);
    });

    it('should shutdown successfully', async () => {
      mockContainerPoolInstance.shutdown.mockResolvedValue(undefined);
      
      await flowRunService.initialize();
      await flowRunService.shutdown();

      expect(mockContainerPoolInstance.shutdown).toHaveBeenCalledTimes(1);
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
    let executeParams: any;

    beforeEach(() => {
      executeParams = {
        flowId: 'flow-123',
        userId: mockUser.id,
        input: { message: 'test input' },
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      };

      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      mockCodeGeneratorInstance.generate.mockReturnValue({ 
        isValid: true, 
        code: '// generated code',
        errors: []
      });
      mockContainerPoolInstance.executeFlow.mockResolvedValue({
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
      expect(mockCodeGeneratorInstance.generate).toHaveBeenCalled();
      expect(mockContainerPoolInstance.executeFlow).toHaveBeenCalled();
      expect(mockTracesService.createTrace).toHaveBeenCalled();

      expect(result).toEqual({ output: 'test output' });
    });

    it('should execute flow with provided nodes and edges', async () => {
      const flowDefinition = createMockFlowDefinition();
      const paramsWithDefinition = {
        ...executeParams,
        nodes: flowDefinition.nodes,
        edges: flowDefinition.edges,
      };

      const result = await flowRunService.execute(paramsWithDefinition);

      expect(result).toEqual({ output: 'test output' });
    });

    it('should return 404 when flow not found and no nodes/edges provided', async () => {
      mockFlowService.getFlowById.mockResolvedValue(null);

      await expect(flowRunService.execute(executeParams)).rejects.toThrow('Flow not found');
    });

    it('should handle validation errors', async () => {
      // Mock validation to return errors
      mockFlowValidator.validate.mockResolvedValue([
        { nodeId: 'test-node', message: 'Test validation error' }
      ]);

      await expect(flowRunService.execute(executeParams)).rejects.toThrow('Flow validation failed');
    });

    it('should handle container executor timeout', async () => {
      mockContainerPoolInstance.executeFlow.mockRejectedValue(new Error('Container timeout'));

      await expect(flowRunService.execute(executeParams)).rejects.toThrow('Container timeout');
    });

    it('should handle flow generation errors', async () => {
      mockCodeGeneratorInstance.generate.mockReturnValue({
        isValid: false,
        code: '',
        errors: ['Code generation failed']
      });

      await expect(flowRunService.execute(executeParams)).rejects.toThrow('Code generation failed');
    });
  });

  describe('streaming execution', () => {
    let streamParams: any;

    beforeEach(() => {
      streamParams = {
        flowId: 'flow-123',
        userId: mockUser.id,
        input: { message: 'test input' },
        stream: true,
      };

      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      mockCodeGeneratorInstance.generate.mockReturnValue({ 
        isValid: true, 
        code: '// generated code',
        errors: []
      });
    });

    it('should handle streaming execution', async () => {
      const result = await flowRunService.execute(streamParams);

      // Streaming execution returns an async generator, not a direct result
      expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });
  });
});