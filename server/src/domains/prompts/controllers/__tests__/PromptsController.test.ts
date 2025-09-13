import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { PromptsController } from '../PromptsController';
import { promptsService } from '../../services/PromptsService';
import { flowService } from '../../../flows/services/FlowService';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../../shared/utils/errors';
import * as logger from '../../../../shared/utils/logger';

// Mock the services
jest.mock('../../services/PromptsService');
jest.mock('../../../flows/services/FlowService');

describe('PromptsController', () => {
  let controller: PromptsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockSend: jest.Mock;

  const mockUser = { id: 'user-123' };
  const mockFlow = { id: 'flow-123', name: 'Test Flow' };
  const mockPrompt = {
    id: 'prompt-123',
    name: 'Test Prompt',
    description: 'A test prompt',
    template: 'Hello {{name}}',
    variables: ['name'],
    metadata: {},
    flowId: 'flow-123',
    createdAt: new Date(),
  };

  beforeEach(() => {
    controller = new PromptsController();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();
    mockSend = jest.fn();
    
    mockResponse = {
      json: mockJson,
      status: mockStatus,
      setHeader: mockSetHeader,
      send: mockSend,
    };
    
    mockRequest = {
      params: { id: 'flow-123', promptId: 'prompt-123' },
      body: {},
      user: mockUser,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('listByFlow', () => {
    it('should return prompts successfully', async () => {
      const mockPrompts = [mockPrompt];
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.listByFlow as jest.Mock).mockResolvedValue(mockPrompts);

      await controller.listByFlow(mockRequest as Request, mockResponse as Response);

      expect(flowService.getFlowById).toHaveBeenCalledWith('flow-123', 'user-123');
      expect(promptsService.listByFlow).toHaveBeenCalledWith('flow-123', 'user-123');
      expect(mockJson).toHaveBeenCalledWith({ success: true, data: mockPrompts });
    });

    it('should return 404 when flow not found', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(null);

      await controller.listByFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Flow not found' },
      });
    });

    it('should return 500 error on service failure', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.listByFlow as jest.Mock).mockRejectedValue(new Error('Database error'));

      await controller.listByFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ 
        success: false, 
        error: { message: 'Failed to list prompts', code: 'INTERNAL_ERROR' } 
      });
    });
  });

  describe('createForFlow', () => {
    const createData = {
      name: 'New Prompt',
      template: 'Hello {{name}}',
      variables: ['name'],
    };

    beforeEach(() => {
      mockRequest.body = createData;
    });

    it('should create prompt successfully', async () => {
      const createdPrompt = { ...mockPrompt, ...createData };
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.createForFlow as jest.Mock).mockResolvedValue(createdPrompt);

      await controller.createForFlow(mockRequest as Request, mockResponse as Response);

      expect(flowService.getFlowById).toHaveBeenCalledWith('flow-123', 'user-123');
      expect(promptsService.createForFlow).toHaveBeenCalledWith('flow-123', createData, 'user-123');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({ success: true, data: createdPrompt });
    });

    it('should return 404 when flow not found', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(null);

      await controller.createForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Flow not found', code: 'FLOW_NOT_FOUND' },
      });
    });

    it('should return 400 for ValidationError', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.createForFlow as jest.Mock).mockRejectedValue(
        new ValidationError('Prompt name is required')
      );

      await controller.createForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Prompt name is required', code: 'VALIDATION_ERROR' },
      });
    });

    it('should return 404 for NotFoundError', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.createForFlow as jest.Mock).mockRejectedValue(
        new NotFoundError('Flow not found or access denied')
      );

      await controller.createForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Flow not found or access denied', code: 'NOT_FOUND' },
      });
    });

    it('should return 403 for ForbiddenError', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.createForFlow as jest.Mock).mockRejectedValue(
        new ForbiddenError('Insufficient permissions')
      );

      await controller.createForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
      });
    });

    it('should return 500 for unknown error', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.createForFlow as jest.Mock).mockRejectedValue(new Error('Database error'));

      await controller.createForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Failed to create prompt', code: 'INTERNAL_ERROR' },
      });
    });
  });

  describe('updateForFlow', () => {
    const updateData = { name: 'Updated Prompt' };

    beforeEach(() => {
      mockRequest.body = updateData;
    });

    it('should update prompt successfully', async () => {
      const updatedPrompt = { ...mockPrompt, ...updateData };
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.updateForFlow as jest.Mock).mockResolvedValue(updatedPrompt);

      await controller.updateForFlow(mockRequest as Request, mockResponse as Response);

      expect(flowService.getFlowById).toHaveBeenCalledWith('flow-123', 'user-123');
      expect(promptsService.updateForFlow).toHaveBeenCalledWith('flow-123', 'prompt-123', updateData, 'user-123');
      expect(mockJson).toHaveBeenCalledWith({ success: true, data: updatedPrompt });
    });

    it('should handle all error types correctly', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.updateForFlow as jest.Mock).mockRejectedValue(
        new ValidationError('Prompt name cannot be empty')
      );

      await controller.updateForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Prompt name cannot be empty', code: 'VALIDATION_ERROR' },
      });
    });
  });

  describe('deleteForFlow', () => {
    it('should delete prompt successfully', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.deleteForFlow as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteForFlow(mockRequest as Request, mockResponse as Response);

      expect(flowService.getFlowById).toHaveBeenCalledWith('flow-123', 'user-123');
      expect(promptsService.deleteForFlow).toHaveBeenCalledWith('flow-123', 'prompt-123', 'user-123');
      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });

    it('should handle all error types correctly', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.deleteForFlow as jest.Mock).mockRejectedValue(
        new NotFoundError('Prompt not found in this flow')
      );

      await controller.deleteForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Prompt not found in this flow', code: 'NOT_FOUND' },
      });
    });
  });

  describe('exportForFlow', () => {
    it('should export prompt successfully', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.getById as jest.Mock).mockResolvedValue(mockPrompt);

      await controller.exportForFlow(mockRequest as Request, mockResponse as Response);

      expect(flowService.getFlowById).toHaveBeenCalledWith('flow-123', 'user-123');
      expect(promptsService.getById).toHaveBeenCalledWith('prompt-123');
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="Test Prompt.prompt"');
      expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('name: Test Prompt'));
      expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Hello {{name}}'));
    });

    it('should return 404 when flow not found', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(null);

      await controller.exportForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Flow not found', code: 'FLOW_NOT_FOUND' },
      });
    });

    it('should return 404 when prompt not found', async () => {
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.getById as jest.Mock).mockResolvedValue(null);

      await controller.exportForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Prompt not found', code: 'PROMPT_NOT_FOUND' },
      });
    });

    it('should return 403 when prompt belongs to different flow', async () => {
      const differentFlowPrompt = { ...mockPrompt, flowId: 'different-flow' };
      (flowService.getFlowById as jest.Mock).mockResolvedValue(mockFlow);
      (promptsService.getById as jest.Mock).mockResolvedValue(differentFlowPrompt);

      await controller.exportForFlow(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Forbidden', code: 'FORBIDDEN' },
      });
    });

    it('should handle all error types correctly', async () => {
      const logErrorSpy = jest.spyOn(logger, 'logError').mockImplementation();
      (flowService.getFlowById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await controller.exportForFlow(mockRequest as Request, mockResponse as Response);

      expect(logErrorSpy).toHaveBeenCalledWith('Error exporting prompt:', expect.any(Error));
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Failed to export prompt', code: 'INTERNAL_ERROR' },
      });

      logErrorSpy.mockRestore();
    });
  });
});