import { blockRegistry } from '../blocks/registry';
import { 
  BlockInstance,
  FlowEdge,
  GeneratedCode,
  ValidationError,
  CodeGenerationContext,
  FlowVariable
} from '../blocks/types';

/**
 * Modern code generator that works with the block registry system
 */
export class BlockCodeGenerator {
  private blocks: BlockInstance[] = [];
  private edges: FlowEdge[] = [];
  private variables: FlowVariable[] = [];
  private errors: ValidationError[] = [];

  constructor(blocks: BlockInstance[], edges: FlowEdge[], variables: FlowVariable[] = []) {
    this.blocks = blocks;
    this.edges = edges;
    this.variables = variables;
  }

  /**
   * Generate complete Genkit flow code
   */
  generate(): GeneratedCode {
    this.errors = [];

    try {
      // Create code generation context
      const context: CodeGenerationContext = {
        imports: new Set(['import { genkit } from \'genkit\';', 'import { z } from \'zod\';']),
        variables: new Map(),
        dependencies: new Set(),
        plugins: new Set()
      };

      // Get execution order
      const executionOrder = this.getExecutionOrder();
      if (this.errors.length > 0) {
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
        isValid: this.errors.length === 0,
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

  /**
   * Get execution order using topological sort
   */
  private getExecutionOrder(): BlockInstance[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: BlockInstance[] = [];

    // Check for cycles
    const hasCycle = (blockId: string): boolean => {
      if (visiting.has(blockId)) return true;
      if (visited.has(blockId)) return false;

      visiting.add(blockId);
      
      const outgoingEdges = this.edges.filter(e => e.source === blockId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) return true;
      }

      visiting.delete(blockId);
      visited.add(blockId);
      return false;
    };

    // Check all blocks for cycles
    for (const block of this.blocks) {
      if (hasCycle(block.id)) {
        this.errors.push({
          message: 'Flow contains circular dependencies',
          severity: 'error'
        });
        return [];
      }
    }

    // Reset for actual traversal
    visited.clear();

    // Find entry points (blocks with no incoming edges or explicitly marked as start)
    const hasIncoming = new Set(this.edges.map(e => e.target));
    const entryPoints = this.blocks.filter(block => 
      !hasIncoming.has(block.id) || 
      block.config.isStart === true
    );

    if (entryPoints.length === 0) {
      this.errors.push({
        message: 'Flow must have at least one entry point (no incoming connections)',
        severity: 'error'
      });
      return [];
    }

    // Traverse from entry points
    const traverse = (block: BlockInstance) => {
      if (visited.has(block.id)) return;
      
      visited.add(block.id);
      order.push(block);
      
      const outgoingEdges = this.edges.filter(e => e.source === block.id);
      for (const edge of outgoingEdges) {
        const targetBlock = this.blocks.find(b => b.id === edge.target);
        if (targetBlock) {
          traverse(targetBlock);
        }
      }
    };

    entryPoints.forEach(traverse);

    // Check if all blocks are reachable
    if (order.length < this.blocks.length) {
      const unreachable = this.blocks.filter(b => !visited.has(b.id));
      this.errors.push({
        message: `Unreachable blocks: ${unreachable.map(b => b.blockType).join(', ')}`,
        severity: 'warning'
      });
    }

    return order;
  }

  /**
   * Generate the main flow body
   */
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
      const nextVar = i === executionOrder.length - 1 ? 'result' : `step${i + 1}`;

      // Get block configuration from registry
      const blockConfig = blockRegistry.get(block.blockType);
      if (!blockConfig) {
        this.errors.push({
          message: `Unknown block type: ${block.blockType}`,
          severity: 'error'
        });
        continue;
      }

      // Validate block configuration
      const validation = blockConfig.validateConfig ? blockConfig.validateConfig(block.config) : { isValid: true, errors: [] };
      if (!validation.isValid) {
        validation.errors.forEach(error => this.errors.push(error));
        continue;
      }

      // Generate code using block's template
      try {
        const blockCode = blockConfig.codeTemplate.generate(
          block.config,
          context,
          currentVar,
          nextVar
        );

        statements.push(`// ${blockConfig.name} (${block.blockType})`);
        statements.push(blockCode);
        
        // Update context with step output
        statements.push(`ctx['${nextVar}'] = ${nextVar};`);
        
        // Handle special variable names for input blocks
        if (block.blockType === 'input' && block.config.variableName && block.config.variableName !== 'input') {
          statements.push(`ctx['${block.config.variableName}'] = ${nextVar};`);
        }

        statements.push('');
      } catch (error) {
        this.errors.push({
          message: `Code generation failed for block ${block.blockType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }

      currentVar = nextVar;
    }

    statements.push('return result;');

    return statements.join('\n  ');
  }

  /**
   * Generate imports based on context
   */
  private generateImports(context: CodeGenerationContext): string {
    const imports = new Set(context.imports);

    // Add provider imports based on used plugins
    for (const plugin of context.plugins) {
      if (plugin.includes('googleAI')) {
        imports.add("import { googleAI } from '@genkit-ai/google-genai';");
      } else if (plugin.includes('openAI')) {
        imports.add("import { openAI } from '@genkit-ai/compat-oai/openai';");
      } else if (plugin.includes('anthropic')) {
        imports.add("import { anthropic } from 'genkitx-anthropic';");
      } else if (plugin.includes('mcp')) {
        imports.add("import { mcp } from '@genkit-ai/mcp';");
      }
    }

    return Array.from(imports).sort().join('\n');
  }

  /**
   * Generate AI configuration
   */
  private generateAIConfig(context: CodeGenerationContext): string {
    const plugins = Array.from(context.plugins);
    const pluginArray = plugins.length > 0 ? `[${plugins.join(', ')}]` : '[]';

    return `const ai = genkit({
  plugins: ${pluginArray},
});`;
  }

  /**
   * Generate input schema based on flow variables
   */
  private generateInputSchema(): string {
    if (this.variables.length === 0) {
      return 'z.any()';
    }

    if (this.variables.length === 1 && this.variables[0].name === 'input') {
      return this.getZodTypeForVariable(this.variables[0]);
    }

    const schemaFields = this.variables.map(variable => {
      const zodType = this.getZodTypeForVariable(variable);
      const description = variable.description 
        ? `.describe("${variable.description.replace(/"/g, '\\"')}")`
        : '';
      
      return `    ${variable.name}: ${zodType}${description}`;
    });

    return `z.object({\n${schemaFields.join(',\n')}\n  })`;
  }

  /**
   * Get Zod type for a flow variable
   */
  private getZodTypeForVariable(variable: FlowVariable): string {
    switch (variable.type) {
      case 'string':
        return 'z.string()';
      case 'number':
        return 'z.number()';
      case 'boolean':
        return 'z.boolean()';
      case 'array':
        return 'z.array(z.any())';
      case 'object':
        return 'z.record(z.any())';
      default:
        return 'z.any()';
    }
  }

  /**
   * Assemble the complete code
   */
  private assembleCode(imports: string, aiConfig: string, inputSchema: string, flowBody: string): string {
    return `${imports}

${aiConfig}

export const generatedFlow = ai.defineFlow({
  name: 'generatedFlow',
  inputSchema: ${inputSchema},
  outputSchema: z.any(),
}, async (input) => {
  ${flowBody}
});`;
  }

  /**
   * Create error result
   */
  private createErrorResult(): GeneratedCode {
    return {
      code: '',
      isValid: false,
      errors: this.errors,
      imports: [],
      dependencies: []
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export function generateCode(blocks: BlockInstance[], edges: FlowEdge[], variables?: FlowVariable[]): GeneratedCode {
  const generator = new BlockCodeGenerator(blocks, edges, variables);
  return generator.generate();
}