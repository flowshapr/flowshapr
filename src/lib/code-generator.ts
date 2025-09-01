import { 
  FlowNode, 
  FlowEdge, 
  NodeType, 
  GeneratedCode, 
  ValidationError,
  InputNodeConfig,
  ModelNodeConfig,
  PromptNodeConfig,
  TransformNodeConfig,
  OutputNodeConfig,
  ConditionNodeConfig
} from '@/types/flow';

export class CodeGenerator {
  private nodes: FlowNode[] = [];
  private edges: FlowEdge[] = [];
  private errors: ValidationError[] = [];

  constructor(nodes: FlowNode[], edges: FlowEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  generate(): GeneratedCode {
    this.errors = [];
    
    try {
      const executionOrder = this.getExecutionOrder();
      const imports = this.generateImports();
      const flowFunction = this.generateFlowFunction(executionOrder);
      const code = `${imports}\n\n${flowFunction}`;
      
      return {
        code,
        isValid: this.errors.length === 0,
        errors: this.errors,
      };
    } catch (error) {
      this.errors.push({
        message: `Code generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      
      return {
        code: '',
        isValid: false,
        errors: this.errors,
      };
    }
  }

  private getExecutionOrder(): FlowNode[] {
    const visited = new Set<string>();
    const order: FlowNode[] = [];
    
    const inputNodes = this.nodes.filter(n => n.type === NodeType.INPUT);
    
    if (inputNodes.length === 0) {
      this.errors.push({
        message: 'Flow must have at least one input node',
        severity: 'error',
      });
      return [];
    }

    if (inputNodes.length > 1) {
      this.errors.push({
        message: 'Flow can only have one input node',
        severity: 'error',
      });
      return [];
    }

    const startNode = inputNodes[0];
    this.traverseNode(startNode, visited, order);
    
    return order;
  }

  private traverseNode(node: FlowNode, visited: Set<string>, order: FlowNode[]): void {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    order.push(node);
    
    const outgoingEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of outgoingEdges) {
      const targetNode = this.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        this.traverseNode(targetNode, visited, order);
      }
    }
  }

  private generateImports(): string {
    const imports = [
      `import { genkit } from 'genkit';`,
      `import { googleAI } from '@genkit-ai/googleai';`,
      `import { dotprompt } from '@genkit-ai/dotprompt';`,
      `import { z } from 'zod';`,
    ];
    
    return imports.join('\n');
  }

  private generateFlowFunction(executionOrder: FlowNode[]): string {
    const flowName = 'generatedFlow';
    const flowBody = this.generateFlowBody(executionOrder);
    const inputSchema = this.generateInputSchema();
    
    return `// Initialize AI instance
const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});

export const ${flowName} = ai.defineFlow({
  name: '${flowName}',
  inputSchema: ${inputSchema},
  outputSchema: z.any(),
}, async (input) => {
  ${flowBody}
});`;
  }

  private generateFlowBody(executionOrder: FlowNode[]): string {
    const statements: string[] = [];
    let currentVar = 'input';
    
    for (let i = 0; i < executionOrder.length; i++) {
      const node = executionOrder[i];
      const nextVar = i === executionOrder.length - 1 ? 'result' : `step${i + 1}`;
      
      const statement = this.generateNodeStatement(node, currentVar, nextVar);
      statements.push(statement);
      
      currentVar = nextVar;
    }
    
    statements.push('return result;');
    
    return statements.join('\n  ');
  }

  private generateNodeStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    switch (node.data.type) {
      case NodeType.INPUT:
        return this.generateInputStatement(node, inputVar, outputVar);
      case NodeType.MODEL:
        return this.generateModelStatement(node, inputVar, outputVar);
      case NodeType.PROMPT:
        return this.generatePromptStatement(node, inputVar, outputVar);
      case NodeType.TRANSFORM:
        return this.generateTransformStatement(node, inputVar, outputVar);
      case NodeType.OUTPUT:
        return this.generateOutputStatement(node, inputVar, outputVar);
      case NodeType.CONDITION:
        return this.generateConditionStatement(node, inputVar, outputVar);
      default:
        return `const ${outputVar} = ${inputVar}; // Unknown node type`;
    }
  }

  private generateInputStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as InputNodeConfig;
    
    switch (config.inputType) {
      case 'static':
        // Use the static value directly
        const staticValue = config.staticValue || config.defaultValue || '';
        return `const ${outputVar} = ${JSON.stringify(staticValue)};`;
      case 'variable':
        // Extract the variable from input object
        const variableName = config.variableName || 'input';
        if (variableName === 'input') {
          // Simple case - direct input
          return `const ${outputVar} = ${inputVar};`;
        } else {
          // Extract named variable from input object
          return `const ${outputVar} = ${inputVar}.${variableName} || ${inputVar};`;
        }
      default:
        // Fallback for legacy support
        return `const ${outputVar} = ${inputVar};`;
    }
  }

