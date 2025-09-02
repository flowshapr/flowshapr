import { 
  FlowNode, 
  FlowEdge, 
  NodeType, 
  GeneratedCode, 
  ValidationError,
  InputNodeConfig,
  AgentNodeConfig,
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

    // Prefer explicit start node if marked
    const explicitStart = this.nodes.find(n => (n.data as any)?.isStart === true);
    if (explicitStart) {
      this.traverseNode(explicitStart, visited, order);
      return order;
    }

    // Fallback to INPUT-based start as before
    const inputNodes = this.nodes.filter(n => n.type === NodeType.INPUT);
    if (inputNodes.length === 0) {
      // If no inputs, start from the first node to allow freeform flows
      if (this.nodes.length > 0) {
        this.traverseNode(this.nodes[0], visited, order);
        return order;
      }
      this.errors.push({
        message: 'Flow must contain at least one node',
        severity: 'error',
      });
      return [];
    }
    if (inputNodes.length > 1) {
      // With no explicit start, enforce a single input to avoid ambiguity
      this.errors.push({
        message: 'Flow can only have one input node (or set a Start node)',
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
  // Shared context: accessible to prompts and transforms
  const ctx: any = { input };
  const v = (p: string) => p.split('.').reduce((o: any, k: string) => (o == null ? undefined : o[k]), ctx);
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
      // expose step output to context for later nodes/templates
      statements.push(`ctx['${nextVar}'] = ${nextVar};`);
      // Also expose input variable names (if defined on Input node)
      if (node.data.type === NodeType.INPUT) {
        const cfg: any = node.data.config;
        if (cfg?.inputType === 'variable' && cfg?.variableName && cfg.variableName !== 'input') {
          statements.push(`ctx['${cfg.variableName}'] = ${nextVar};`);
        }
      }
      
      currentVar = nextVar;
    }
    
    statements.push('return result;');
    
    return statements.join('\n  ');
  }

  private generateNodeStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    switch (node.data.type) {
      case NodeType.INPUT:
        return this.generateInputStatement(node, inputVar, outputVar);
      case NodeType.AGENT:
        return this.generateAgentStatement(node, inputVar, outputVar);
      case NodeType.TRANSFORM:
        return this.generateTransformStatement(node, inputVar, outputVar);
      case NodeType.OUTPUT:
        return this.generateOutputStatement(node, inputVar, outputVar);
      case NodeType.CONDITION:
        return this.generateConditionStatement(node, inputVar, outputVar);
      // Legacy node type support by string value
      default:
        // Handle legacy saved nodes that may use raw string types
        const legacyType = (node as any)?.data?.type as string;
        if (legacyType === 'model') {
          return this.generateLegacyModelStatement(node, inputVar, outputVar);
        }
        if (legacyType === 'prompt') {
          return this.generateLegacyPromptStatement(node, inputVar, outputVar);
        }
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

  private generateAgentStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as AgentNodeConfig;
    
    // Build the prompt based on configuration
    let prompt = '';
    if (config.promptType === 'static') {
      const systemPrompt = config.systemPrompt || '';
      const userPrompt = config.userPrompt || '';
      
      if (systemPrompt && userPrompt) {
        prompt = `[\n    { role: 'system', content: ${this.processTemplate(systemPrompt)} },\n    { role: 'user', content: ${this.processTemplate(userPrompt)} }\n  ]`;
      } else if (systemPrompt) {
        prompt = `[\n    { role: 'system', content: ${this.processTemplate(systemPrompt)} },\n    { role: 'user', content: ${inputVar} }\n  ]`;
      } else if (userPrompt) {
        prompt = this.processTemplate(userPrompt);
      } else {
        prompt = inputVar;
      }
    } else {
      // Library prompts - TODO: implement when prompt library is ready
      prompt = inputVar;
    }
    
    // Build provider-specific configuration
    const modelConfig = this.buildModelConfig(config);
    
    const modelCall = `await ai.generate({\n    model: '${config.provider}/${config.model}',\n    prompt: ${prompt},\n    config: ${modelConfig}\n  })`;
    
    return `const ${outputVar}Response = ${modelCall};\n  const ${outputVar} = ${outputVar}Response.text();`;
  }
  
  private processTemplate(template: string): string {
    // Replace {{path}} with ${v("path")} using the shared context (ctx)
    const replaced = template.replace(/\{\{\s*([\w$.]+)\s*\}\}/g, (_m, p1) => `\${v("${p1}")}`);
    return '`' + replaced + '`';
  }
  
  private buildModelConfig(config: AgentNodeConfig): string {
    const configObj: any = {
      temperature: config.temperature || 0.7,
    };
    
    // Add provider-specific parameters
    if (config.maxTokens) {
      if (config.provider === 'googleai') {
        configObj.maxOutputTokens = config.maxTokens;
      } else {
        configObj.maxTokens = config.maxTokens;
      }
    }
    
    if (config.topP) configObj.topP = config.topP;
    if (config.topK) configObj.topK = config.topK;
    if (config.topKAnthropic) configObj.topK = config.topKAnthropic;
    if (config.frequencyPenalty) configObj.frequencyPenalty = config.frequencyPenalty;
    if (config.presencePenalty) configObj.presencePenalty = config.presencePenalty;
    if (config.candidateCount) configObj.candidateCount = config.candidateCount;
    if (config.stopSequences && config.stopSequences.length > 0) {
      configObj.stopSequences = config.stopSequences;
    }
    
    return JSON.stringify(configObj, null, 4).replace(/\n/g, '\n    ');
  }
  
  // Legacy support methods for migration
  private generateLegacyModelStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as any; // Legacy config
    
    const modelCall = `await ai.generate({\n    model: '${config.provider}/${config.model}',\n    prompt: ${inputVar},\n    config: {\n      temperature: ${config.temperature || 0.7},\n      maxOutputTokens: ${config.maxOutputTokens || 1000},\n    }\n  })`;
    
    return `const ${outputVar}Response = ${modelCall};\n  const ${outputVar} = ${outputVar}Response.text();`;
  }

  private generateLegacyPromptStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as PromptNodeConfig;
    
    // Simple template replacement for now
    const templateWithVars = config.template.replace(/\{\{(\w+)\}\}/g, '${$1}');
    
    return `const ${outputVar} = \`${templateWithVars}\`;`;
  }

  private generateTransformStatement(node: FlowNode, inputVar: string, outputVar: string): string {
    const config = node.data.config as TransformNodeConfig;
    
    // For safety, we'll wrap user code in a try-catch
    return `const ${outputVar} = ((data, __ctx) => {
    try {
      const ctx = __ctx; // access flow context
      ${config.code}
      return data;
    } catch (error) {
      console.error('Transform error:', error);
      return data;
    }
  })(${inputVar}, ctx);`;
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
