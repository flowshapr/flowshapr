import { ServerBlockDefinition, BlockInstance, FlowEdge, FlowVariable, CodeGenerationContext, ValidationError } from '../types';
import { serverBlockRegistry } from '../registry';

export interface CodeGenerationResult {
  code: string;
  isValid: boolean;
  errors: ValidationError[];
  imports: string[];
  dependencies: string[];
}

/**
 * Server-side code generator - handles business logic securely
 */
export class CodeGeneratorService {
  private blocks: BlockInstance[];
  private edges: FlowEdge[];
  private variables: FlowVariable[];
  private errors: ValidationError[] = [];

  constructor(blocks: BlockInstance[], edges: FlowEdge[], variables: FlowVariable[] = []) {
    this.blocks = blocks;
    this.edges = edges;
    this.variables = variables;
    this.errors = [];
  }

  generate(): CodeGenerationResult {
    try {
      this.errors = [];
      
      // Handle empty flow case - return valid empty result
      if (this.blocks.length === 0) {
        return {
          code: this.generateEmptyFlow(),
          isValid: true,
          errors: [],
          imports: ['genkit', 'zod'],
          dependencies: []
        };
      }
      
      const context: CodeGenerationContext = {
        imports: new Set(),
        dependencies: new Set(),
        plugins: new Set(),
        variables: this.variables,
        attachments: this.buildAttachmentsMap()
      };

      // Validate all blocks first
      for (const block of this.blocks) {
        const validation = serverBlockRegistry.validateBlockConfig(block.blockType, block.config);
        if (!validation.isValid) {
          this.errors.push(...validation.errors);
        }
      }

      if (this.hasErrors()) {
        return this.createErrorResult();
      }

      // Get execution order
      const executionOrder = this.getExecutionOrder();
      if (this.hasErrors()) {
        return this.createErrorResult();
      }

      // Generate code sections
      const flowBody = this.generateFlowBody(executionOrder, context);
      const inputSchema = this.generateInputSchema();
      const imports = this.generateImports(context);
      const aiConfig = this.generateAIConfig(context);
      
      const code = this.assembleCode(imports, aiConfig, inputSchema, flowBody);
      
      return {
        code,
        isValid: !this.hasErrors(),
        errors: this.errors,
        imports: Array.from(context.imports),
        dependencies: Array.from(context.dependencies)
      };
    } catch (error) {
      this.errors.push({
        message: `Code generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      return this.createErrorResult();
    }
  }

  private createErrorResult(): CodeGenerationResult {
    return {
      code: '',
      isValid: false,
      errors: this.errors,
      imports: [],
      dependencies: []
    };
  }

  private hasErrors(): boolean {
    return this.errors.some(e => e.severity === 'error');
  }

  private generateEmptyFlow(): string {
    return `import { genkit } from 'genkit';
import { z } from 'zod';

const ai = genkit({
  plugins: []
});

// Define empty flow
const generatedFlow = ai.defineFlow({
  name: 'generatedFlow',
  inputSchema: z.any(),
  outputSchema: z.any(),
}, async (input) => {
  // Empty flow - return input as output
  return input;
});

// Export default function for container execution
export default async function executeFlow(input) {
  try {
    return await generatedFlow(input);
  } catch (error) {
    throw new Error(\`Flow execution error: \${error instanceof Error ? error.message : String(error)}\`);
  }
}

// Also export ai and flows for alternative execution patterns
export { ai };
export const flows = [generatedFlow];`;
  }

  private getExecutionOrder(): BlockInstance[] {
    // Handle empty flow case
    if (this.blocks.length === 0) {
      return [];
    }

    // Treat only execution edges: ignore edges used for attachments (e.g., tools)
    const isExecutionEdge = (e: FlowEdge) => e.targetHandle !== 'tool' && e.sourceHandle !== 'tool';
    const execEdges = this.edges.filter(isExecutionEdge);
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: BlockInstance[] = [];

    // Check for cycles
    const hasCycle = (blockId: string): boolean => {
      if (visiting.has(blockId)) return true;
      if (visited.has(blockId)) return false;

      visiting.add(blockId);
      
      const outgoingEdges = execEdges.filter(e => e.source === blockId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) return true;
      }

      visiting.delete(blockId);
      return false;
    };

    // Check for cycles in the graph
    for (const block of this.blocks) {
      if (hasCycle(block.id)) {
        this.errors.push({
          message: 'Flow contains circular dependencies',
          severity: 'error'
        });
        return [];
      }
    }

    // Find input blocks - these are always the start points
    const inputBlocks = this.blocks.filter(b => b.blockType === 'input');
    
    if (inputBlocks.length === 0) {
      this.errors.push({
        message: 'Flow must have an input block to define the starting point',
        severity: 'error'
      });
      return [];
    }

    if (inputBlocks.length > 1) {
      this.errors.push({
        message: 'Flow can only have one input block as the starting point',
        severity: 'error'
      });
      return [];
    }

    // Traverse from the input block
    const traverse = (block: BlockInstance) => {
      if (visited.has(block.id)) return;
      
      visited.add(block.id);
      order.push(block);
      
      const outgoingEdges = execEdges.filter(e => e.source === block.id);
      for (const edge of outgoingEdges) {
        const targetBlock = this.blocks.find(b => b.id === edge.target);
        if (targetBlock) {
          traverse(targetBlock);
        }
      }
    };

    // Start traversal from the input block
    traverse(inputBlocks[0]);

    // Check if all blocks are reachable
    if (order.length < this.blocks.length) {
      // Ignore unattached utility/attachment blocks like tools/interrupts in warning
      const unreachable = this.blocks.filter(b => !visited.has(b.id) && !['tool','interrupt'].includes(b.blockType));
      if (unreachable.length > 0) {
        this.errors.push({
          message: `Unreachable blocks: ${unreachable.map(b => b.blockType).join(', ')}`,
          severity: 'warning'
        });
      }
    }

    return order;
  }

  // Build map of attachment edges (e.g., tools/interrupts connected to an agent's 'tool' handle)
  private buildAttachmentsMap(): Record<string, Array<{ id: string; blockType: string; config: any }>> {
    const map: Record<string, Array<{ id: string; blockType: string; config: any }>> = {};
    const attachmentEdges = this.edges.filter(e => e.targetHandle === 'tool');
    for (const edge of attachmentEdges) {
      const sourceBlock = this.blocks.find(b => b.id === edge.source);
      const targetBlock = this.blocks.find(b => b.id === edge.target);
      if (!sourceBlock || !targetBlock) continue;
      // Only consider supported attachment types
      if (!['tool', 'interrupt'].includes(sourceBlock.blockType)) continue;
      const arr = map[targetBlock.id] || (map[targetBlock.id] = []);
      arr.push({ id: sourceBlock.id, blockType: sourceBlock.blockType, config: sourceBlock.config });
    }
    return map;
  }

  private generateFlowBody(executionOrder: BlockInstance[], context: CodeGenerationContext): string {
    const statements: string[] = [];
    let currentVar = 'input';

    // Add context setup
    statements.push('// Flow execution context');
    statements.push('const ctx = { input };');
    statements.push('const v = (path) => path.split(\'.\').reduce((obj, key) => (obj == null ? undefined : obj[key]), ctx);');
    statements.push('');

    for (let i = 0; i < executionOrder.length; i++) {
      const block = executionOrder[i];
      const blockDefinition = serverBlockRegistry.get(block.blockType);
      
      if (!blockDefinition) {
        this.errors.push({
          message: `Unknown block type: ${block.blockType}`,
          severity: 'error'
        });
        continue;
      }

      // Generate attachment blocks (tools, interrupts) before the current block if needed
      const attachments = context.attachments && context.attachments[block.id] || [];
      for (const attachment of attachments) {
        const attachmentBlock = this.blocks.find(b => b.id === attachment.id);
        if (attachmentBlock) {
          const attachmentDefinition = serverBlockRegistry.get(attachmentBlock.blockType);
          if (attachmentDefinition) {
            try {
              context.currentBlockId = attachmentBlock.id;
              const attachmentCode = attachmentDefinition.generateCode(
                attachmentBlock.config,
                context,
                'undefined', // attachment blocks don't use input
                `attachment_${attachmentBlock.id.replace(/[^a-zA-Z0-9]/g, '_')}`
              );
              statements.push(`// ${attachmentDefinition.name} (${attachmentBlock.blockType}) - attachment`);
              statements.push(attachmentCode);
              statements.push('');
            } catch (error) {
              this.errors.push({
                message: `Error generating attachment code for ${attachmentBlock.blockType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'error'
              });
            }
          }
        }
      }

      // Generate code using block's server-side generator
      try {
        const outputVar = `step${i + 1}`;
        const sanitizedConfig = block.config;
        
        // Expose current block id to code generators
        context.currentBlockId = block.id;
        const blockCode = blockDefinition.generateCode(
          sanitizedConfig,
          context,
          currentVar,
          outputVar
        );
        
        statements.push(`// ${blockDefinition.name} (${block.blockType})`);
        statements.push(blockCode);
        statements.push(`ctx['${outputVar}'] = ${outputVar};`);
        
        // Set up variable name mapping if this is an input block
        if (block.blockType === 'input' && block.config.variableName) {
          statements.push(`ctx['${block.config.variableName}'] = ${outputVar};`);
        }
        
        statements.push('');
        currentVar = outputVar;
      } catch (error) {
        this.errors.push({
          message: `Error generating code for ${block.blockType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }

    // Add return statement
    statements.push(`return ${currentVar};`);

    return statements.join('\n  ');
  }

  private generateInputSchema(): string {
    const inputVars = this.variables.filter(v => v.type);
    
    if (inputVars.length === 0) {
      return 'z.any()';
    }

    const schemaProps = inputVars.map(variable => {
      const zodType = this.getZodType(variable.type);
      const description = variable.description ? `.describe("${variable.description}")` : '';
      return `${variable.name}: ${zodType}${description}`;
    });

    return `z.object({\n    ${schemaProps.join(',\n    ')}\n  })`;
  }

  private getZodType(type: string): string {
    switch (type) {
      case 'string': return 'z.string()';
      case 'number': return 'z.number()';
      case 'boolean': return 'z.boolean()';
      case 'array': return 'z.array(z.any())';
      case 'object': return 'z.object({})';
      default: return 'z.any()';
    }
  }

  private generateImports(context: CodeGenerationContext): string {
    const imports: string[] = [
      "import { genkit } from 'genkit';",
      "import { z } from 'zod';",
    ];

    // Add provider imports based on plugins used
    if (context.plugins.has('googleAI()')) {
      imports.push("import { googleAI } from '@genkit-ai/google-genai';");
    }
    if (context.plugins.has('openai()')) {
      imports.push("import { openai } from '@genkit-ai/compat-oai/openai';");
    }
    if (context.plugins.has('anthropic()')) {
      imports.push("import { anthropic } from '@genkit-ai/compat-oai/anthropic';");
    }
    if (context.plugins.has('mcp()')) {
      imports.push("import { mcp } from '@genkit-ai/mcp';");
    }

    // Add custom imports
    context.imports.forEach(imp => imports.push(imp));

    return imports.join('\n');
  }

  private generateAIConfig(context: CodeGenerationContext): string {
    const plugins = Array.from(context.plugins);
    
    return `const ai = genkit({
  plugins: [${plugins.length > 0 ? plugins.join(', ') : ''}]
});`;
  }


  private assembleCode(imports: string, aiConfig: string, inputSchema: string, flowBody: string): string {
    return `${imports}

${aiConfig}

// Define and export the flow for container execution
const generatedFlow = ai.defineFlow({
  name: 'generatedFlow',
  inputSchema: ${inputSchema},
  outputSchema: z.any(),
}, async (input) => {
  ${flowBody}
});

// Export default function for container execution
export default async function executeFlow(input) {
  try {
    return await generatedFlow(input);
  } catch (error) {
    throw new Error(\`Flow execution error: \${error instanceof Error ? error.message : String(error)}\`);
  }
}

// Also export ai and flows for alternative execution patterns
export { ai };
export const flows = [generatedFlow];`;
  }
}
