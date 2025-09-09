import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PromptsService } from '../PromptsService';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../shared/utils/errors';

// Mock the services
jest.mock('../../../../infrastructure/database/connection');
jest.mock('../../../../shared/authorization/service-guard');

describe('PromptsService', () => {
  let promptsService: PromptsService;
  let mockUser: any;
  let mockPrompt: any;
  let mockDb: any;
  let mockRequireUserAbility: jest.Mock;

  beforeEach(() => {
    // Set up database mock
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    
    // Set up auth mock
    mockRequireUserAbility = jest.fn().mockResolvedValue(true);
    
    // Mock implementations
    require('../../../../infrastructure/database/connection').db = mockDb;
    require('../../../../shared/authorization/service-guard').requireUserAbility = mockRequireUserAbility;
    
    promptsService = new PromptsService();
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    mockPrompt = {
      id: 'prompt-123',
      name: 'Test Prompt',
      description: 'A test prompt',
      template: 'Hello {{name}}',
      variables: ['name'],
      metadata: {},
      flowId: 'flow-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
    };
  });

  describe('listByFlow', () => {
    const flowId = 'flow-123';

    it('should return prompts for flow with authorization', async () => {
      const mockPrompts = [mockPrompt, { ...mockPrompt, id: 'prompt-456' }];
      
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockPrompts),
        }),
      });

      const result = await promptsService.listByFlow(flowId, mockUser.id);

      expect(mockRequireUserAbility).toHaveBeenCalledWith(
        mockUser.id,
        'read',
        'Flow',
        { id: flowId }
      );
      expect(result).toEqual(mockPrompts);
    });

    it('should return prompts for flow without authorization check when no userId', async () => {
      const mockPrompts = [mockPrompt];
      
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockPrompts),
        }),
      });

      const result = await promptsService.listByFlow(flowId);

      expect(mockRequireUserAbility).not.toHaveBeenCalled();
      expect(result).toEqual(mockPrompts);
    });

    it('should throw ForbiddenError when user lacks permissions', async () => {
      mockRequireUserAbility.mockRejectedValue(new ForbiddenError('Insufficient permissions'));

      await expect(
        promptsService.listByFlow(flowId, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('createForFlow', () => {
    const flowId = 'flow-123';
    const createPromptData = {
      name: 'Test Prompt',
      description: 'A test prompt',
      template: 'Hello {{name}}',
      variables: ['name'],
      metadata: { version: 1 },
    };

    it('should create prompt successfully', async () => {
      const createdPrompt = { ...mockPrompt, ...createPromptData };
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdPrompt]),
        }),
      });

      const result = await promptsService.createForFlow(flowId, createPromptData, mockUser.id);

      expect(mockRequireUserAbility).toHaveBeenCalledWith(
        mockUser.id,
        'update',
        'Flow',
        { id: flowId }
      );
      expect(result).toEqual(createdPrompt);
    });

    it('should throw ValidationError for empty name', async () => {
      const invalidData = { ...createPromptData, name: '' };

      await expect(
        promptsService.createForFlow(flowId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt name is required');
    });

    it('should throw ValidationError for empty template', async () => {
      const invalidData = { ...createPromptData, template: '' };

      await expect(
        promptsService.createForFlow(flowId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt template is required');
    });

    it('should throw ValidationError for whitespace-only name', async () => {
      const invalidData = { ...createPromptData, name: '   ' };

      await expect(
        promptsService.createForFlow(flowId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt name is required');
    });

    it('should handle unique constraint violation (23505)', async () => {
      const dbError = { code: '23505' };
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(dbError),
        }),
      });

      await expect(
        promptsService.createForFlow(flowId, createPromptData, mockUser.id)
      ).rejects.toThrow('A prompt with this name already exists in the flow');
    });

    it('should handle foreign key constraint violation (23503)', async () => {
      const dbError = { code: '23503' };
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(dbError),
        }),
      });

      await expect(
        promptsService.createForFlow(flowId, createPromptData, mockUser.id)
      ).rejects.toThrow('Flow not found or access denied');
    });

    it('should throw ForbiddenError when user lacks update permissions', async () => {
      mockRequireUserAbility.mockRejectedValue(new ForbiddenError('Insufficient permissions'));

      await expect(
        promptsService.createForFlow(flowId, createPromptData, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateForFlow', () => {
    const flowId = 'flow-123';
    const promptId = 'prompt-123';
    const updateData = {
      name: 'Updated Prompt',
      template: 'Updated {{name}}',
    };

    beforeEach(() => {
      // Reset mocks for each test
      mockDb.select.mockClear();
      mockDb.update.mockClear();
    });

    it('should update prompt successfully', async () => {
      const updatedPrompt = { ...mockPrompt, ...updateData };
      
      // Mock prompt exists check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPrompt]),
          }),
        }),
      });
      
      // Mock update operation
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });
      
      // Mock selecting updated prompt
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([updatedPrompt]),
          }),
        }),
      });

      const result = await promptsService.updateForFlow(flowId, promptId, updateData, mockUser.id);

      expect(mockRequireUserAbility).toHaveBeenCalledWith(
        mockUser.id,
        'update',
        'Flow',
        { id: flowId }
      );
      expect(result).toEqual(updatedPrompt);
    });

    it('should throw ValidationError for empty name', async () => {
      const invalidData = { name: '' };

      // Mock prompt exists check
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPrompt]),
          }),
        }),
      });

      await expect(
        promptsService.updateForFlow(flowId, promptId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt name cannot be empty');
    });

    it('should throw ValidationError for whitespace-only name', async () => {
      const invalidData = { name: '   ' };

      await expect(
        promptsService.updateForFlow(flowId, promptId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt name cannot be empty');
    });

    it('should throw ValidationError for empty template', async () => {
      const invalidData = { template: '' };

      // Mock prompt exists check
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPrompt]),
          }),
        }),
      });

      await expect(
        promptsService.updateForFlow(flowId, promptId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt template cannot be empty');
    });

    it('should throw ValidationError for whitespace-only template', async () => {
      const invalidData = { template: '   ' };

      await expect(
        promptsService.updateForFlow(flowId, promptId, invalidData, mockUser.id)
      ).rejects.toThrow('Prompt template cannot be empty');
    });

    it('should throw ValidationError for missing promptId', async () => {
      await expect(
        promptsService.updateForFlow(flowId, '', updateData, mockUser.id)
      ).rejects.toThrow('Prompt ID is required');
    });

    it('should throw NotFoundError when prompt does not exist', async () => {
      // Mock prompt does not exist
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        promptsService.updateForFlow(flowId, promptId, updateData, mockUser.id)
      ).rejects.toThrow('Prompt not found in this flow');
    });

    it('should handle unique constraint violation (23505)', async () => {
      const dbError = { code: '23505' };
      
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(dbError),
        }),
      });

      await expect(
        promptsService.updateForFlow(flowId, promptId, updateData, mockUser.id)
      ).rejects.toThrow('A prompt with this name already exists in the flow');
    });

    it('should throw ForbiddenError when user lacks update permissions', async () => {
      mockRequireUserAbility.mockRejectedValue(new ForbiddenError('Insufficient permissions'));

      await expect(
        promptsService.updateForFlow(flowId, promptId, updateData, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteForFlow', () => {
    const flowId = 'flow-123';
    const promptId = 'prompt-123';

    it('should delete prompt successfully', async () => {
      // Mock prompt exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPrompt]),
          }),
        }),
      });

      // Mock successful delete
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ affectedRows: 1 }),
      });

      await promptsService.deleteForFlow(flowId, promptId, mockUser.id);

      expect(mockRequireUserAbility).toHaveBeenCalledWith(
        mockUser.id,
        'update',
        'Flow',
        { id: flowId }
      );
    });

    it('should throw ValidationError for missing promptId', async () => {
      await expect(
        promptsService.deleteForFlow(flowId, '', mockUser.id)
      ).rejects.toThrow('Prompt ID is required');
    });

    it('should throw NotFoundError when prompt does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        promptsService.deleteForFlow(flowId, promptId, mockUser.id)
      ).rejects.toThrow('Prompt not found in this flow');
    });

    it('should throw ForbiddenError when user lacks update permissions', async () => {
      mockRequireUserAbility.mockRejectedValue(new ForbiddenError('Insufficient permissions'));

      await expect(
        promptsService.deleteForFlow(flowId, promptId, mockUser.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getById', () => {
    const promptId = 'prompt-123';

    it('should return prompt by ID', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPrompt]),
          }),
        }),
      });

      const result = await promptsService.getById(promptId);

      expect(result).toEqual(mockPrompt);
    });

    it('should return null when prompt not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await promptsService.getById(promptId);

      expect(result).toBeNull();
    });
  });
});