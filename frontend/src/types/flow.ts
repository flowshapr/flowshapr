import { Node, Edge } from '@xyflow/react';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config: NodeConfig;
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

export enum NodeType {
  INPUT = 'input',
  AGENT = 'agent', // Renamed from MODEL
  OUTPUT = 'output',
  CONDITION = 'condition',
  TOOL = 'tool',
  INTERRUPT = 'interrupt',
  // PROMPT node removed - integrated into AGENT
  // TRANSFORM node removed
}

export interface NodeConfig {
  [key: string]: any;
}

export interface InputNodeConfig extends NodeConfig {
  description?: string;
}

// Enhanced Agent node config with integrated prompts and advanced parameters
export interface AgentNodeConfig extends NodeConfig {
  // Provider and model selection
  provider: 'googleai' | 'openai' | 'anthropic';
  model: string;
  
  // Prompt configuration
  promptType: 'static' | 'library';
  // For static prompts
  systemPrompt?: string;
  userPrompt?: string;
  // For library prompts
  promptLibraryId?: string;
  promptVersion?: string;
  
  // Common parameters
  temperature?: number;
  maxTokens?: number;
  
  // OpenAI specific parameters
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // Google AI specific parameters
  topK?: number;
  candidateCount?: number;
  
  // Anthropic specific parameters
  topKAnthropic?: number;
  
  // Common to multiple providers
  stopSequences?: string[];
}

// Legacy PromptNodeConfig - kept for migration purposes only
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

export interface InterruptNodeConfig extends NodeConfig {
  interruptType: 'manual-response' | 'restartable';
  message: string;
  responseSchema?: string;
  timeout?: number;
  allowedResponses?: string[];
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
  nodeTitle?: string;
  nodeType?: string;
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
  runtime?: string;
}

export interface GeneratedCode {
  code: string;
  isValid: boolean;
  errors: ValidationError[];
  imports?: string[];
  dependencies?: string[];
}

export interface ValidationError {
  message: string;
  field?: string;
  nodeId?: string;
  severity: 'error' | 'warning' | 'info';
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
  [NodeType.AGENT]: 'Agent',
  [NodeType.OUTPUT]: 'Output',
  [NodeType.CONDITION]: 'Condition',
  [NodeType.TOOL]: 'Tool',
  [NodeType.INTERRUPT]: 'Interrupt',
};

export const MODEL_PROVIDERS = {
  googleai: 'Google AI',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

// Up-to-date model lists for each provider
export const AVAILABLE_MODELS = {
  googleai: [
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro', 
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini', 
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229', 
    'claude-3-haiku-20240307'
  ],
};

// Model display names for UI
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Google AI
  'gemini-1.5-pro-latest': 'Gemini 1.5 Pro (Latest)',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash-latest': 'Gemini 1.5 Flash (Latest)',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-1.0-pro': 'Gemini 1.0 Pro',
  // OpenAI
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4': 'GPT-4',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  // Anthropic
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
};

// Default parameters for each provider
export const DEFAULT_MODEL_PARAMS = {
  googleai: {
    temperature: 0.7,
    maxTokens: 2048,
    topK: 40,
    topP: 0.95,
    candidateCount: 1,
  },
  openai: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.95,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  anthropic: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.95,
    topKAnthropic: 40,
  },
};

// Variables system types
export interface FlowVariable {
  id: string;
  name: string;
  description?: string;
  source: 'input' | 'manual' | 'runtime' | 'auto';
  sourceNodeId?: string; // ID of the node that defines this variable
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
}

export interface VariableReference {
  variableId: string;
  nodeId: string;
  field: string; // Which field in the node references this variable
}

// API Key status for providers
export interface ProviderStatus {
  provider: 'googleai' | 'openai' | 'anthropic';
  isActive: boolean;
  hasApiKey: boolean;
  lastChecked?: Date;
}

// Prompt library types (basic - full implementation coming from prompt manager agent)
export interface PromptLibraryItem {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  version: string;
  variables: string[];
  metadata?: {
    provider?: string;
    model?: string;
    temperature?: number;
    [key: string]: any;
  };
}
