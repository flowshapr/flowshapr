import { ReactNode } from 'react';
import { z } from 'zod';

// Core block category system
export type BlockCategory = 'input' | 'genai' | 'logic' | 'data' | 'output' | 'advanced';

// Sub-block UI form control types
export enum SubBlockType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  CODE = 'code',
  JSON = 'json',
  MODEL_SELECTOR = 'model',
  PROMPT = 'prompt',
  SCHEMA = 'schema',
  ARRAY = 'array',
}

// Sub-block form configuration
export interface SubBlock {
  id: string;
  type: SubBlockType;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  description?: string;

  // Type-specific configurations
  options?: SelectOption[];
  min?: number;
  max?: number;
  multiline?: boolean;
  language?: string; // For code blocks

  // Dynamic behavior
  visibleWhen?: (config: any) => boolean;
  enabledWhen?: (config: any) => boolean;

  // Validation
  validate?: (value: any) => string | null;
  schema?: z.ZodSchema;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

// Execution context for blocks
export interface ExecutionContext {
  // Flow context
  flowId: string;
  executionId: string;
  
  // Variables and data
  variables: Map<string, any>;
  blockOutputs: Map<string, any>;
  
  // Execution state
  activePath: string[];
  completedBlocks: Set<string>;
  
  // Environment
  env: Record<string, string>;
  secrets: Record<string, string>;
  
  // Utilities
  getVariable: (name: string) => any;
  setVariable: (name: string, value: any) => void;
  getBlockOutput: (blockId: string) => any;
}

// Block execution parameters
export interface ExecutionParams<T = any> {
  // Input data from connections
  inputs: Record<string, any>;
  config: Record<string, any>;
  
  // Context
  context: ExecutionContext;
  
  // Utilities
  signal: AbortSignal;
}

// Block execution result
export interface ExecutionResult<T = any> {
  output: T;
  metadata?: Record<string, any>;
}

// Code generation context
export interface CodeGenerationContext {
  imports: Set<string>;
  variables: Map<string, string>;
  dependencies: Set<string>;
  plugins: Set<string>;
}

// Code template interface
export interface CodeTemplate {
  generate(
    config: any,
    context: CodeGenerationContext,
    inputVar: string,
    outputVar: string
  ): string;
  getImports(): string[];
  getDependencies(): string[];
  getPlugins(): string[];
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

// Node connection for React Flow
export interface NodeConnection {
  id: string;
  nodeId: string;
  portId: string;
  type: 'source' | 'target';
  dataType?: string;
}

// Node runtime state
export enum NodeState {
  IDLE = 'idle',
  WAITING = 'waiting',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  ERROR = 'error',
  SKIPPED = 'skipped'
}

// Core block configuration interface
export interface BlockConfig<TConfig = any, TOutput = any> {
  // Core identity
  type: string;
  name: string;
  description: string;
  longDescription?: string;
  
  // Visual properties
  category: BlockCategory;
  bgColor: string;
  icon: ReactNode;
  
  // Authentication
  provider?: string;
  
  // UI configuration
  subBlocks: SubBlock[];
  
  // Execution
  execute?: (params: ExecutionParams<TConfig>) => Promise<ExecutionResult<TOutput>>;
  
  // Code generation
  codeTemplate: CodeTemplate;
  
  // Validation
  validateConfig?: (config: TConfig) => ValidationResult;
  
  // Input/output schema
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  
  // Metadata
  version: string;
  deprecated?: boolean;
  experimental?: boolean;
}

// Block instance (runtime representation)
export interface BlockInstance {
  // Identity
  id: string;
  blockType: string;
  
  // Position and visual
  position: { x: number; y: number };
  selected: boolean;
  
  // Configuration
  config: Record<string, any>;
  
  // Connections (React Flow)
  inputs: NodeConnection[];
  outputs: NodeConnection[];
  
  // Runtime state
  state: NodeState;
  executionResult?: any;
  error?: Error;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Flow edge (connection between blocks)
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, any>;
}

// Flow configuration
export interface Flow {
  id: string;
  name: string;
  description?: string;
  blocks: BlockInstance[];
  edges: FlowEdge[];
  variables: FlowVariable[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  defaultValue?: any;
}

// Generated code result
export interface GeneratedCode {
  code: string;
  isValid: boolean;
  errors: ValidationError[];
  imports: string[];
  dependencies: string[];
}