// Legacy export for backward compatibility
// The old CodeGenerator has been replaced with the new BlockCodeGenerator
export * from './code-generator/BlockCodeGenerator';

// Legacy function for backward compatibility
import { BlockCodeGenerator } from './code-generator/BlockCodeGenerator';
import { BlockInstance, FlowEdge, FlowVariable } from './blocks/types';

// Convert old format to new format for compatibility
function convertLegacyToNew(nodes: any[], edges: any[]): { blocks: BlockInstance[], edges: FlowEdge[], variables: FlowVariable[] } {
  const blocks: BlockInstance[] = nodes.map(node => ({
    id: node.id,
    blockType: node.data?.type || node.type || 'unknown',
    position: node.position,
    selected: node.selected || false,
    config: node.data?.config || {},
    inputs: [],
    outputs: [],
    state: 'idle' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  }));

  const convertedEdges: FlowEdge[] = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: edge.data
  }));

  // Extract variables from input nodes (legacy support)
  const variables: FlowVariable[] = [];
  blocks.forEach(block => {
    if (block.blockType === 'input' && block.config.inputType === 'variable' && block.config.variableName) {
      variables.push({
        name: block.config.variableName,
        type: 'string',
        description: block.config.variableDescription
      });
    }
  });

  return { blocks, edges: convertedEdges, variables };
}

export function generateCode(nodes: any[], edges: any[]) {
  const { blocks, edges: convertedEdges, variables } = convertLegacyToNew(nodes, edges);
  const generator = new BlockCodeGenerator(blocks, convertedEdges, variables);
  return generator.generate();
}

// Legacy CodeGenerator class for backward compatibility
export class CodeGenerator {
  private nodes: any[] = [];
  private edges: any[] = [];

  constructor(nodes: any[], edges: any[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  generate() {
    return generateCode(this.nodes, this.edges);
  }
}