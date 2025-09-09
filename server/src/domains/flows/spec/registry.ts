import { z } from 'zod';

export type HandleSpec = {
  id: string;
  type: 'source' | 'target';
  role: 'data' | 'tool' | 'condition-true' | 'condition-false';
};

export type NodeSpec = {
  type: string; // e.g. 'input', 'agent'
  role: 'input' | 'agent' | 'transform' | 'output' | 'condition' | 'tool';
  handles: HandleSpec[];
  configSchema: z.ZodTypeAny;
};

// Minimal config schemas that runtime/codegen rely on
const inputConfig = z.object({
  inputType: z.enum(['static', 'variable']).optional(),
  staticValue: z.any().optional(),
  defaultValue: z.any().optional(),
  variableName: z.string().optional(),
});

const agentConfig = z.object({
  provider: z.enum(['googleai', 'openai', 'anthropic']),
  model: z.string(),
  promptType: z.enum(['static', 'library']).optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  topP: z.number().optional(),
  topK: z.number().optional(),
  candidateCount: z.number().optional(),
});

const transformConfig = z.object({
  code: z.string().optional(),
  language: z.enum(['javascript', 'typescript', 'python']).optional(),
});

const outputConfig = z.object({
  format: z.enum(['text', 'json', 'structured']).optional(),
  schema: z.string().optional(),
});

const conditionConfig = z.object({
  condition: z.string().optional(),
  trueLabel: z.string().optional(),
  falseLabel: z.string().optional(),
});

const mcpToolConfig = z.object({
  toolType: z.literal('mcp'),
  name: z.string().optional(),
  serverUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  selectedTools: z.array(z.string()).optional(),
  allowRemote: z.boolean().optional(),
});

export const NODE_REGISTRY: Record<string, NodeSpec> = {
  input: {
    type: 'input',
    role: 'input',
    handles: [
      { id: 'default', type: 'source', role: 'data' },
    ],
    configSchema: inputConfig,
  },
  agent: {
    type: 'agent',
    role: 'agent',
    handles: [
      { id: 'default', type: 'target', role: 'data' },
      { id: 'tool', type: 'target', role: 'tool' },
      { id: 'default', type: 'source', role: 'data' },
    ],
    configSchema: agentConfig,
  },
  transform: {
    type: 'transform',
    role: 'transform',
    handles: [
      { id: 'default', type: 'target', role: 'data' },
      { id: 'default', type: 'source', role: 'data' },
    ],
    configSchema: transformConfig,
  },
  output: {
    type: 'output',
    role: 'output',
    handles: [
      { id: 'default', type: 'target', role: 'data' },
    ],
    configSchema: outputConfig,
  },
  condition: {
    type: 'condition',
    role: 'condition',
    handles: [
      { id: 'default', type: 'target', role: 'data' },
      { id: 'true', type: 'source', role: 'condition-true' },
      { id: 'false', type: 'source', role: 'condition-false' },
    ],
    configSchema: conditionConfig,
  },
  tool: {
    type: 'tool',
    role: 'tool',
    handles: [
      { id: 'default', type: 'source', role: 'tool' },
    ],
    configSchema: mcpToolConfig,
  },
};

export function getSpec(nodeType: string): NodeSpec | undefined {
  return NODE_REGISTRY[(nodeType || '').toLowerCase()];
}

export function getToolHandleIdsForAgent(nodeType: string): string[] {
  const spec = getSpec(nodeType);
  if (!spec || spec.role !== 'agent') return [];
  return spec.handles.filter((h) => h.type === 'target' && h.role === 'tool').map((h) => h.id);
}

