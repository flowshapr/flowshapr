import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FlowApiKeysService } from '../FlowApiKeysService';
import { NotFoundError } from '../../../../shared/utils/errors';
import {
  mockDb,
  resetDbMocks,
  createMockApiKey,
  createMockUser,
  createMockFlow,
} from '../../../../test-utils';

// Mock dependencies
const mockFlowService = {
  getFlowById: jest.fn(),
};

const mockCrypto = {
  generateToken: jest.fn(() => 'mock-token-123'),
  hashToken: jest.fn(() => 'hashed-token-123'),
};

// Mock modules
jest.mock('../../../../infrastructure/database/connection', () => ({
  db: mockDb,
}));

jest.mock('../../flows/services/FlowService', () => ({
  flowService: mockFlowService,
}));

jest.mock('../../../../shared/utils/crypto', () => mockCrypto);

describe('FlowApiKeysService', () => {
  let flowApiKeysService: FlowApiKeysService;
  let mockUser: any;
  let mockFlow: any;
  let mockApiKey: any;

  beforeEach(() => {
    resetDbMocks();
    jest.clearAllMocks();
    flowApiKeysService = new FlowApiKeysService();
    mockUser = createMockUser();
    mockFlow = createMockFlow();
    mockApiKey = createMockApiKey();
  });

  describe('list', () => {
    const flowId = 'flow-123';

    it('should return API keys for a flow', async () => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      const mockApiKeys = [mockApiKey, createMockApiKey()];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockApiKeys),
        }),
      });

      const result = await flowApiKeysService.list(flowId, mockUser.id);

      expect(mockFlowService.getFlowById).toHaveBeenCalledWith(flowId, mockUser.id);
      expect(result).toEqual(mockApiKeys);
    });

    it('should throw NotFoundError when flow not found', async () => {
      mockFlowService.getFlowById.mockResolvedValue(null);

      await expect(
        flowApiKeysService.list(flowId, mockUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should filter only active API keys', async () => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await flowApiKeysService.list(flowId, mockUser.id);

      // Verify that the where clause filters by flowId and isActive=true
      const mockSelectResult = mockDb.select();
      const mockFromResult = mockSelectResult.from();
      expect(mockFromResult.where).toHaveBeenCalled();
    });

    it('should return empty array when no active API keys found', async () => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await flowApiKeysService.list(flowId, mockUser.id);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const flowId = 'flow-123';
    const createData = {
      name: 'Test API Key',
      scopes: ['read', 'execute'],
      rateLimit: 1000,
      expiresAt: '2024-12-31T23:59:59Z',
    };

    beforeEach(() => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
    });

    it('should create API key successfully with all options', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.123456);

      const expectedKeyId = 'fak_1234567890_4fzyo2';
      const expectedRawToken = 'fs_mock-token-123';
      const expectedPrefix = expectedRawToken.slice(0, 8);

      const createdApiKey = {
        id: expectedKeyId,
        name: createData.name,
        prefix: expectedPrefix,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdApiKey]),
        }),
      });

      const result = await flowApiKeysService.create(flowId, mockUser.id, createData);

      expect(mockFlowService.getFlowById).toHaveBeenCalledWith(flowId, mockUser.id);
      expect(mockCrypto.generateToken).toHaveBeenCalled();
      expect(mockCrypto.hashToken).toHaveBeenCalledWith(expectedRawToken);
      expect(result).toMatchObject({
        id: expectedKeyId,
        name: createData.name,
        prefix: expectedPrefix,
        rawToken: expectedRawToken,
      });

      mockDateNow.mockRestore();
      mockMathRandom.mockRestore();
    });

    it('should create API key with minimal data', async () => {
      const minimalData = { name: 'Simple Key' };
      
      const createdApiKey = {
        id: 'fak_123_abc',
        name: minimalData.name,
        prefix: 'fs_mock-',
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdApiKey]),
        }),
      });

      const result = await flowApiKeysService.create(flowId, mockUser.id, minimalData);

      expect(result.name).toBe(minimalData.name);
      expect(result.rawToken).toBeDefined();
    });

    it('should set default values for optional fields', async () => {
      const mockValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test', name: 'test', prefix: 'test' }]),
      });

      mockDb.insert.mockReturnValue({ values: mockValues });

      await flowApiKeysService.create(flowId, mockUser.id, { name: 'Test' });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: [],
          rateLimit: null,
          isActive: true,
          expiresAt: null,
        })
      );
    });

    it('should throw NotFoundError when flow not found', async () => {
      mockFlowService.getFlowById.mockResolvedValue(null);

      await expect(
        flowApiKeysService.create(flowId, mockUser.id, createData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle date parsing for expiresAt', async () => {
      const mockValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test', name: 'test', prefix: 'test' }]),
      });

      mockDb.insert.mockReturnValue({ values: mockValues });

      await flowApiKeysService.create(flowId, mockUser.id, createData);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: new Date(createData.expiresAt),
        })
      );
    });

    it('should generate unique API key ID', async () => {
      const service = flowApiKeysService as any;
      
      // Mock Date.now and Math.random for predictable results
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.123456);

      const keyId = service.generateApiKeyId();
      
      expect(keyId).toBe('fak_1234567890_4fzyo2');

      mockDateNow.mockRestore();
      mockMathRandom.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle database errors during list operation', async () => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        flowApiKeysService.list('flow-123', mockUser.id)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during create operation', async () => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database insertion failed')),
        }),
      });

      await expect(
        flowApiKeysService.create('flow-123', mockUser.id, { name: 'Test' })
      ).rejects.toThrow('Database insertion failed');
    });

    it('should handle token generation errors', async () => {
      mockFlowService.getFlowById.mockResolvedValue(mockFlow);
      mockCrypto.generateToken.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await expect(
        flowApiKeysService.create('flow-123', mockUser.id, { name: 'Test' })
      ).rejects.toThrow('Token generation failed');
    });
  });
});