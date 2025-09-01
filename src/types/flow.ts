import { Node, Edge } from '@xyflow/react';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  config: NodeConfig;
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

export enum NodeType {
  INPUT = 'input',
  MODEL = 'model',
  PROMPT = 'prompt',
  TRANSFORM = 'transform',
  OUTPUT = 'output',
  CONDITION = 'condition',
}

export interface NodeConfig {
  [key: string]: any;
}

export interface InputNodeConfig extends NodeConfig {
  inputType: 'static' | 'variable';
  // For static inputs - the actual value to use
  staticValue?: string;
  // For variable inputs - the variable definition
  variableName?: string;
  variableDescription?: string;
  // Legacy support
  defaultValue?: string;
  schema?: string;
}

export interface ModelNodeConfig extends NodeConfig {
  provider: 'googleai' | 'openai' | 'anthropic';
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface PromptNodeConfig extends NodeConfig {
  template: string;
  variables: string[];
}

export interface TransformNodeConfig extends NodeConfig {
  code: string;
  language: 'javascript' | 'typescript';
}

export interface OutputNodeConfig extends NodeConfig {
  format: 'text' | 'json' | 'structured';
  schema?: string;
}

export interface ConditionNodeConfig extends NodeConfig {
  condition: string;
  trueLabel: string;
  falseLabel: string;
}

export interface FlowConfig {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionTrace {
  nodeId: string;
  input: any;
  output: any;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  traces: ExecutionTrace[];
}

export interface GeneratedCode {
  code: string;
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  message: string;
  nodeId?: string;
  severity: 'error' | 'warning';
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export const NODE_TYPES = {
  [NodeType.INPUT]: 'Input',
  [NodeType.MODEL]: 'Model',
  [NodeType.PROMPT]: 'Prompt',
  [NodeType.TRANSFORM]: 'Transform',
  [NodeType.OUTPUT]: 'Output',
  [NodeType.CONDITION]: 'Condition',
};

export const MODEL_PROVIDERS = {
  googleai: 'Google AI',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

export const AVAILABLE_MODELS = {
  googleai: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
};

// Variables system types
export interface FlowVariable {
  id: string;
  name: string;
  description?: string;
  source: 'input' | 'manual' | 'runtime';
  sourceNodeId?: string; // ID of the node that defines this variable
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
}

export interface VariableReference {
  variableId: string;
  nodeId: string;
  field: string; // Which field in the node references this variable
}