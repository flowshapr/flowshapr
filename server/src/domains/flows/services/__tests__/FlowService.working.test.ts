import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConflictError, NotFoundError, ForbiddenError } from '../../../../shared/utils/errors';

// Create mock database object with proper query builder pattern
const createMockQueryBuilder = () => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
});

const mockDb = {
  select: jest.fn(() => createMockQueryBuilder()),
  insert: jest.fn(() => createMockQueryBuilder()),
  update: jest.fn(() => createMockQueryBuilder()),
  delete: jest.fn(() => createMockQueryBuilder()),
  transaction: jest.fn(),
};

// Mock the database connection before any imports
jest.mock('../../../../infrastructure/database/connection', () => ({
  db: mockDb,
}));

// Mock the crypto utils
jest.mock('../../../../shared/utils/crypto', () => ({
  generateId: jest.fn(() => 'test-id-123'),
  generateSlug: jest.fn(() => 'test-slug'),
}));

// Now import the service
import { FlowService } from '../FlowService';

describe('FlowService - Working Tests', () => {
  let flowService: FlowService;
  let mockUser: any;
  let mockFlow: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock behaviors
    mockDb.select.mockReturnValue(createMockQueryBuilder());
    mockDb.insert.mockReturnValue(createMockQueryBuilder());
    mockDb.update.mockReturnValue(createMockQueryBuilder());
    mockDb.delete.mockReturnValue(createMockQueryBuilder());

    flowService = new FlowService();
    
    mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      organizationId: 'org-123',
    };

    mockFlow = {
      id: 'flow-123',
      name: 'Test Flow',
      alias: 'test-flow',
      description: 'Test Description',
      organizationId: 'org-123',
      memberRole: 'owner',
      status: 'draft',
      version: '1.0.0',
      nodes: [],
      edges: [],
    };
  });

  describe('createFlow', () => {
    const validFlowData = {
      name: 'New Flow',
      alias: 'new-flow',
      description: 'A new flow',
      organizationId: 'org-123',
      teamId: 'team-123',
    };

    it('should create a new flow successfully', async () => {
      // Mock no existing alias
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Mock successful insert  
      const insertQueryBuilder = createMockQueryBuilder();
      insertQueryBuilder.values = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue(insertQueryBuilder);

      const result = await flowService.createFlow(validFlowData, mockUser.id);

      expect(result).toMatchObject({
        name: validFlowData.name,
        alias: validFlowData.alias,
        description: validFlowData.description,
        organizationId: validFlowData.organizationId,
        status: 'draft',
        version: '1.0.0',
        isLatest: true,
      });
    });

    it('should throw ConflictError when alias already exists', async () => {
      // Mock existing alias found
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([mockFlow]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await expect(
        flowService.createFlow(validFlowData, mockUser.id)
      ).rejects.toThrow(ConflictError);
    });

    it('should handle database constraint violation', async () => {
      // Mock no existing alias
      const selectQueryBuilder = createMockQueryBuilder();
      selectQueryBuilder.limit = jest.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue(selectQueryBuilder);

      // Mock database constraint violation
      const insertQueryBuilder = createMockQueryBuilder();
      insertQueryBuilder.values = jest.fn().mockRejectedValue({
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      });
      mockDb.insert.mockReturnValue(insertQueryBuilder);

      await expect(
        flowService.createFlow(validFlowData, mockUser.id)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getFlowById', () => {
    it('should return flow when found', async () => {
      const flowWithMember = {
        ...mockFlow,
        'flow_members.role': 'owner'
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([flowWithMember]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await flowService.getFlowById(mockFlow.id, mockUser.id);

      expect(result).toMatchObject({
        id: mockFlow.id,
        name: mockFlow.name,
        memberRole: 'owner',
      });
    });

    it('should throw NotFoundError when flow not found', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await expect(
        flowService.getFlowById('non-existent-id', mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateFlow', () => {
    const updateData = {
      name: 'Updated Flow',
      description: 'Updated description',
    };

    it('should update flow successfully when user is owner', async () => {
      // Mock flow exists with owner role
      const selectQueryBuilder = createMockQueryBuilder();
      selectQueryBuilder.limit = jest.fn().mockResolvedValue([{
        ...mockFlow,
        memberRole: 'owner'
      }]);
      mockDb.select.mockReturnValue(selectQueryBuilder);

      // Mock successful update
      const updateQueryBuilder = createMockQueryBuilder();
      updateQueryBuilder.returning = jest.fn().mockResolvedValue([{
        ...mockFlow,
        ...updateData
      }]);
      mockDb.update.mockReturnValue(updateQueryBuilder);

      const result = await flowService.updateFlow(mockFlow.id, updateData, mockUser.id);

      expect(result).toMatchObject({
        name: updateData.name,
        description: updateData.description,
      });
    });

    it('should throw ForbiddenError when user lacks permissions', async () => {
      // Mock flow exists with viewer role
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([{
        ...mockFlow,
        memberRole: 'viewer'
      }]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await expect(
        flowService.updateFlow(mockFlow.id, updateData, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteFlow', () => {
    it('should delete flow successfully when user is owner', async () => {
      // Mock flow exists with owner role
      const selectQueryBuilder = createMockQueryBuilder();
      selectQueryBuilder.limit = jest.fn().mockResolvedValue([{
        ...mockFlow,
        memberRole: 'owner'
      }]);
      mockDb.select.mockReturnValue(selectQueryBuilder);

      // Mock successful delete
      const deleteQueryBuilder = createMockQueryBuilder();
      deleteQueryBuilder.where = jest.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue(deleteQueryBuilder);

      await expect(
        flowService.deleteFlow(mockFlow.id, mockUser.id)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user is not owner', async () => {
      // Mock flow exists with admin role (not owner)
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([{
        ...mockFlow,
        memberRole: 'admin'
      }]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await expect(
        flowService.deleteFlow(mockFlow.id, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getUserFlows', () => {
    it('should return flows with default pagination', async () => {
      const mockFlows = [mockFlow, { ...mockFlow, id: 'flow-456' }];

      // Mock successful query
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.offset = jest.fn().mockResolvedValue(mockFlows);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await flowService.getUserFlows(mockUser.id);

      expect(result.flows).toEqual(mockFlows);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: mockFlows.length,
      });
    });
  });

  describe('publishFlow', () => {
    it('should publish flow when user has permission', async () => {
      // Mock flow exists with owner role
      const selectQueryBuilder = createMockQueryBuilder();
      selectQueryBuilder.limit = jest.fn().mockResolvedValue([{
        ...mockFlow,
        memberRole: 'owner'
      }]);
      mockDb.select.mockReturnValue(selectQueryBuilder);

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const txMock = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(txMock);
      });

      await expect(
        flowService.publishFlow(mockFlow.id, { version: '1.1.0' }, mockUser.id)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user lacks permission', async () => {
      // Mock flow exists with viewer role
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit = jest.fn().mockResolvedValue([{
        ...mockFlow,
        memberRole: 'viewer'
      }]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await expect(
        flowService.publishFlow(mockFlow.id, { version: '1.1.0' }, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});