import { describe, it, expect, beforeEach } from '@jest/globals';
import { FlowValidator, ValidationIssue } from '../FlowValidator';

describe('FlowValidator', () => {
  let validator: FlowValidator;

  beforeEach(() => {
    validator = new FlowValidator();
  });

  describe('validate', () => {
    it('should pass validation for a valid flow', async () => {
      const validFlow = {
        nodes: [
          {
            id: 'input-1',
            data: { type: 'input', config: {} },
          },
          {
            id: 'output-1',
            data: { type: 'output', config: {} },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'input-1',
            target: 'output-1',
          },
        ],
      };

      const issues = await validator.validate(validFlow);

      expect(issues).toEqual([]);
    });

    it('should reject flow with no nodes', async () => {
      const emptyFlow = {
        nodes: [],
        edges: [],
      };

      const issues = await validator.validate(emptyFlow);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        nodeId: 'flow',
        nodeType: 'flow',
        message: 'Flow must contain at least one node',
      });
    });

    it('should reject flow with undefined nodes', async () => {
      const flowWithUndefinedNodes = {
        nodes: undefined as any,
        edges: [],
      };

      const issues = await validator.validate(flowWithUndefinedNodes);

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toBe('Flow must contain at least one node');
    });

    it('should reject nodes without id', async () => {
      const flowWithInvalidNode = {
        nodes: [
          {
            data: { type: 'input' },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithInvalidNode);

      expect(issues).toContainEqual(
        expect.objectContaining({
          message: 'Node id is required',
        })
      );
    });

    it('should reject nodes with non-string id', async () => {
      const flowWithInvalidId = {
        nodes: [
          {
            id: 123,
            data: { type: 'input' },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithInvalidId);

      expect(issues).toContainEqual(
        expect.objectContaining({
          message: 'Node id is required',
        })
      );
    });

    it('should reject duplicate node ids', async () => {
      const flowWithDuplicateIds = {
        nodes: [
          {
            id: 'duplicate-id',
            data: { type: 'input' },
          },
          {
            id: 'duplicate-id',
            data: { type: 'output' },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithDuplicateIds);

      expect(issues).toContainEqual(
        expect.objectContaining({
          nodeId: 'duplicate-id',
          message: 'Duplicate node id',
        })
      );
    });

    it('should reject nodes without type', async () => {
      const flowWithoutType = {
        nodes: [
          {
            id: 'node-1',
            data: {},
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithoutType);

      expect(issues).toContainEqual(
        expect.objectContaining({
          nodeId: 'node-1',
          nodeType: 'unknown',
          message: 'Node type is required',
        })
      );
    });

    it('should validate agent node configuration', async () => {
      const flowWithValidAgent = {
        nodes: [
          {
            id: 'agent-1',
            data: {
              type: 'agent',
              config: {
                provider: 'openai',
                model: 'gpt-4',
              },
            },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithValidAgent);

      expect(issues).toEqual([]);
    });

    it('should reject agent node with missing required config', async () => {
      const flowWithInvalidAgent = {
        nodes: [
          {
            id: 'agent-1',
            data: {
              type: 'agent',
              config: {
                provider: 'openai',
                // missing model
              },
            },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithInvalidAgent);

      expect(issues).toContainEqual(
        expect.objectContaining({
          nodeId: 'agent-1',
          nodeType: 'agent',
          message: expect.stringContaining('Required'),
        })
      );
    });

    it('should reject agent node with empty provider', async () => {
      const flowWithEmptyProvider = {
        nodes: [
          {
            id: 'agent-1',
            data: {
              type: 'agent',
              config: {
                provider: '',
                model: 'gpt-4',
              },
            },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithEmptyProvider);

      expect(issues).toContainEqual(
        expect.objectContaining({
          nodeId: 'agent-1',
          nodeType: 'agent',
          message: expect.stringContaining('String must contain at least 1 character'),
        })
      );
    });

    it('should validate edge references to existing nodes', async () => {
      const flowWithValidEdge = {
        nodes: [
          { id: 'node-1', data: { type: 'input' } },
          { id: 'node-2', data: { type: 'output' } },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
        ],
      };

      const issues = await validator.validate(flowWithValidEdge);

      expect(issues).toEqual([]);
    });

    it('should reject edges with invalid source node', async () => {
      const flowWithInvalidSource = {
        nodes: [
          { id: 'node-1', data: { type: 'input' } },
        ],
        edges: [
          { id: 'edge-1', source: 'non-existent', target: 'node-1' },
        ],
      };

      const issues = await validator.validate(flowWithInvalidSource);

      expect(issues).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('source'),
        })
      );
    });

    it('should reject edges with invalid target node', async () => {
      const flowWithInvalidTarget = {
        nodes: [
          { id: 'node-1', data: { type: 'input' } },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'non-existent' },
        ],
      };

      const issues = await validator.validate(flowWithInvalidTarget);

      expect(issues).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('target'),
        })
      );
    });

    it('should handle nodes with mixed case types', async () => {
      const flowWithMixedCase = {
        nodes: [
          { id: 'node-1', data: { type: 'INPUT' } },
          { id: 'agent-1', data: { type: 'AGENT', config: { provider: 'openai', model: 'gpt-4' } } },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithMixedCase);

      // Should normalize to lowercase and validate properly
      expect(issues).toEqual([]);
    });

    it('should handle nodes with missing data object', async () => {
      const flowWithMissingData = {
        nodes: [
          { id: 'node-1' },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithMissingData);

      expect(issues).toContainEqual(
        expect.objectContaining({
          nodeId: 'node-1',
          message: 'Node type is required',
        })
      );
    });

    it('should include path information for validation errors', async () => {
      const flowWithInvalidAgentConfig = {
        nodes: [
          {
            id: 'agent-1',
            data: {
              type: 'agent',
              config: {
                provider: 'openai',
                // missing model will have path ['model']
              },
            },
          },
        ],
        edges: [],
      };

      const issues = await validator.validate(flowWithInvalidAgentConfig);

      const modelIssue = issues.find(i => i.path && i.path.includes('model'));
      expect(modelIssue).toBeDefined();
      expect(modelIssue?.path).toEqual(['model']);
    });

    it('should handle complex flow with multiple issues', async () => {
      const complexFlowWithIssues = {
        nodes: [
          { id: 'node-1', data: { type: 'input' } }, // valid
          { id: 'node-1' }, // duplicate id, missing type
          { data: { type: 'output' } }, // missing id
          { id: 'agent-1', data: { type: 'agent', config: { provider: '' } } }, // invalid agent config
        ],
        edges: [
          { source: 'node-1', target: 'non-existent' }, // invalid target
          { source: 'missing-node', target: 'node-1' }, // invalid source
        ],
      };

      const issues = await validator.validate(complexFlowWithIssues);

      expect(issues.length).toBeGreaterThan(3);
      expect(issues).toContainEqual(expect.objectContaining({ message: 'Duplicate node id' }));
      expect(issues).toContainEqual(expect.objectContaining({ message: 'Node id is required' }));
      expect(issues).toContainEqual(expect.objectContaining({ message: 'Node type is required' }));
    });
  });
});