  private generateModelStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as ModelNodeConfig;
    
    const modelCall = `await ai.generate({
    model: '${config.provider}/${config.model}',
    prompt: ${inputVar},
    config: {
      temperature: ${config.temperature || 0.7},
      maxOutputTokens: ${config.maxOutputTokens || 1000},
    },
  })`;
    
    return `const ${outputVar}Response = ${modelCall};
  const ${outputVar} = ${outputVar}Response.text();`;
  }

  private generatePromptStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as PromptNodeConfig;
    
    // Simple template replacement for now
    const templateWithVars = config.template.replace(/\{\{(\w+)\}\}/g, '${$1}');
    
    return `const ${outputVar} = \`${templateWithVars}\`;`;
  }

  private generateTransformStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as TransformNodeConfig;
    
    // For safety, we'll wrap user code in a try-catch
    return `const ${outputVar} = (() => {
    try {
      const data = ${inputVar};
      ${config.code}
      return data;
    } catch (error) {
      console.error('Transform error:', error);
      return ${inputVar};
    }
  })();`;
  }

  private generateOutputStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as OutputNodeConfig;
    
    switch (config.format) {
      case 'text':
        return `const ${outputVar} = typeof ${inputVar} === 'string' ? ${inputVar} : JSON.stringify(${inputVar});`;
      case 'json':
        return `const ${outputVar} = typeof ${inputVar} === 'object' ? ${inputVar} : { result: ${inputVar} };`;
      case 'structured':
        return `const ${outputVar} = ${inputVar}; // Structured output - implement schema validation`;
      default:
        return `const ${outputVar} = ${inputVar};`;
    }
  }

  private generateConditionStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as ConditionNodeConfig;
    
    return `const ${outputVar} = (${config.condition}) ? ${inputVar} : ${inputVar};`;
  }

  private generateInputSchema(): string {
    // Extract variables from Input nodes
    const variables: Array<{ name: string; description?: string }> = [];
    
    for (const node of this.nodes) {
      if (node.data.type === NodeType.INPUT) {
        const config = node.data.config as InputNodeConfig;
        if (config.inputType === 'variable' && config.variableName) {
          variables.push({
            name: config.variableName,
            description: config.variableDescription
          });
        }
      }
    }
    
    if (variables.length === 0) {
      // No variables defined, accept any input
      return 'z.any()';
    }
    
    if (variables.length === 1 && variables[0].name === 'input') {
      // Single variable named 'input' - use simple schema
      return 'z.string()';
    }
    
    // Multiple variables - create object schema
    const schemaFields = variables.map(variable => {
      const description = variable.description 
        ? `.describe("${variable.description.replace(/"/g, '\\"')}");`
        : '';
      return `    ${variable.name}: z.string()${description}`;
    });
    
    return `z.object({\n${schemaFields.join(',\n')}\n  })`;
  }
}

export function generateCode(nodes: FlowNode[], edges: FlowEdge[]): GeneratedCode {
  const generator = new CodeGenerator(nodes, edges);
  return generator.generate();
}