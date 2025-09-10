import { NodeType } from '@/types/flow';
import InputBlock from './InputBlock';
import AgentBlock from './AgentBlock';
import OutputBlock from './OutputBlock';
import ConditionBlock from './ConditionBlock';
import McpToolBlock from './tools/McpToolBlock';
import InterruptBlock from './InterruptBlock';

// ReactFlow node type registry
export const nodeTypes = {
  [NodeType.INPUT]: InputBlock,
  [NodeType.AGENT]: AgentBlock,
  [NodeType.OUTPUT]: OutputBlock,
  [NodeType.CONDITION]: ConditionBlock,
  [NodeType.TOOL]: McpToolBlock,
  [NodeType.INTERRUPT]: InterruptBlock,
};

// Visuals per node type
const nodeColors: Record<NodeType, string> = {
  [NodeType.INPUT]: '#3b82f6',
  [NodeType.AGENT]: '#10b981',
  [NodeType.OUTPUT]: '#ef4444',
  [NodeType.CONDITION]: '#eab308',
  [NodeType.TOOL]: '#14b8a6',
  [NodeType.INTERRUPT]: '#ea580c',
};

export function getNodeColor(type: NodeType): string {
  return nodeColors[type] || '#6b7280';
}

// Labels per node type
const nodeLabels: Record<NodeType, string> = {
  [NodeType.INPUT]: 'Input',
  [NodeType.AGENT]: 'Agent',
  [NodeType.OUTPUT]: 'Output',
  [NodeType.CONDITION]: 'Condition',
  [NodeType.TOOL]: 'Tool',
  [NodeType.INTERRUPT]: 'Interrupt',
};

export function getNodeLabel(type: NodeType): string {
  return nodeLabels[type] || 'Node';
}

// Default config factories per node type
export function getDefaultConfig(type: NodeType): any {
  switch (type) {
    case NodeType.INPUT:
      return {
        inputType: 'static',
        staticValue: '',
        variableName: '',
        variableDescription: '',
        schema: '',
      };
    case NodeType.AGENT:
      return {
        provider: 'googleai',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 1000,
        promptType: 'static',
        systemPrompt: '',
        userPrompt: 'Process this input: {{input}}',
      };
    case NodeType.OUTPUT:
      return {
        format: 'text',
        schema: '',
      };
    case NodeType.CONDITION:
      return {
        condition: 'data.score > 0.5',
        trueLabel: 'Yes',
        falseLabel: 'No',
      };
    case NodeType.TOOL:
      return {
        toolType: 'mcp',
        name: 'MCP Tool',
        serverUrl: '',
        apiKey: '',
        selectedTools: [] as string[],
        allowRemote: true,
      };
    case NodeType.INTERRUPT:
      return {
        interruptType: 'manual-response',
        message: 'Please review the data and provide your response...',
        responseSchema: '',
        timeout: undefined,
        allowedResponses: [],
      };
    default:
      return {};
  }
}
