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
      
      const context: CodeGenerationContext = {
        imports: new Set(),
        dependencies: new Set(),
        plugins: new Set(),
        variables: this.variables
      };

      // Validate all blocks first
      for (const block of this.blocks) {
        const validation = serverBlockRegistry.validateBlockConfig(block.blockType, block.config);
        if (!validation.isValid) {
          this.errors.push(...validation.errors);
        }
      }

      if (this.errors.length > 0) {
        return this.createErrorResult();
      }

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

  private createErrorResult(): CodeGenerationResult {
    return {
      code: '',
      isValid: false,
      errors: this.errors,
      imports: [],
      dependencies: []
    };
  }

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

    // Find entry points (blocks with no incoming edges)
    const hasIncomingEdge = new Set(this.edges.map(e => e.target));
    const entryPoints = this.blocks.filter(b => !hasIncomingEdge.has(b.id));

    if (entryPoints.length === 0) {
      this.errors.push({
        message: 'Flow has no entry points (all blocks have incoming connections)',
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

      // Generate code using block's server-side generator
      try {
        const outputVar = `step${i + 1}`;
        const blockCode = blockDefinition.generateCode(
          block.config,
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
      "import { genkit, z } from 'genkit';"
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

    // Add custom imports
    context.imports.forEach(imp => imports.push(imp));

    return imports.join('\n');
  }

  private generateAIConfig(context: CodeGenerationContext): string {
    const plugins = Array.from(context.plugins);
    
    // Add telemetry exporter to plugins if configured
    const telemetrySetup = `
// Setup telemetry exporter
const telemetryExporter = await createFlowshaprExporter();
const allPlugins = [${plugins.length > 0 ? plugins.join(', ') : ''}];
if (telemetryExporter) {
  allPlugins.push(telemetryExporter);
}`;

    return `${telemetrySetup}

const ai = genkit({
  plugins: allPlugins,
});`;
  }

  private assembleCode(imports: string, aiConfig: string, inputSchema: string, flowBody: string): string {
    return `${imports}

// Flowshapr telemetry exporter setup
async function createFlowshaprExporter() {
  try {
    const endpoint = process.env.FLOWSHAPR_TRACE_ENDPOINT;
    const secret = process.env.FLOWSHAPR_TRACE_SECRET;
    
    if (!endpoint) {
      return null; // Skip telemetry if not configured
    }

    // Simple telemetry exporter that sends trace events to Flowshapr backend
    return function flowshaprPlugin(ai) {
      try {
        const onAny = ai?.telemetry?.onEvent || ai?.onEvent;
        if (typeof onAny === 'function') {
          onAny(async (event) => {
            try {
              await fetch(endpoint, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': \`Bearer \${secret}\` 
                },
                body: JSON.stringify(event),
              });
            } catch (e) {
              // Silently fail to avoid disrupting flow execution
            }
          });
        }
      } catch (e) {
        // Silently fail to avoid disrupting flow execution
      }
      return {};
    };
  } catch (e) {
    return null;
  }
}

// Main execution wrapper
(async () => {
  try {
${aiConfig}

const generatedFlow = ai.defineFlow({
  name: 'generatedFlow',
  inputSchema: ${inputSchema},
  outputSchema: z.any(),
}, async (input) => {
  ${flowBody}
});

// Execute the flow and output the result
const input = JSON.parse(process.env.FLOW_INPUT || '{}');
const result = await generatedFlow(input);
console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Flow execution error:', error.message);
    process.exit(1);
  }
})();`;
  }
}