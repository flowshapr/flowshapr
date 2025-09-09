/**
 * Client-side service for server-side code generation
 */

export interface CodeGenerationResult {
  code: string;
  isValid: boolean;
  errors: Array<{
    field?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  imports?: string[];
  dependencies?: string[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    config?: any;
    type?: string;
  };
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

/**
 * Convert frontend node format to server block instance format
 */
function convertNodesToBlocks(nodes: FlowNode[]): Array<{
  id: string;
  blockType: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  selected: boolean;
  inputs: string[];
  outputs: string[];
  state: 'idle' | 'running' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  version: number;
}> {
  return nodes.map(node => ({
    id: node.id,
    blockType: node.type || node.data?.type || 'unknown',
    position: node.position,
    config: node.data?.config || {},
    selected: false,
    inputs: [],
    outputs: [],
    state: 'idle' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  }));
}

/**
 * Convert frontend edges to server format
 */
function convertEdgesToServerFormat(edges: FlowEdge[]) {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle
  }));
}

/**
 * Extract variables from input nodes
 */
function extractVariables(nodes: FlowNode[]): FlowVariable[] {
  const variables: FlowVariable[] = [];
  
  nodes.forEach(node => {
    if (node.type === 'input' && node.data?.config) {
      const config = node.data.config;
      if (config.inputType === 'variable' && config.variableName) {
        variables.push({
          name: config.variableName,
          type: 'string', // Default to string, could be enhanced later
          description: config.variableDescription
        });
      }
    }
  });
  
  return variables;
}

/**
 * Generate code using server-side code generator
 */
export async function generateCodeOnServer(
  nodes: FlowNode[], 
  edges: FlowEdge[]
): Promise<CodeGenerationResult> {
  try {
    // Convert frontend format to server format
    const blocks = convertNodesToBlocks(nodes);
    const serverEdges = convertEdgesToServerFormat(edges);
    const variables = extractVariables(nodes);

    console.log('🔄 Sending to server for code generation:', { 
      blocks: blocks.length, 
      edges: serverEdges.length, 
      variables: variables.length 
    });

    console.log('🔍 Frontend nodes data:', nodes.map(n => ({
      id: n.id,
      type: n.type,
      dataType: n.data?.type,
      config: n.data?.config
    })));

    console.log('🔍 Converted blocks data:', blocks.map(b => ({
      id: b.id,
      blockType: b.blockType,
      config: b.config
    })));

    // Call server API
    const response = await fetch('/api/blocks/generate-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks,
        edges: serverEdges,
        variables
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Server code generation failed:', result);
      console.error('📋 Request payload was:', {
        blocks: blocks.map(b => ({ id: b.id, blockType: b.blockType, config: b.config })),
        edges: serverEdges,
        variables
      });
      return {
        code: '',
        isValid: false,
        errors: [{
          message: result.error?.message || 'Code generation failed on server',
          severity: 'error'
        }]
      };
    }

    console.log('✅ Server code generation successful');
    return {
      code: result.data.code,
      isValid: result.data.isValid,
      errors: result.data.errors || [],
      imports: result.data.imports,
      dependencies: result.data.dependencies
    };

  } catch (error) {
    console.error('❌ Code generation error:', error);
    return {
      code: '',
      isValid: false,
      errors: [{
        message: `Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }]
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export function generateCode(nodes: FlowNode[], edges: FlowEdge[]): Promise<CodeGenerationResult> {
  return generateCodeOnServer(nodes, edges);
}