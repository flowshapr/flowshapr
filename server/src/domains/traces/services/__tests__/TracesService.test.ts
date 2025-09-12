import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create mock database object first
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
};

// Mock the database connection before importing TracesService
jest.mock('../../../../infrastructure/database/connection', () => ({
  db: mockDb,
}));

// Now import after mocking
import { TracesService } from '../TracesService';
import {
  resetDbMocks,
  createMockTrace,
  createMockUser,
} from '../../../../test-utils';

describe('TracesService', () => {
  let tracesService: TracesService;
  let mockUser: any;
  let mockTrace: any;

  beforeEach(() => {
    resetDbMocks();
    tracesService = new TracesService();
    mockUser = createMockUser();
    mockTrace = createMockTrace();
  });

  describe('listByFlow', () => {
    const flowId = 'flow-123';

    it('should return traces for a flow ordered by creation date', async () => {
      const mockTraces = [
        createMockTrace({ createdAt: new Date('2023-01-02') }),
        createMockTrace({ createdAt: new Date('2023-01-01') }),
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockTraces),
          }),
        }),
      });

      const result = await tracesService.listByFlow(flowId);

      expect(result).toEqual(mockTraces);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array when no traces found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await tracesService.listByFlow(flowId);

      expect(result).toEqual([]);
    });

    it('should filter traces by flowId correctly', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([mockTrace]),
          }),
        }),
      });

      await tracesService.listByFlow(flowId);

      // Verify that the where clause was called (which would filter by flowId)
      const mockSelectResult = mockDb.select();
      const mockFromResult = mockSelectResult.from();
      expect(mockFromResult.where).toHaveBeenCalled();
    });
  });

  describe('getByExecutionId', () => {
    const executionId = 'exec-123';

    it('should return trace by execution ID', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTrace]),
          }),
        }),
      });

      const result = await tracesService.getByExecutionId(executionId);

      expect(result).toEqual(mockTrace);
    });

    it('should return null when trace not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await tracesService.getByExecutionId(executionId);

      expect(result).toBeNull();
    });

    it('should limit result to 1 record', async () => {
      const mockLimit = jest.fn().mockResolvedValue([mockTrace]);
      
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      await tracesService.getByExecutionId(executionId);

      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  describe('createTrace', () => {
    const getCreateTraceInput = () => ({
      executionId: 'exec-123',
      flowId: 'flow-123',
      status: 'completed' as const,
      input: { message: 'test input' },
      output: { result: 'test output' },
      nodeTraces: [{ nodeId: 'node-1', result: 'success' }],
      duration: 1000,
      errorMessage: null,
      version: '1.0.0',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      executedBy: mockUser.id,
    });

    it('should create trace successfully with all fields', async () => {
      const createTraceInput = getCreateTraceInput();
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await tracesService.createTrace(createTraceInput);

      expect(result).toMatchObject({
        id: createTraceInput.executionId,
        executionId: createTraceInput.executionId,
        flowId: createTraceInput.flowId,
        status: createTraceInput.status,
        input: createTraceInput.input,
        output: createTraceInput.output,
        nodeTraces: createTraceInput.nodeTraces,
        duration: createTraceInput.duration,
        userAgent: createTraceInput.userAgent,
        ipAddress: createTraceInput.ipAddress,
        executedBy: createTraceInput.executedBy,
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should create trace with minimal required fields', async () => {
      const minimalInput = {
        executionId: 'exec-minimal',
        flowId: 'flow-123',
        status: 'running' as const,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await tracesService.createTrace(minimalInput);

      expect(result).toMatchObject({
        id: minimalInput.executionId,
        executionId: minimalInput.executionId,
        flowId: minimalInput.flowId,
        status: minimalInput.status,
        input: null,
        output: null,
        nodeTraces: [],
        duration: null,
        errorMessage: null,
        version: null,
        userAgent: null,
        ipAddress: null,
        executedBy: null,
      });
    });

    it('should handle failed trace creation', async () => {
      const failedTraceInput = {
        ...getCreateTraceInput(),
        status: 'failed' as const,
        errorMessage: 'Execution failed',
        output: null,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await tracesService.createTrace(failedTraceInput);

      expect(result).toMatchObject({
        status: 'failed',
        errorMessage: 'Execution failed',
        output: null,
      });
    });

    it('should handle database insertion errors', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(
        tracesService.createTrace(getCreateTraceInput())
      ).rejects.toThrow('Database error');
    });

    it('should set default values for optional fields', async () => {
      const inputWithoutOptionals = {
        executionId: 'exec-defaults',
        flowId: 'flow-123',
        status: 'completed' as const,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await tracesService.createTrace(inputWithoutOptionals);

      expect(result.nodeTraces).toEqual([]);
      expect(result.input).toBeNull();
      expect(result.output).toBeNull();
      expect(result.duration).toBeNull();
      expect(result.errorMessage).toBeNull();
      expect(result.version).toBeNull();
      expect(result.userAgent).toBeNull();
      expect(result.ipAddress).toBeNull();
      expect(result.executedBy).toBeNull();
    });
  });
});