/**
 * Client-side types for block system - contains only UI rendering data
 * Business logic and validation stay on server
 */

export interface ClientBlockMetadata {
  type: string;
  name: string;
  description: string;
  longDescription?: string;
  category: BlockCategory;
  version: string;
  bgColor?: string;
  icon?: string; // Icon name
  isAvailable: boolean;
  subBlocks: ClientSubBlock[];
}

export interface ClientSubBlock {
  id: string;
  type: SubBlockType;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: SubBlockOption[];
  multiline?: boolean;
  language?: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  // Note: visibleWhen and validate are handled server-side for security
}

export interface SubBlockOption {
  value: string;
  label: string;
  description?: string;
}

export enum SubBlockType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  CODE = 'code',
  JSON = 'json',
  SCHEMA = 'schema',
  MODEL_SELECTOR = 'model_selector',
  PROVIDER_SELECTOR = 'provider_selector',
  CONNECTION_SELECTOR = 'connection_selector'
}

export type BlockCategory = 'input' | 'genai' | 'output' | 'logic' | 'data' | 'control';

export interface BlockInstance {
  id: string;
  blockType: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  selected: boolean;
  inputs: string[];
  outputs: string[];
  state: 'idle' | 'running' | 'completed' | 'error';
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  defaultValue?: any;
}

export interface ValidationError {
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CodeGenerationResult {
  code: string;
  isValid: boolean;
  errors: ValidationError[];
  imports: string[];
  dependencies: string[];
}