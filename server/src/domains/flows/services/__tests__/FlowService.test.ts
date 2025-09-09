import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConflictError, NotFoundError } from '../../../../shared/utils/errors';

// Create mock database object
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
};

// Mock the database connection before any imports
jest.mock('../../../../infrastructure/database/connection', () => ({
  db: mockDb,
}));

// Mock the crypto utils
jest.mock('../../../../shared/utils/crypto', () => ({
  generateId: jest.fn(() => 'mock-id'),
  generateSlug: jest.fn(() => 'mock-slug'),
}));

// Now import the service and utilities
import { FlowService } from '../FlowService';
import {
  createMockFlow,
  createMockFlowDefinition,
  createMockUser,
  createMockDbError,
} from '../../../../test-utils';

describe('FlowService', () => {
  let flowService: FlowService;
  let mockUser: any;
  let mockFlow: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.delete.mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    mockDb.transaction.mockImplementation((callback) => callback(mockDb));

    flowService = new FlowService();
    mockUser = createMockUser();
    mockFlow = createMockFlow();
  });

  describe('createFlow', () => {
    const validFlowData = {
      name: 'Test Flow',
      alias: 'test-flow',
      description: 'A test flow',
      organizationId: 'org-123',
      teamId: 'team-123',
    };

    it('should create a new flow successfully', async () => {
      // Mock no existing alias
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock successful insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await flowService.createFlow(validFlowData, mockUser.id);

      expect(result).toMatchObject({
        name: validFlowData.name,
        alias: validFlowData.alias,
        description: validFlowData.description,
        organizationId: validFlowData.organizationId,
        status: 'draft',
        version: '1.0.0',
        isLatest: true,
        nodes: [],
        edges: [],
      });
    });

    it('should throw ConflictError when alias already exists', async () => {
      // Mock existing alias found
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFlow]),
          }),
        }),
      });

      await expect(
        flowService.createFlow(validFlowData, mockUser.id)
      ).rejects.toThrow(ConflictError);
    });

    it('should handle database constraint violation', async () => {
      // Mock no existing alias
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock database constraint violation
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(createMockDbError('23505', 'Unique constraint violation')),
      });

      await expect(
        flowService.createFlow(validFlowData, mockUser.id)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw error when database is not available', async () => {
      // Mock db as null
      jest.doMock('../../../../infrastructure/database/connection', () => ({
        db: null,
      }));

      await expect(
        flowService.createFlow(validFlowData, mockUser.id)
      ).rejects.toThrow('Database connection not available');
    });
  });

  describe('getFlowById', () => {
    it('should return flow when found', async () => {
      const flowWithMembers = {
        ...mockFlow,
        members: [{ userId: mockUser.id, role: 'owner' }],
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([flowWithMembers]),
            }),
          }),
        }),
      });

      const result = await flowService.getFlowById(mockFlow.id, mockUser.id);

      expect(result).toMatchObject({
        id: mockFlow.id,
        name: mockFlow.name,
        memberRole: 'owner',
      });
    });

    it('should throw NotFoundError when flow not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(
        flowService.getFlowById('non-existent-id', mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should set member role as none when user is not a member', async () => {
      const flowWithoutMembership = {
        ...mockFlow,
        members: [],
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([flowWithoutMembership]),
            }),
          }),
        }),
      });

      const result = await flowService.getFlowById(mockFlow.id, mockUser.id);

      expect(result.memberRole).toBe('none');
    });
  });

  describe('getFlowByAlias', () => {
    it('should return flow when found by alias', async () => {
      const flowWithMembers = {
        ...mockFlow,
        members: [{ userId: mockUser.id, role: 'editor' }],
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([flowWithMembers]),
            }),
          }),
        }),
      });

      const result = await flowService.getFlowByAlias(mockFlow.alias, mockFlow.organizationId, mockUser.id);

      expect(result).toMatchObject({
        alias: mockFlow.alias,
        memberRole: 'editor',
      });
    });

    it('should throw NotFoundError when flow not found by alias', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(
        flowService.getFlowByAlias('non-existent-alias', mockFlow.organizationId, mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateFlow', () => {
    const updateData = {
      name: 'Updated Flow',
      description: 'Updated description',
    };

    it('should update flow successfully', async () => {
      // Mock flow exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFlow]),
          }),
        }),
      });

      // Mock successful update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...mockFlow, ...updateData }]),
          }),
        }),
      });

      const result = await flowService.updateFlow(mockFlow.id, updateData, mockUser.id);

      expect(result).toMatchObject({
        name: updateData.name,
        description: updateData.description,
      });
    });

    it('should throw NotFoundError when flow does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        flowService.updateFlow('non-existent-id', updateData, mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteFlow', () => {
    it('should delete flow successfully', async () => {
      // Mock flow exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFlow]),
          }),
        }),
      });

      // Mock successful delete
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await expect(
        flowService.deleteFlow(mockFlow.id, mockUser.id)
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundError when flow does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        flowService.deleteFlow('non-existent-id', mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('saveFlowDefinition', () => {
    const flowDefinition = createMockFlowDefinition();

    it('should save flow definition successfully', async () => {
      // Mock flow exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFlow]),
          }),
        }),
      });

      // Mock successful update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...mockFlow, nodes: flowDefinition.nodes, edges: flowDefinition.edges }]),
          }),
        }),
      });

      const result = await flowService.saveFlowDefinition(mockFlow.id, flowDefinition, mockUser.id);

      expect(result).toMatchObject({
        nodes: flowDefinition.nodes,
        edges: flowDefinition.edges,
      });
    });

    it('should throw NotFoundError when flow does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        flowService.saveFlowDefinition('non-existent-id', flowDefinition, mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserFlows', () => {
    it('should return user flows with pagination', async () => {
      const mockFlows = [mockFlow, createMockFlow()];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockFlows),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await flowService.getUserFlows(mockUser.id, { page: 1, limit: 10 });

      expect(result.flows).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter flows by search term', async () => {
      const searchTerm = 'test';
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([mockFlow]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await flowService.getUserFlows(mockUser.id, { search: searchTerm });

      expect(result.flows).toHaveLength(1);
    });
  });

  describe('publishFlow', () => {
    it('should publish flow successfully', async () => {
      // Mock flow exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFlow]),
          }),
        }),
      });

      // Mock transaction
      mockDb.transaction.mockImplementation((callback) => 
        callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        })
      );

      await expect(
        flowService.publishFlow(mockFlow.id, { version: '1.1.0' }, mockUser.id)
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundError when flow does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        flowService.publishFlow('non-existent-id', { version: '1.1.0' }, mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });
});