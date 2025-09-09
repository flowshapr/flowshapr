/**
 * Server-side block system types
 */

export interface ServerBlockDefinition {
  type: string;
  name: string;
  description: string;
  longDescription?: string;
  category: BlockCategory;
  version: string;
  isAvailable: () => boolean;
  subBlocks: ServerSubBlock[];
  validateConfig: (config: any) => ValidationResult;
  generateCode: (config: any, context: CodeGenerationContext, inputVar: string, outputVar: string) => string;
  getImports: (config: any) => string[];
  getDependencies: (config: any) => string[];
  getPlugins: (config: any) => string[];
}

export interface ServerSubBlock {
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
  visibleWhen?: (config: any) => boolean;
  validate?: (value: any) => string | null;
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

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CodeGenerationContext {
  imports: Set<string>;
  dependencies: Set<string>;
  plugins: Set<string>;
  variables: Array<{ name: string; type: string; description?: string }>;
}

/**
 * Frontend-safe block metadata (what gets sent to client)
 */
export interface ClientBlockMetadata {
  type: string;
  name: string;
  description: string;
  longDescription?: string;
  category: BlockCategory;
  version: string;
  bgColor?: string;
  icon?: string; // Icon name or SVG string
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
  // Note: visibleWhen and validate functions are NOT sent to client for security
}

/**
 * Block instance as stored in database
 */
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