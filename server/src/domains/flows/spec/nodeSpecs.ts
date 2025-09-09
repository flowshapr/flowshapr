export type NodeSpec = {
  type: string;
  role: 'input' | 'agent' | 'transform' | 'output' | 'condition' | 'tool';
};

export const NODE_SPECS: Record<string, NodeSpec> = {
  input: { type: 'input', role: 'input' },
  agent: { type: 'agent', role: 'agent' },
  transform: { type: 'transform', role: 'transform' },
  output: { type: 'output', role: 'output' },
  condition: { type: 'condition', role: 'condition' },
  tool: { type: 'tool', role: 'tool' },
};

