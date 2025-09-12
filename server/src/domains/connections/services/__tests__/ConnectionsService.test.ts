import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create mock database object first
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
};

// Mock the database connection before importing ConnectionsService
jest.mock('../../../../infrastructure/database/connection', () => ({
  db: mockDb,
}));

// Now import after mocking
import { ConnectionsService } from '../ConnectionsService';
import {
  resetDbMocks,
  createMockConnection,
  createMockUser,
} from '../../../../test-utils';

describe('ConnectionsService', () => {
  let connectionsService: ConnectionsService;
  let mockUser: any;
  let mockConnection: any;

  beforeEach(() => {
    resetDbMocks();
    connectionsService = new ConnectionsService();
    mockUser = createMockUser();
    mockConnection = createMockConnection();
  });

  describe('listByFlow', () => {
    const flowId = 'flow-123';

    it('should return connections for a flow', async () => {
      const mockConnections = [mockConnection, createMockConnection()];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockConnections),
        }),
      });

      const result = await connectionsService.listByFlow(flowId);

      expect(result).toEqual(mockConnections);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array when no connections found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await connectionsService.listByFlow(flowId);

      expect(result).toEqual([]);
    });

    it('should filter connections by flowId', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockConnection]),
        }),
      });

      await connectionsService.listByFlow(flowId);

      const mockSelectResult = mockDb.select();
      const mockFromResult = mockSelectResult.from();
      expect(mockFromResult.where).toHaveBeenCalled();
    });
  });

  describe('createForFlow', () => {
    const flowId = 'flow-123';
    const connectionInput = {
      name: 'OpenAI Connection',
      provider: 'openai',
      apiKey: 'sk-test123',
      isActive: true,
    };

    it('should create connection successfully with all fields', async () => {
      const createdConnection = { ...mockConnection, ...connectionInput };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdConnection]),
        }),
      });

      const result = await connectionsService.createForFlow(flowId, mockUser.id, connectionInput);

      expect(result).toEqual(createdConnection);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should create connection with default isActive=true when not specified', async () => {
      const inputWithoutActive = {
        name: 'Test Connection',
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
      };
      
      const expectedConnection = { ...mockConnection, ...inputWithoutActive, isActive: true };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([expectedConnection]),
        }),
      });

      const result = await connectionsService.createForFlow(flowId, mockUser.id, inputWithoutActive);

      expect(result.isActive).toBe(true);
    });

    it('should generate a unique connection ID', async () => {
      // Mock Date.now and Math.random for predictable ID generation
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.123456);
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...mockConnection, id: 'conn_1234567890_4fzyo2' }]),
        }),
      });

      await connectionsService.createForFlow(flowId, mockUser.id, connectionInput);

      expect(mockDateNow).toHaveBeenCalled();
      expect(mockMathRandom).toHaveBeenCalled();

      mockDateNow.mockRestore();
      mockMathRandom.mockRestore();
    });

    it('should handle database insertion errors', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        connectionsService.createForFlow(flowId, mockUser.id, connectionInput)
      ).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const connectionId = 'conn-123';
    const updateData = {
      name: 'Updated Connection',
      apiKey: 'sk-updated123',
      isActive: false,
    };

    it('should update connection successfully', async () => {
      const updatedConnection = { ...mockConnection, ...updateData };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([updatedConnection]),
          }),
        }),
      });

      const result = await connectionsService.update(connectionId, mockUser.id, updateData);

      expect(result).toEqual(updatedConnection);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should update updatedAt timestamp', async () => {
      const mockSetFn = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      mockDb.update.mockReturnValue({
        set: mockSetFn,
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConnection]),
          }),
        }),
      });

      await connectionsService.update(connectionId, mockUser.id, updateData);

      // Verify that set was called with updateData and updatedAt
      expect(mockSetFn).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateData,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'New Name Only' };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ ...mockConnection, name: 'New Name Only' }]),
          }),
        }),
      });

      const result = await connectionsService.update(connectionId, mockUser.id, partialUpdate);

      expect(result.name).toBe('New Name Only');
    });
  });

  describe('delete', () => {
    const connectionId = 'conn-123';

    it('should delete connection successfully', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await connectionsService.delete(connectionId);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle database deletion errors', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(connectionsService.delete(connectionId)).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    const connectionId = 'conn-123';

    it('should return connection by ID', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConnection]),
          }),
        }),
      });

      const result = await connectionsService.getById(connectionId);

      expect(result).toEqual(mockConnection);
    });

    it('should return null when connection not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await connectionsService.getById(connectionId);

      expect(result).toBeNull();
    });

    it('should limit result to 1 record', async () => {
      const mockLimit = jest.fn().mockResolvedValue([mockConnection]);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      await connectionsService.getById(connectionId);

      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });
});